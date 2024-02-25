import { NodeInitializer, NodeDef } from "node-red";
import { DataType, SystemairSaveDevice, SystemairSaveDeviceOptions } from "./systemair_types";
import { client as modbus } from "jsmodbus";
import { Socket } from 'net';
import { Semaphore } from "await-semaphore";
import { isUserRequestError } from "jsmodbus/dist/user-request-error";


interface SystemairSaveDeviceProps extends NodeDef, SystemairSaveDeviceOptions { }

const init: NodeInitializer = (RED) => {
    const save_device = function(this: SystemairSaveDevice, props: SystemairSaveDeviceProps) {
        RED.nodes.createNode(this, props);

        const semaphore = new Semaphore(props.max_concurrency);
        let outstanding_requests = 0;

        const timeout_promise = (ms: number): [() => void, Promise<undefined>] => {
            let timeoutId: NodeJS.Timeout;
            let ok: (_: undefined) => void;
            const promise = new Promise<undefined>((_ok, err) => {
                ok = _ok;
                timeoutId = setTimeout(() => err(new Error('request timed out')), ms);
            });
            return [() => {
                clearTimeout(timeoutId);
                ok(undefined);
            }, promise];

        };

        const acquire_resources = async (): Promise<() => void> => {
            if (outstanding_requests > props.max_backlog) {
                throw new Error("too many outstanding requests, increase the limit or adjust your flows");
            }
            try {
                outstanding_requests += 1;
                return await semaphore.acquire();
            } finally {
                outstanding_requests -= 1;
            }
        };

        this.read = async (register_description) => {
            const data_type = register_description.data_type;
            const release = await acquire_resources();
            const socket = new Socket();
            const client = new modbus.TCP(socket, ~~props.device_id, props.timeout);
            const [timeout_cancel, timeout] = timeout_promise(props.timeout);
            const socket_ready = new Promise((ok, err) => {
                socket.on('connect', ok);
                socket.on('error', err);
            });
            socket.connect({ host: props.address, port: props.port });
            let result: any = undefined;
            try {
                await Promise.race([timeout, socket_ready]);
                while (true) {
                    try {
                        result = await Promise.race([timeout, client.readHoldingRegisters(
                            // all register descriptions use logical addresses to make it easy to
                            // refer back to the pdf tables. At the physical layer we gotta subtract
                            // 1 to make them actually refer to the right things.
                            register_description.modbus_address - 1,
                            DataType.num_registers(data_type)
                        )]);
                        break;
                    } catch (e) {
                        if (!isUserRequestError(e)) { throw e; }
                        // Ocassionally the device will respond with SLAVE_DEVICE_BUSY for a little
                        // while. These are always retryable, so just implement the logic here.
                        if (e.response?._body?._code !== 6) {
                            throw e;
                        }
                        this.trace("SLAVE_DEVICE_BUSY code, retrying");
                        continue;
                    }
                }
            } finally {
                timeout_cancel();
                socket.destroy();
                release(); // FIXME: the destroy is probably async? We should only release when the
                           // socket is fully cleaned up.
            }

            const buffer = result.response.body.valuesAsBuffer;
            return DataType.extract(register_description.data_type, buffer, 0);
        };
    };

    RED.nodes.registerType("systemair save device", save_device)
};

export = init;

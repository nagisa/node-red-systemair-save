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

        const timeout_promise = <T>(ms: number): [(v: T) => void, Promise<T>] => {
            let timeoutId: NodeJS.Timeout;
            let ok: (_: T) => void;
            const promise = new Promise<T>((_ok, err) => {
                ok = _ok;
                timeoutId = setTimeout(() => err(new Error('request timed out')), ms);
            });
            return [(v) => {
                clearTimeout(timeoutId);
                ok(v);
            }, promise];

        };

        const acquire_resources = async (): Promise<() => void> => {
            if (outstanding_requests > props.max_backlog) {
                throw new Error("too many outstanding requests, increase the limit or adjust your flows");
            }
            try {
                outstanding_requests += 1;
                return semaphore.acquire();
            } finally {
                outstanding_requests -= 1;
            }
        };

        this.read = async (register_description) => {
            const data_type = register_description.data_type;
            const release = await acquire_resources();
            const socket = new Socket();
            const client = new modbus.TCP(socket, ~~props.device_id, props.timeout);
            const [timeout_cancel, timeout] = timeout_promise<any>(props.timeout);
            const socket_ready = new Promise((ok, err) => {
                socket.on('connect', ok);
                socket.on('error', err);
            });
            // NB: we create a socket for each distinct modbus operation. I have seen that IAM tends
            // to forget open sockets sometimes which can lead to timeouts. Having each read an
            // individual connection is slower and higher latency, but it also helps isolating the
            // faults.
            socket.connect({ host: props.address, port: props.port });
            try {
                await Promise.race([timeout, socket_ready]);
                while (true) {
                    try {
                        const result = await Promise.race([timeout, client.readHoldingRegisters(
                            // all register descriptions use logical addresses to make it easy to
                            // refer back to the pdf tables. At the physical layer we gotta subtract
                            // 1 to make them actually refer to the right things.
                            register_description.modbus_address - 1,
                            DataType.num_registers(data_type)
                        )]);
                        const buffer = result.response.body.valuesAsBuffer;
                        return DataType.extract(register_description.data_type, buffer, 0);
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
                timeout_cancel(undefined);
                socket.destroy();
                release(); // FIXME: the destroy is probably async? We should only release when the
                           // socket is fully cleaned up.
            }

        };
    };

    RED.nodes.registerType("systemair save device", save_device)
};

export = init;

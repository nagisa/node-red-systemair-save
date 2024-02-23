import { NodeInitializer, NodeDef } from "node-red";
import { DataType, SystemairSaveDevice, SystemairSaveDeviceOptions } from "./systemair_types";
import { client as modbus } from "jsmodbus";
import { Socket } from 'net';
import { Semaphore } from "await-semaphore";
import { isUserRequestError } from "jsmodbus/dist/user-request-error";


interface SystemairSaveDeviceProps extends NodeDef, SystemairSaveDeviceOptions {}

const init: NodeInitializer = (RED) => {
    const save_device = function(this: SystemairSaveDevice, props: SystemairSaveDeviceProps) {
        RED.nodes.createNode(this, props);

        const semaphore = new Semaphore(props.max_concurrency);

        const timeout_promise = (ms: number): [() => void, Promise<undefined>] => {
            let timeoutId: NodeJS.Timeout;
            let ok: (_: undefined) => void;
            const promise = new Promise<undefined>((_ok, err) => {
                ok = _ok;
                timeoutId = setTimeout(() => err('request timed out'), ms);
            });

            return [() => {
                clearTimeout(timeoutId);
                ok(undefined);
            }, promise];

        };

        // TODO: limit number of pending operations as well.
        this.read = async (register_description) => {
            const release = await semaphore.acquire();
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
                while (result === undefined) {
                    try {
                        result = await Promise.race([timeout, client.readHoldingRegisters(
                            // all register descriptions use logical addresses to make it easy to refer back to
                            // the pdf tables. At the physical layer we gotta subtract 1 to make them actually
                            // refer to the right things.
                            register_description.modbus_address - 1, 1
                        )]);
                    } catch (e) {
                        if(!isUserRequestError(e)) { throw e; }
                        // Ocassionally the device will respond with SLAVE_DEVICE_BUSY for a little
                        // while. These are always retryable, so just implement the logic here.
                        if(e.response?._body?._code !== 6) {
                            throw e;
                        }
                        this.trace("SLAVE_DEVICE_BUSY code, retrying");
                    }
                }
            } finally {
                timeout_cancel();
                socket.destroy();
                release();
            }
            // FIXME: handle registers that are constructed from multiple parts transparently.
            let value = result.response.body.values[0];
            if (register_description.data_type == DataType.Temperature) {
                value /= 10; // TODO: make conversions like these a method of datatype...
            }
            return value;
        };
    };

    RED.nodes.registerType("systemair save device", save_device)
};

export = init;

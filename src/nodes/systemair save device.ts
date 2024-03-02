import { NodeInitializer, NodeDef } from "node-red";
import { DataType, SystemairSaveDevice, SystemairSaveDeviceOptions } from "./systemair_types";
import { ModbusClient, ModbusRTUClient, ModbusTCPClient, client as modbus } from "jsmodbus";
import { Socket } from 'net';
import { Semaphore } from "await-semaphore";
import { isUserRequestError } from "jsmodbus/dist/user-request-error";


interface SystemairSaveDeviceProps extends NodeDef, SystemairSaveDeviceOptions { }

const init: NodeInitializer = (RED) => {
    const save_device = function(this: SystemairSaveDevice, props: SystemairSaveDeviceProps) {
        RED.nodes.createNode(this, props);

        const semaphore = new Semaphore(props.max_concurrency);
        let cancel = (_: Error) => { };
        const cancellation: Promise<never> = new Promise((_, stop) => {
            cancel = stop;
        });
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
                return await Promise.race([cancellation, semaphore.acquire()]);
            } finally {
                outstanding_requests -= 1;
            }
        };

        const ready_client = async (timeout: Promise<any>): Promise<ModbusTCPClient> => {
            // NB: we create a socket for each distinct modbus operation. I have seen that IAM tends
            // to forget open sockets sometimes which can lead to timeouts. Having each read an
            // individual connection is slower and higher latency, but it also helps isolating the
            // faults.
            const socket = new Socket();
            try {
                const client = new modbus.TCP(socket, ~~props.device_id, props.op_timeout);
                const socket_ready = new Promise((ok, err) => {
                    socket.on('connect', ok);
                    socket.on('error', err);
                });
                socket.connect({ host: props.address, port: props.port });
                await Promise.race([cancellation, timeout, socket_ready]);
                return client;
            } catch (e) {
                socket.destroy();
                throw e;
            }
        };

        const operation = async <R>(op: (client: ModbusTCPClient) => Promise<R>): Promise<R> => {
            const release_resources = await acquire_resources();
            const [timeout_cancel, timeout] = timeout_promise<any>(props.timeout);
            let client;
            try {
                while (true) {
                    if (client) {
                        client?.socket.destroy();
                    }
                    client = await Promise.race([cancellation, ready_client(timeout)]);
                    try {
                        // If we're now running this request, might as well let it finish.
                        return await Promise.race([timeout, op(client)]);
                    } catch (e) {
                        if (!isUserRequestError(e)) { throw e; }
                        // Ocassionally the device will respond with SLAVE_DEVICE_BUSY for a little
                        // while. These are always retryable, so just implement the logic here.
                        if (e.response?._body?._code === 6) {
                            continue;
                        }
                        // We implement a two-tier timeout mechanism. One is the overall request
                        // timeout, which limits the maximum processing time of a message.
                        // The other is per-operation timeout, such as read or write. These handle
                        // the general flakyness of the IAM module. This condition is for the 2nd
                        // kind of timeout. If it occurs, we loop back to start and attempt this
                        // operation from scratch. Hopefully this time around IAM does not forget
                        // the connection!
                        if (e.err === 'Timeout') {
                            continue;
                        }
                        throw e;
                    }
                }
            } finally {
                timeout_cancel(undefined);
                client?.socket.destroy();
                release_resources(); // FIXME: the destroy is probably async? We should only release when the
                // socket is fully cleaned up.
            }
        }

        this.read = async (register_description) => {
            const data_type = register_description.data_type;
            let buffers = [];
            for (const command of data_type.read_commands(register_description)) {
                const result = await operation((client) => client.readHoldingRegisters(
                    command.address - 1,
                    command.count,
                ));
                buffers.push(result.response.body.valuesAsBuffer);
            }
            return data_type.extract(buffers);
        };

        this.write = async (register_description, value): Promise<void> => {
            const data_type = register_description.data_type;
            for (const command of data_type.encode_writes(register_description, value)) {
                await operation((client) => client.writeMultipleRegisters(
                    command.address - 1,
                    command.payload
                ));
            }

        };

        this.close = async (removed: boolean): Promise<void> => {
            cancel(new Error(`node has been ${removed ? "removed" : "stopped"}`));
            // Grab all of the semaphores here. This will ensure that all operations have completed
            // and no new ones can start. In order to ensure that this is not soo slow the
            // `cancel` here will pop a cancellation fuse that's used in strategic locations
            // thoughout the code to hasten a release of any semaphores already acquired.
            let semas = Array.from({ length: props.max_concurrency }, () => semaphore.acquire());
            await Promise.allSettled(semas);
            return;
        };
    };

    RED.nodes.registerType("systemair save device", save_device)
};

export = init;

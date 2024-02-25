import { NodeInitializer, NodeConstructor, Node, NodeDef, NodeStatusShape } from "node-red";
import { SystemairSaveDevice, SystemairRegisterNodeOptions, SystemairSaveDeviceOptions, RegisterDescription, RegisterType } from "./systemair_types";
import { registers } from "./systemair_registers";

interface SystemairRegisterNode extends Node<{}> { }
interface SystemairRegisterNodeProps extends NodeDef, SystemairRegisterNodeOptions { }

const init: NodeInitializer = (RED) => {
    const register = function(this: SystemairRegisterNode, props: SystemairRegisterNodeProps) {
        RED.nodes.createNode(this, props);
        const show_error = (text: string, shape?: NodeStatusShape) => {
            this.status({ fill: "red", shape: shape ?? "dot", text: text });
        };
        const broker = RED.nodes.getNode(props.device) as SystemairSaveDevice | undefined;
        if (broker === undefined) {
            return show_error("node-red:common.status.error", "ring");
        }
        const description = registers.get(~~props.register_id);
        if (description === undefined) {
            return show_error("node-red:common.status.error", "ring");
        }

        let pending_writes = 0;
        let pending_reads = 0;
        const set_status = () => {
            const pending_actions = pending_writes + pending_reads;
            if (pending_actions == 0) {
                this.status({ fill: "green", shape: "dot", text: `Idle @ ${new Date().toISOString()}` });
            } else if (pending_writes == 0) {
                this.status({ fill: "blue", shape: "dot", text: `${pending_reads} reads…` });
            } else if (pending_reads == 0) {
                this.status({ fill: "blue", shape: "dot", text: `${pending_writes} writes…` });
            } else {
                this.status({ fill: "blue", shape: "dot", text: `${pending_actions} actions…` });
            }
        };
        set_status();

        this.on("input", (msg, send, done) => {
            const sendResponse = (response: number) => {
                switch (props.output_style) {
                    case "payload":
                        RED.util.setMessageProperty(msg, 'topic', description.name, true);
                        RED.util.setMessageProperty(msg, 'payload', response, true);
                        break;
                    case "payload.regname":
                        RED.util.setMessageProperty(msg, `payload`, {}, true);
                        RED.util.setMessageProperty(msg, `payload.${description.name}`, response, true);
                        break;
                }
                send(msg);
            }

            const payload = msg.payload as { operation: string, value: any };
            switch (payload.operation) {
                case "READ":
                    pending_reads += 1;
                    set_status();
                    broker.read(description).then((...args) => {
                        sendResponse(...args);
                        pending_reads -= 1;
                        set_status();
                        done();
                    }).catch((e: Error) => {
                        pending_reads -= 1;
                        show_error(e.message);
                        done(e);
                    });
                    break;
                case "WRITE":
                    if (description.register_type != RegisterType.RW) {
                        const e = new Error("writing a read-only register");
                        show_error(e.message);
                        return done(e);
                    }
                    pending_writes += 1;
                    set_status();
                    broker.write(description, payload.value).then(() => {
                        pending_writes -= 1;
                        set_status();
                        done();
                    }).catch((e: Error) => {
                        pending_writes -= 1;
                        show_error(e.message);
                        done(e);
                    });
                    break;
                default:
                    return done();
            }
        });
    };

    RED.nodes.registerType("systemair register", register)
};

export = init;

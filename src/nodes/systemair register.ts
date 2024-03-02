import { NodeInitializer, Node, NodeDef } from "node-red";
import { SystemairSaveDevice, SystemairRegisterNodeOptions, RegisterType } from "./systemair_types";
import { registers } from "./systemair_registers";

interface SystemairRegisterNode extends Node<{}> { }
interface SystemairRegisterNodeProps extends NodeDef, SystemairRegisterNodeOptions { }

const init: NodeInitializer = (RED) => {
    const register = function(this: SystemairRegisterNode, props: SystemairRegisterNodeProps) {
        RED.nodes.createNode(this, props);
        const broker = RED.nodes.getNode(props.device) as SystemairSaveDevice | undefined;
        const set_status = (error?: Error) => {
            if (error) return this.status({ fill: "red", shape: "ring", text: error.message });
            const pending_actions = pending_writes + pending_reads;
            if (pending_actions == 0) {
                this.status({ fill: "green", shape: "ring", text: `Idle @ ${new Date().toISOString()}` });
            } else if (pending_writes == 0) {
                this.status({ fill: "blue", shape: "dot", text: `${pending_reads} reads…` });
            } else if (pending_reads == 0) {
                this.status({ fill: "blue", shape: "dot", text: `${pending_writes} writes…` });
            } else {
                this.status({ fill: "blue", shape: "dot", text: `${pending_actions} actions…` });
            }
        };
        if (broker === undefined) {
            return set_status(new Error("node-red:common.status.error"));
        }
        const description = registers.get(~~props.register_id);
        if (description === undefined) {
            return set_status(new Error("node-red:common.status.error"));
        }
        let pending_writes = 0;
        let pending_reads = 0;
        set_status();

        this.on("input", (msg, send, done) => {
            msg = RED.util.cloneMessage(msg);
            const payload = msg.payload;
            let error: Error | undefined = undefined;
            if (payload !== undefined) {
                // This is a write operation:
                if (description.register_type != RegisterType.RW) {
                    const e = new Error("writing a read-only register");
                    set_status(e);
                    return done(e);
                }
                pending_writes += 1;
                set_status();
                broker.write(description, payload).catch((e: Error) => {
                    error = e;
                }).finally(() => {
                    RED.util.setMessageProperty(msg, 'error', error);
                    send([ null, msg ]);
                    pending_writes -= 1;
                    set_status(error);
                    return done(error);
                });
            } else {
                pending_reads += 1;
                set_status();
                broker.read(description).then((response) => {
                    let responseMsg;
                    switch (props.output_style) {
                        case "payload":
                            responseMsg = { topic: description.name, payload: response };
                            break;
                        case "payload.regname":
                            responseMsg = { topic: msg.topic, payload: ({} as any) };
                            responseMsg['payload'][description.name] = response;
                            break;
                    }
                    send([ responseMsg, msg ]);
                }).catch((e: Error) => {
                    error = e;
                    send([ null, msg ]);
                }).finally(() => {
                    RED.util.setMessageProperty(msg, 'error', error);
                    pending_reads -= 1;
                    set_status(error)
                    return done(error);
                });
            }
        });
    };

    RED.nodes.registerType("systemair register", register)
};

export = init;

import { NodeInitializer, NodeConstructor, Node, NodeDef, NodeStatusShape } from "node-red";
import { SystemairSaveDevice, SystemairRegisterNodeOptions, SystemairSaveDeviceOptions, RegisterDescription } from "./systemair_types";
import { registers } from "./systemair_registers";

interface SystemairRegisterNode extends Node<{}> {}
interface SystemairRegisterNodeProps extends NodeDef, SystemairRegisterNodeOptions { }

const init: NodeInitializer = (RED) => {
    const register = function(this: SystemairRegisterNode, props: SystemairRegisterNodeProps) {
        RED.nodes.createNode(this, props);
        const showError = (text: string, shape?: NodeStatusShape) => {
            this.status({ fill: "red", shape: shape ?? "dot", text: text });
        };

        const broker = RED.nodes.getNode(props.device) as SystemairSaveDevice | undefined;
        if (broker === undefined) {
            return showError("node-red:common.status.error", "ring");
        }
        const description = registers.get(~~props.register_id);
        if (description === undefined) {
            return showError("node-red:common.status.error", "ring");
        }



        this.on("input", (msg, send, done) => {
            const sendResponse = (response: any) => {
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
                this.status({ fill: "green", shape: "dot", text: `Success @ ${new Date().toISOString()}` });
                send(msg);
                return done();
            }
            switch (msg.payload) {
                case "READ":
                    this.status({ fill: "blue", shape: "dot", text: `Working…` });
                    broker.read(description).then(sendResponse).catch((e) => {
                        showError(e.message ?? e);
                        this.error(e.message ?? e);
                        return done();
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

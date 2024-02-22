import { NodeInitializer, NodeConstructor, Node, NodeDef } from "node-red";
import { SystemairSaveDevice, SystemairRegisterNodeOptions, SystemairSaveDeviceOptions, RegisterDescription } from "./systemair_types";
import { registers } from "./systemair_registers";

interface SystemairRegisterNode extends Node<{}> {
    broker: SystemairSaveDevice;
    description: RegisterDescription;
    buffer: string;
}
interface SystemairRegisterNodeProps extends NodeDef, SystemairRegisterNodeOptions { }

const init: NodeInitializer = (RED) => {
    const register = function(this: SystemairRegisterNode, props: SystemairRegisterNodeProps) {
        RED.nodes.createNode(this, props);
        this.broker = RED.nodes.getNode(props.device) as SystemairSaveDevice;
        this.description = registers.get(~~props.register_id);
        if (this.broker === undefined || this.description === undefined) {
            return this.status({ fill: "red", shape: "ring", text: "node-red:common.status.disconnected" });
        }

        this.on("input", (msg, send, done) => {
            switch (msg.payload) {
                case "READ":
                    this.broker.read(this.description);
                    break;
                default:
                    return done();
            }
        });
    };

    RED.nodes.registerType("systemair register", register)
};

export = init;

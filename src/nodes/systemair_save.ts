import { NodeInitializer, NodeConstructor, Node, NodeDef } from "node-red";
import { SystemairSaveOptions } from "./systemair_save_types";

interface SystemairSaveNode extends Node<{}> {
    buffer: string,
}
interface SystemairSaveProps extends NodeDef, SystemairSaveOptions { }

const init: NodeInitializer = (RED) => {
    const register = function(this: SystemairSaveNode, props: SystemairSaveProps) {
        RED.nodes.createNode(this, props);
        this.on("input", (msg, send, done) => {
            switch (msg.payload) {
                case "READ":

                    break;
                default:
                    return done();
            }
        });
    };

    RED.nodes.registerType("systemair register", register)
};

export = init;

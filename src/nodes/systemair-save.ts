import { NodeInitializer, NodeConstructor, Node, NodeDef } from "node-red";
import { SystemairSaveOptions } from "./systemair-save-types";

interface SystemairSaveNode extends Node<{}> {
    buffer: string,
}
interface SystemairSaveProps extends NodeDef, SystemairSaveOptions { }

const init: NodeInitializer = (RED) => {
    const constructor = function(this: SystemairSaveNode, props: SystemairSaveProps) {
        RED.nodes.createNode(this, props);
    };

    RED.nodes.registerType("systemair-save", constructor)
};

export = init;

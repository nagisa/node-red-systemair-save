import { NodeInitializer, NodeConstructor, Node, NodeDef } from "node-red";
import { SystemairSaveDevice, SystemairRegisterNodeOptions, SystemairSaveDeviceOptions } from "./systemair_types";

interface SystemairSaveDeviceProps extends NodeDef, SystemairSaveDeviceOptions { }

const init: NodeInitializer = (RED) => {
    const save_device = function(this: SystemairSaveDevice, props: SystemairSaveDeviceProps) {
        RED.nodes.createNode(this, props);
        this.read = (register_description) => {
            throw new Error('TODO')
        };
    };

    RED.nodes.registerType("systemair save device", save_device)
};

export = init;

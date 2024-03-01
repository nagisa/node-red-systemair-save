import { EditorRED, EditorNodeProperties } from "node-red";
import { SystemairSaveDeviceOptions } from "../systemair_types";

declare const RED: EditorRED;
interface SystemairSaveDeviceEditorProperties extends EditorNodeProperties, SystemairSaveDeviceOptions {}

RED.nodes.registerType<SystemairSaveDeviceEditorProperties>("systemair save device", {
    category: 'config',
    defaults: {
        name: { value: "" },
        proto: { value: "Modbus TCP" },
        address: { value: "" },
        port: { value: 502, validate: RED.validators.number(true), required: false },
        max_concurrency: { value: 3, validate: RED.validators.number(true) },
        max_backlog: { value: 1000, validate: RED.validators.number(true) },
        device_id: { value: 1, validate: RED.validators.number(true) },
        timeout: { value: 5000, validate: RED.validators.number(true) },
        op_timeout: { value: 1750, validate: RED.validators.number(true) },
    },
    icon: "systemair.svg",
    label: function() {
        return this.name || "save device";
    },
});

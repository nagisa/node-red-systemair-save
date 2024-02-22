import { EditorRED, EditorNodeProperties } from "node-red";
import { SystemairSaveDeviceOptions } from "../systemair_types";
import { registers } from "../systemair_registers";

declare const RED: EditorRED;
interface SystemairSaveDeviceEditorProperties extends EditorNodeProperties, SystemairSaveDeviceOptions {}

RED.nodes.registerType<SystemairSaveDeviceEditorProperties>("systemair save device", {
    category: 'config',
    defaults: {
        name: { value: "" },
        proto: { value: "Modbus TCP" },
        address: { value: "" },
        port: { value: 502, validate: RED.validators.number(true), required: false },
    },
    icon: "systemair.svg",
    label: function() {
        return this.name || "save device";
    },
});
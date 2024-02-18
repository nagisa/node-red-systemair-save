import { EditorRED, EditorNodeProperties } from "node-red";
import { SystemairSaveOptions } from "../dsmr_types";

declare const RED: EditorRED;

interface SystemairSaveEditorNodeProperties extends EditorNodeProperties, SystemairSaveOptions {}

RED.nodes.registerType<SystemairSaveEditorNodeProperties>("dsmr", {
    category: 'network',
    color: '#004985',
    defaults: {
        name: { value: "" },
    },
    inputs: 1,
    outputs: 1,
    icon: "font-awesome/fa-bolt",
    label: function() {
        return this.name||"systemair";
    },
});

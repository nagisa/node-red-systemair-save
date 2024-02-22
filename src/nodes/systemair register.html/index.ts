import { EditorRED, EditorNodeProperties } from "node-red";
import { SystemairRegisterNodeOptions } from "../systemair_types";
import { registers } from "../systemair_registers";

declare const RED: EditorRED;
interface SystemairRegisterNodeEditorProperties extends EditorNodeProperties, SystemairRegisterNodeOptions {}

RED.nodes.registerType<SystemairRegisterNodeEditorProperties>("systemair register", {
    category: 'network',
    color: '#ffffff',
    defaults: {
        name: { value: "" },
        register_id: {
            value: "",
            // TODO: two argument version produces the red triangle, but relevant types are
            // missing.
            // @ts-ignore
            validate: (v, n) => registers.has(~~v) ? true : "unknown register"
        },
        // @ts-ignore
        device: {
            type:"systemair save device",
            required:true,
        },
        readback: { value: false },
        output_style: { value: "payload" },
    },
    inputs: 1,
    outputs: 1,
    icon: "systemair.svg",
    label: function() {
        const regname = !this.register_id
                      ? undefined
                      : registers.get(~~this.register_id)?.name
                                 .split("_").join(" ");
        return this.name || regname || "register";
    },
    oneditprepare: function() {
        let register_id = ~~this.register_id;
        let search_field = $("#node-input-register-filter");
        let register_list;
        let search = search_field.searchBox({
            style: "compact",
            delay: 300,
            change: function() {
                var val = $(this).val().trim().toLowerCase();
                if (val === "") {
                    register_list?.treeList("filter", null);
                    search.searchBox("count","");
                } else {
                    var count = register_list?.treeList("filter", function(item) {
                        const def = item.definition;
                        // I so wish there was a proper fuzzy library...
                        return def.modbus_address.toString().startsWith(val) ||
                            def.name.toString().toLowerCase().indexOf(val) >= 0 ||
                            def.description.toString().toLowerCase().indexOf(val) >= 0;
                    });
                    search.searchBox("count", `${count} / ${registers.size}`);
                }
            }
        });
        let register_data = [];
        for (const value of registers.values()) {
            register_data.push({
                element: $(`<div class="systemair-save-list-container">
                    <span class="systemair-save-list-title" title="${value.name}"><b>${value.modbus_address}</b> ${value.name}</span>
                    <span class="systemair-save-list-subtitle">${value.description.replace("\n", "<br/>")}</span>
                </div>`),
                definition: value,
                selected: register_id == value.modbus_address,
                radio: 'r',
            });
        }
        register_list = $("#node-input-register-container-div").treeList({
            multi: false,
            data: register_data,
        });
    },
    oneditsave: function() {
        const def = $("#node-input-register-container-div").treeList('selected').definition;
        this.register_id = def.modbus_address.toString();
    },
    oneditresize: function(size) {
        let rows = $("#dialog-form>div:not(.node-input-target-list-row)");
        let height = $("#dialog-form").height();
        for (let row of rows) {
            height -= $(row).outerHeight(true);
        }
        var editorRow = $("#dialog-form>div.node-input-target-list-row");
        editorRow.css("height",height+"px");
    }
});
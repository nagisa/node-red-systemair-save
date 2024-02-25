import { EditorRED, EditorNodeProperties } from "node-red";
import { RegisterDescription, SystemairRegisterNodeOptions } from "../systemair_types";
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
            validate: (v: string, _: any) => registers.has(~~v) ? true : "unknown register"
        },
        // @ts-ignore
        device: {
            type:"systemair save device",
            required:true,
        },
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
        let register_list: JQuery<HTMLElement>;
        let search = search_field.searchBox({
            style: "compact",
            delay: 300,
            change: function() {
                var val = $(this).val().trim().toLowerCase();
                if (val === "") {
                    register_list?.treeList("filter", null);
                    search.searchBox("count","");
                } else {
                    var count = register_list?.treeList("filter", function(item: { definition: RegisterDescription }) {
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
        let register_data: any[] = [];
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
        register_list.parent().parent().addClass('systemair-dialog-form');
    },
    oneditsave: function() {
        const def = $("#node-input-register-container-div").treeList('selected').definition;
        this.register_id = def.modbus_address.toString();
    },
});

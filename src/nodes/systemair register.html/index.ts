import { EditorRED, EditorNodeProperties } from "node-red";
import { RegisterDescription, SystemairRegisterNodeOptions } from "../systemair_types";
import { registers, virtual_registers } from "../systemair_registers";

declare const RED: EditorRED;
interface SystemairRegisterNodeEditorProperties extends EditorNodeProperties, SystemairRegisterNodeOptions { }

const get_register = (type: "virtual" | "real", address: number): RegisterDescription<any> | undefined => {
    const map = type === "virtual" ? virtual_registers : registers;
    return map.get(address);
};


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
            validate: function(v: string, _: any) {
                return (get_register(this.register_type, ~~v) ?? "unknown register") || true;
            }
        },
        // @ts-ignore
        device: {
            type: "systemair save device",
            required: true,
        },
        register_type: {
            value: "real",
            required: true,
            validate: (v: string) => v == "real" || v == "virtual",
        }
    },
    inputs: 1,
    outputs: 2,
    outputLabels: ["responses", "input passthrough"],
    icon: "systemair.svg",
    label: function() {
        const regname = !this.register_id
            ? undefined
            : get_register(this.register_type, ~~this.register_id)?.name.split("_").join(" ");
        return this.name || regname || "register";
    },
    oneditprepare: function() {
        let register_id = ~~this.register_id;
        const register_list = $("#node-input-register-container-div");
        const register_type = $('#node-input-register_type').on("change", () => {
            let regs = register_type.val() == "virtual" ? virtual_registers : registers;
            let register_data: any[] = [];
            for (const value of regs.values()) {
                register_data.push({
                    element: $(`
                        <div class="systemair-save-list-container">
                            <span class="systemair-save-list-title" title="${value.name}"><b>${value.modbus_address}</b> ${value.name}</span>
                            <span class="systemair-save-list-subtitle">${value.description.replace("\n", "<br/>")}</span>
                        </div>
                    `),
                    definition: value,
                    selected: register_id == value.modbus_address,
                    radio: 'r',
                });
            }
            register_list.treeList({
                multi: false,
            }).treeList('data', register_data);
        });
        register_type.parent().parent().addClass('systemair-dialog-form');

        const search = $("#node-input-register-filter").searchBox({
            style: "compact",
            delay: 300,
            change: () => {
                var val = search.val()?.toString().trim().toLowerCase() ?? "";
                if (val === "") {
                    register_list?.treeList("filter", null);
                    search.searchBox("count", "");
                } else {
                    var count = register_list?.treeList("filter", function(item: { definition: RegisterDescription<any> }) {
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
    },
    oneditsave: function() {
        const def = $("#node-input-register-container-div").treeList('selected').definition;
        this.register_id = def.modbus_address.toString();
    },
});

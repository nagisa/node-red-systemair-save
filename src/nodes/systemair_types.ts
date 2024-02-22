import { Node } from "node-red";

export enum DataType {
    I16,
    U16,
}

export enum RegisterType {
    ReadOnly,
    ReadWrite,
}

export type RegisterDescription = {
    name: string;
    data_type: DataType;
    register_type: RegisterType;
    // Logical address (i.e. value sent on the wire is -1)
    modbus_address: number;
    description: string;
}

export interface SystemairRegisterNodeOptions {
    register_id: string;
    device: string;
    readback: boolean;
    output_style: "payload" | "payload.regname";
}

export interface SystemairSaveDeviceOptions {
    proto: "Modbus TCP" | "Modbus RTU";
    address: string,
    port: number,
}

export interface SystemairSaveDevice extends Node<{}> {
    read(register_description: RegisterDescription): Promise<number>;
}

declare global {
    // TODO: relevant types are missing.
    interface JQuery<TElement = HTMLElement> {
        searchBox(options:any);
        treeList(options:any);
    }
}

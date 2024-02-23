import { Node } from "node-red";

export enum DataType {
    I16,
    U16,
    Temperature, // U16 scaled by 10
}

export enum RegisterType {
    RO,
    RW,
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
    timeout: number,
    max_concurrency: number,
    device_id: number,
}

export interface SystemairSaveDevice extends Node<{}> {
    read(register_description: RegisterDescription): Promise<number>;
}

declare global {
    // TODO: relevant types are missing.
    interface JQuery<TElement = HTMLElement> {
        searchBox(options:any): JQuery<TElement>;
        searchBox(whatever: "count", idk:any): JQuery<TElement>;
        treeList(options:any): JQuery<TElement>;
        treeList(whatever: 'selected'): any;
    }
}

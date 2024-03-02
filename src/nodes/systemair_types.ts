import { Node } from "node-red";

export interface DataType<PayloadT> {
    // TODO: consider making RegisterDescription a class and moving this over to there...?
    read_commands(description: RegisterDescription<PayloadT>): { address: number, count: number }[];
    extract(buffers: Buffer[]): PayloadT;
    encode_writes(description: RegisterDescription<PayloadT>, payload: PayloadT): { address: number, payload: Buffer }[];
}

export enum RegisterType {
    RO,
    RW,
}

export type RegisterDescription<P> = {
    name: string;
    data_type: DataType<P>;
    register_type: RegisterType;
    // Logical address (i.e. value sent on the wire is -1)
    modbus_address: number;
    description: string;
}

export interface SystemairRegisterNodeOptions {
    register_type: "real" | "virtual";
    register_id: string;
    device: string;
}

export interface SystemairSaveDeviceOptions {
    proto: "Modbus TCP" | "Modbus RTU";
    address: string,
    port: number,
    timeout: number,
    op_timeout: number,
    max_concurrency: number,
    max_backlog: number,
    device_id: number,
}

export interface SystemairSaveDevice extends Node<{}> {
    read<P>(register_description: RegisterDescription<P>): Promise<P>;
    write<P>(register_description: RegisterDescription<P>, value: P): Promise<void>;
}

declare global {
    // TODO: relevant types are missing in upstream type-definitions.
    interface JQuery<TElement = HTMLElement> {
        searchBox(options: any): this;
        searchBox(option: "count", idk: any): this;
        treeList(option: 'filter', callback: null | ((item: any) => boolean)): this;
        treeList(option: 'selected'): any;
        treeList(option: 'data', data: any[]): this;
        treeList(options: { multi: boolean, data?: any }): this;
    }
}

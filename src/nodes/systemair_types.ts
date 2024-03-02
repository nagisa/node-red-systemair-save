import { Node } from "node-red";

// TODO: make these all individual classes. That way I can avoid all the switches below, which are
// nasty...
export enum DataType {
    I16,
    U16,
    I16_E1, // I16 scaled by 10
    ALARMS15000, // Virtual Register: All alarm statuses at addresses 150??
    ALARMS15100, // Virtual Register: All alarm statuses at addresses 151??
    ALARMS15500, // Virtual Register: All alarm statuses at addresses 155??
}

export namespace DataType {
    export function num_registers(ty: DataType): number {
        switch (ty) {
            case DataType.I16:
            case DataType.U16:
            case DataType.I16_E1:
                return 1;
            case DataType.ALARMS15000:
                return 94;
            case DataType.ALARMS15100:
                return 85;
            case DataType.ALARMS15500:
                return 55;
        }
    }

    export function extract(ty: DataType, buffer: Buffer, byte_offset: number): any {
        switch (ty) {
            case DataType.I16:
                return buffer.readInt16BE(byte_offset);
            case DataType.U16:
                return buffer.readUInt16BE(byte_offset);
            case DataType.I16_E1:
                // Some types are marked as I* (signed) others as unsigned in the documentation but
                // the temperature reading can never really get high enough for the sign bit to
                // matter (so, if it is set, we're talking negative temperatures anyway.) Thus just
                // always read a signed integer here.
                return buffer.readInt16BE(byte_offset) / 10;
            case DataType.ALARMS15000:
                return buffer;
            case DataType.ALARMS15100:
                return buffer;
            case DataType.ALARMS15500:
                return buffer;
        }
    }

    export function encode(ty: DataType, value: any): Buffer {
        let buffer = Buffer.alloc(2); // FIXME: for multiple-register definitions
        switch (ty) {
            case DataType.I16_E1:
                value = ~~((value as number) * 10);
                buffer.writeUint16BE(value);
                break;
            case DataType.U16:
                buffer.writeUint16BE(value);
                break;
            case DataType.I16:
                buffer.writeInt16BE(value);
                break;
            case DataType.ALARMS15000:
            case DataType.ALARMS15100:
            case DataType.ALARMS15500:
                throw Error("unreachable code reached: encoding read-only ALARM15***");
        }
        return buffer.subarray(0, 2); // FIXME: for multiple-register definitions
    }
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
    read(register_description: RegisterDescription): Promise<number>;
    write(register_description: RegisterDescription, value: any): Promise<void>;
}

declare global {
    // TODO: relevant types are missing in upstream type-definitions.
    interface JQuery<TElement = HTMLElement> {
        searchBox(options:any): this;
        searchBox(option: "count", idk:any): this;
        treeList(option: 'filter', callback: null | ((item: any) => boolean)): this;
        treeList(option: 'selected'): any;
        treeList(option: 'data', data: any[]): this;
        treeList(options: { multi: boolean, data?: any }): this;
    }
}

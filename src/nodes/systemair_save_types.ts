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

export interface SystemairSaveOptions {
    register_id: string;
    device: string;
}

"use strict";


/**
 * Describes a Column in BookshelfMapping
 * @property {string} name - name of the column
 * @property {string} type - type of the column: "sql" or "json"
 */
export type IColumnDescriptor = IJsonColumnDescriptor | ISqlColumnDescriptor | IRegularColumnDescriptor;


export interface  IRegularColumnDescriptor {
    name: string;
    type: undefined;
}

export interface  IJsonColumnDescriptor {
    name: string;
    type: "json";
}


export interface  IBaseSqlColumnDescriptor {
    name: string;
    type: "sql";
}

export interface  IWritableSqlColumnDescriptor extends IBaseSqlColumnDescriptor {
    /**
     * this setter creates an sql snipped to set the value
     */
    set(value): string;
}

export interface  IReadableSqlColumnDescriptor extends IBaseSqlColumnDescriptor {
    /**
     * this getter creates an sql snipped to get the value
     */
    get(): string;
}

export type ISqlColumnDescriptor = IBaseSqlColumnDescriptor & Partial<IWritableSqlColumnDescriptor> & Partial<IReadableSqlColumnDescriptor>;

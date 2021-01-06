"use strict";

import { IColumnDescriptor } from "./typedef/IColumnDescriptor";


export default interface IReadableColumnNamesAppearConditions {
    condition(): boolean;

    execute(): IColumnDescriptor["name"][];
}

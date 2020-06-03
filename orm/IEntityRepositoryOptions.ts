"use strict";

import knex from "knex";


interface IEntityRepositoryOptions {
    exclude?: string[];
    columns?: string[];
    withRelated?: Array<{ [prop: string]: () => void }>;
    transactional?: boolean;
    transacting?: knex.Transaction;
    debug?: boolean;
}

type IOptionalEntityRepositoryOptions = IEntityRepositoryOptions | null;

export default IOptionalEntityRepositoryOptions;

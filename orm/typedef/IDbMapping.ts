"use strict";

import Knex from "knex";
import { IColumnDescriptor } from "./IColumnDescriptor";
import { IRelationDescriptor } from "./IRelationDescriptor";


/**
 * Describes a DB Mapping
 */
export interface IDbMapping {

    /**
     * Fully qualified name of DB Table
     */
    tableName: string;

    /**
     * Primary key column
     */
    identifiedBy: string;

    /**
     * columns to fetch. 'underscore_space' will be converted to 'lowerCamelCase' in Entity
     */
    columns: Array<string | IColumnDescriptor>;

    /**
     * Fetch only Entities which match a given query, Knex where condition
     */
    discriminator: object | ((q: Knex.QueryBuilder) => void);

    /**
     * Execute instead of regular delete statement, Knex update statement
     */
    onDelete: object;

    /**
     * Keep a History in this table. New states are appended instead of updated.
     * Columns 'revision_id' and 'parent_id' will be added to mapping, thus requires these columns in DB.
     * 'revision_id' must have a unique default value, is the Primary Key at best.
     * 'identifiedBy' must not be the Primary Key, since many revisions with the same ID can exist.
     * History columns names may be overridden in {@see IDbMapping.historyColumns}
     */
    keepHistory: boolean;

    /**
     *  Configure alias for history columns
     */
    historyColumns: { revisionId: string; parentId: string };

    /**
     *  Instead of creating new states it will update the entity when IDbMapping.historyChangeCheck is true
     *  and no column has changed. Even when {@see IDbMapping.keepHistory} is activated.
     *  This is to prevent creating new states when there are no changes,
     *  but the entity got saved in relation to an other entity which has no history itself.
     *  "json" columns are not supported - use "jsonb" instead.
     */
    historyChangeCheck?: boolean;

    /**
     * Managed relations of this Entity.
     * There will be a getter and setter for n:1 relations
     * There will be a getter and modifiers ("add"/"remove" + relation.name) for m:n relations
     */
    relations: Array<IRelationDescriptor<unknown>>;

    /**
     * When using custom ID, this method will check if the Entity is new.
     */
    isNew?: () => boolean;
}

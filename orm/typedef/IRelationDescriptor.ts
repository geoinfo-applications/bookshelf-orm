"use strict";

import { IReferenceDescriptor } from "./IReferenceDescriptor";

/**
 * Describes a relation in BookshelfMapping
 */
export interface IRelationDescriptor<T> {

    /**
     * Name of the Relation.
     */
    name: string;

    /**
     * Describes Referenced Entity or ValueObject
     */
    references: IReferenceDescriptor<T>;

    /**
     * Multiplicity. Getters and Setters area created in Entity. Values are:
     * - "hasOne" (FK is in this entity)
     * - "belongsTo" (FK is in referenced entity)
     * - "hasMany" (1:n or m:n relation). No setter, but modifier methods in Entity ("add" / "remove" + relation.name)
     */
    type: string;
}

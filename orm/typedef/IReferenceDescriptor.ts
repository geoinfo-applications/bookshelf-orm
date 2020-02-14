"use strict";

import { IDbMapping } from "./IDbMapping";
import BookshelfMapping from "../BookshelfMapping";

/**
 * Describes a reference in BookshelfMapping
 */
export interface IReferenceDescriptor<T = object> {

    /**
     * Describes Referenced Entity or ValueObject
     */
    mapping: IDbMapping | BookshelfMapping;

    /**
     * Referenced Entities or ValueObjects are instances of this type
     */
    type: T;

    /**
     * FK name
     */
    mappedBy: string;

    /**
     * By default takes the identifiedBy column of referenced entity and applies discriminators
     * together with harmonisation condition. If set to some column name then discriminators are omitted what may be used to create relation to
     * a unique revision of referenced entity
     */
    identifies: string;

    /**
     * Remove all orphans upon save/remove
     */
    orphanRemoval: boolean;

    /**
     * Save/remove objects of this relation
     */
    cascade: boolean;

    /**
     * Force sequential saving of this relation objects.
     * Useful e.g. when dealing with foreign table wrapper tables to avoid transaction errors.
     */
    saveSequential: boolean;
}

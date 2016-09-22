"use strict";

/**
 * Describes a reference in BookshelfMapping
 * @property {string} mapping - Describes Referenced Entity or ValueObject
 * @property {Class} [type = Object] - Referenced Entities or ValueObjects are instances of this type
 * @property {string} [mappedBy = relation.name + _id] - FK name
 * @property {boolean} [orphanRemoval = false] - Remove all orphans upon save/remove
 * @property {boolean} [cascade = false] - Save/remove objects of this relation
 * @property {boolean} [saveSequential = false] - Force sequential saving of this relation objects. Useful e.g. when dealing with foreign table wrapper tables to avoid transaction errors.
 */
class ReferenceDescriptor {

}

module.exports = ReferenceDescriptor;

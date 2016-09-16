"use strict";

/**
 * Describes a reference in BookshelfMapping
 * @property {string} mapping - Describes Referenced Entity or ValueObject
 * @property {Class} [type = Object] - Referenced Entities or ValueObjects are instances of this type
 * @property {string} [mappedBy = relation.name + _id] - FK name
 * @property {boolean} [orphanRemoval = false] - Remove all orphans upon save/remove
 * @property {boolean} [cascade = false] - Save/remove objects of this relation
 */
class ReferenceDescriptor {

}

module.exports = ReferenceDescriptor;

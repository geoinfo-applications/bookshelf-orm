"use strict";

/**
 * Describes a relation in BookshelfMapping
 * @property {string} name - Name of the Relation.
 * @property {ReferenceDescriptor} references - Describes Referenced Entity or ValueObject
 * @property {string} type - Multiplicity. Getters and Setters area created in Entity. Values are:
 *                           "hasOne" (FK is in this entity)
 *                           "belongsTo" (FK is in referenced entity)
 *                           "hasMany" (1:n or m:n relation). No setter, but modifier methods in Entity ("add" / "remove" + relation.name)
 */
class RelationDescriptor {


}

module.exports = RelationDescriptor;

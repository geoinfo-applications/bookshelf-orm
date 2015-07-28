"use strict";

var Q = require("q");
var _ = require("underscore");


function BookshelfDeepRemoveOperation(relations, options) {
    this.relations = relations;
    this.options = options;
}

BookshelfDeepRemoveOperation.prototype = {

    get cascadeRelations() {
        return this.relations ? this.relations.filter(function (relation) {
            return relation.references.cascade;
        }) : [];
    },

    get relationsWhereKeyIsOnRelated() {
        return _.filter(this.relations, this.isRelationWithKeyIsOnRelated);
    },

    isRelationWithKeyIsOnRelated: function (relation) {
        return relation.type === "hasMany" || relation.type === "hasOne";
    },

    get relationsWhereKeyIsOnItem() {
        return _.where(this.cascadeRelations, { type: "belongsTo" });
    },

    remove: function (item) {
        return this.dropRelations(this.relationsWhereKeyIsOnRelated, item).then(function () {
            return item.destroy(this.options);
        }.bind(this)).then(function (item) {
            return this.dropRelations(this.relationsWhereKeyIsOnItem, item).then(_.constant(item));
        }.bind(this));
    },

    dropRelations: function (collection, item) {
        return Q.all(collection.map(function (relation) {
            return this.dropRelated(item, relation);
        }, this));
    },

    dropRelated: function (item, relation) {
        var relationName = "relation_" + relation.name;
        var related = item.relations[relationName];
        var relations = relation.references.mapping.relations;

        if (related && relation.references.cascade) {
            return this.cascadeDrop(related, relations || []);
        } else if (related && this.isRelationWithKeyIsOnRelated(relation)) {
            if (_.isArray(related.models)) {
                return Q.all(related.models.map(this.removeForeignKey.bind(this, item, relation)));
            } else {
                return this.removeForeignKey(item, relation, related);
            }
        }
    },

    cascadeDrop: function (related, relations) {
        var operation = new BookshelfDeepRemoveOperation(relations, this.options);

        if (_.isFunction(related.destroy)) {
            return operation.remove(related);
        } else if (Array.isArray(related.models)) {
            return Q.all(related.models.map(operation.remove, operation));
        } else {
            throw new Error("Related value of type '" + typeof related + "' can not be removed");
        }
    },

    removeForeignKey: function (item, relation, related) {
        var fkColumn = relation.references.mappedBy;
        var query = related.Collection.forge().query().table(related.tableName).where(related.idAttribute, related[related.idAttribute]);

        if (this.options && this.options.transacting) {
            query.transacting(this.options.transacting);
        }

        return query.update(fkColumn, null);
    }

};

module.exports = BookshelfDeepRemoveOperation;

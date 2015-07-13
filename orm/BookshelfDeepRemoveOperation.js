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
            return this.dropRelations(this.relationsWhereKeyIsOnItem, item).then(function () {
                return item;
            });
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

        if (related) {
            return this.cascadeDrop(related, relations || []);
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
    }

};

module.exports = BookshelfDeepRemoveOperation;

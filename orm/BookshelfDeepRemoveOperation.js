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

        return related && this.handleRelated(item, relation, related);
    },

    handleRelated: function (item, relation, related) {
        if (relation.references.cascade) {
            return this.cascadeDropRelations(relation, related);
        } else if (this.isRelationWithKeyIsOnRelated(relation)) {
            return this.cascadeForeignKeys(item, relation, related);
        }
    },

    cascadeDropRelations: function (relation, related) {
        var relations = relation.references.mapping.relations || [];
        return this.cascadeDrop(related, relations);
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

    cascadeForeignKeys: function (item, relation, related) {
        if (_.isArray(related.models)) {
            return Q.all(related.models.map(this.removeForeignKey.bind(this, item, relation)));
        } else {
            return this.removeForeignKey(item, relation, related);
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

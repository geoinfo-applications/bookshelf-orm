"use strict";

var Q = require("q");
var _ = require("underscore");


function BookshelfDeepSaveOperation(relations, options) {
    this.relations = relations;
    this.options = options;
}

BookshelfDeepSaveOperation.prototype = {

    get relationsWhereKeyIsOnRelated() {
        return _.filter(this.relations, this.isRelationWithKeyIsOnRelated);
    },

    isRelationWithKeyIsOnRelated: function (relation) {
        return relation.type === "hasMany" || relation.type === "hasOne";
    },


    get relationsWhereKeyIsOnItem() {
        return _.where(this.relations, { type: "belongsTo" });
    },

    save: function (item) {
        return this.saveWhereKeyIsOnItem(item).then(function () {
            return item.save(null, this.options);
        }.bind(this)).then(function (item) {
            return this.saveWhereKeyIsOnRelated(item).then(_.constant(item));
        }.bind(this));
    },

    saveWhereKeyIsOnItem: function (item) {
        return Q.all(this.relationsWhereKeyIsOnItem.filter(function (relation) {
            return relation.references.cascade;
        }).map(function (relation) {
            return this.handleRelated(item, relation, this.saveWithKeyOnItem);
        }.bind(this)));
    },

    saveWithKeyOnItem: function (item, keyName, operation, related) {
        return operation.save(related).then(function (related) {
            item.set(keyName, related.id);
        });
    },

    saveWhereKeyIsOnRelated: function (item) {
        return Q.all(this.relationsWhereKeyIsOnRelated.map(function (relation) {
            return this.handleRelated(item, relation, relation.references.cascade ? this.saveWithKeyOnRelated : this.saveRelatedKey);
        }.bind(this)));
    },

    saveWithKeyOnRelated: function (item, keyName, operation, related) {
        related.set(keyName, item.id);
        return operation.save(related);
    },

    handleRelated: function (item, relation, saveFunction) {
        var relationName = "relation_" + relation.name;
        var value = item.relations[relationName];
        var keyName = relation.references.mappedBy;
        var operation = new BookshelfDeepSaveOperation(relation.references.mapping.relations, this.options);
        var curriedSaveFunction = saveFunction.bind(this, item, keyName, operation);

        return Q.when(value && this.saveRelatedValue(value, curriedSaveFunction)).then(function () {
            if (relation.references.orphanRemoval) {
                return this.removeOrphans(item, relation, value);
            }
        }.bind(this));
    },

    saveRelatedValue: function (value, saveOperation) {
        if (_.isFunction(value.save)) {
            return saveOperation(value);
        } else if (Array.isArray(value.models)) {
            return Q.all(value.models.map(saveOperation));
        } else {
            throw new Error("Related value of type '" + typeof value + "' can not be saved");
        }
    },

    removeOrphans: function (item, relation, value) {
        var idColumn = relation.references.identifiedBy || "id";

        return this.isRelationWithKeyIsOnRelated(relation) ?
            this.removeOneToManyOrphans(item, relation, value, idColumn) :
            this.removeManyToOneOrphans(item, relation);
    },

    removeOneToManyOrphans: function (item, relation, value, idColumn) {
        var ids = value && (Array.isArray(value.models) ? _.pluck(value.models, idColumn) : [value[idColumn]]);
        var keyName = relation.references.mappedBy;

        function query() {
            return relation.references.mapping.Collection.forge().query().where(function (q) {
                if (ids && ids.length) {
                    q.whereNotIn("id", ids);
                    q.andWhere(keyName, item.id);
                } else {
                    q.where(keyName, item.id);
                }
                q.orWhereNull(keyName);
            });
        }

        return this.addTransactionToQuery(query()).select(idColumn).then(function (results) {
            return Q.all(_.map(results, function (result) {
                if (result && result[idColumn]) {
                    var BookshelfRepository = require("./BookshelfRepository");
                    return new BookshelfRepository(relation.references.mapping).remove(result[idColumn], this.options);
                }
            }.bind(this)));
        }.bind(this));
    },

    removeManyToOneOrphans: function (item, relation) {
        var fkColumn = relation.references.mappedBy;

        var query = function () {
            var query = item.Collection.forge().query().table(item.tableName).where(item.idAttribute, item[item.idAttribute]);
            return this.addTransactionToQuery(query);
        }.bind(this);

        return item.get(fkColumn) || query().select(fkColumn).then(function (results) {
            return Q.all(_.map(results, function (result) {
                return result && result[fkColumn] && query().update(fkColumn, null).then(function () {
                    var BookshelfRepository = require("./BookshelfRepository");
                    return new BookshelfRepository(relation.references.mapping).remove(result[fkColumn], this.options);
                }.bind(this));
            }.bind(this)));
        }.bind(this));
    },

    addTransactionToQuery: function (query) {
        if (this.options && this.options.transacting) {
            query.transacting(this.options.transacting);
        }

        return query;
    },

    saveRelatedKey: function (item, fkColumn, operation, related) {
        var entityId = item.id;
        related.set(fkColumn, entityId);
        var query = related.Collection.forge().query().table(related.tableName).where(related.idAttribute, related[related.idAttribute]);
        this.addTransactionToQuery(query);
        return query.update(fkColumn, entityId);
    }

};

module.exports = BookshelfDeepSaveOperation;

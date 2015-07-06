"use strict";

var Q = require("q");
var _ = require("underscore");


function BookshelfDeepSaveOperation(relations, options) {
    this.relations = relations;
    this.options = options;
}

BookshelfDeepSaveOperation.prototype = {

    get relationsWhereKeyIsOnRelated() {
        return _.where(this.relations, { type: "hasMany" });
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
            // TODO: implement: only key has to be saved
            // if (!relation.references.cascade)

            return this.handleRelated(item, relation, this.saveWithKeyOnRelated);
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

        return relation.type === "hasMany" ?
            this.removeOneToManyOrphans(item, relation, value, idColumn) :
            this.removeManyToOneOrphans(item, relation);
    },

    removeOneToManyOrphans: function (item, relation, value, idColumn) {
        var ids = value && _.pluck(value.models, idColumn);
        var keyName = relation.references.mappedBy;

        var query = relation.references.mapping.Collection.forge().query().where(function (q) {
            if (ids && ids.length) {
                q.whereNotIn("id", ids);
                q.andWhere(keyName, item.id);
            } else {
                q.where(keyName, item.id);
            }
            q.orWhereNull(keyName);
        });

        if (this.options && this.options.transacting) {
            query.transacting(this.options.transacting);
        }

        return query.del();
    },

    removeManyToOneOrphans: function (item, relation) {
        var fkColumn = relation.references.mappedBy;

        return item.get(fkColumn) || query().select(fkColumn).spread(function (result) {
            return result && result[fkColumn] && query().update(fkColumn, null, this.options).then(function () {
                var BookshelfRepository = require("./BookshelfRepository");
                return new BookshelfRepository(relation.references.mapping).remove(result[fkColumn], this.options);
            }.bind(this));
        }.bind(this));

        function query() {
            return item.Collection.forge().query().table(item.tableName).where(item.idAttribute, item[item.idAttribute]);
        }
    }

};

module.exports = BookshelfDeepSaveOperation;

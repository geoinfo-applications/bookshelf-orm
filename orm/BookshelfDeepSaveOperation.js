"use strict";

var Q = require("q");
var _ = require("underscore");
var BookshelfDeepOperation = require("./BookshelfDeepOperation");


class BookshelfDeepSaveOperation extends BookshelfDeepOperation {

    constructor(mapping, options) {
        super(mapping, options);
    }

    save(item) {
        return this.saveWhereKeyIsOnItem(item).then(() => {
            var rawUpdates = this.prepareRawUpdates(item);
            var unsetValues = this.prepareSqlColumnsForSave(item);

            return item.save(null, this.options).then((item) => {
                return Q.when(Object.keys(rawUpdates).length && this.Mapping.createQuery(item, this.options).update(rawUpdates)).then(() => item);
            }).then((item) => {
                _.each(unsetValues, (value, key) => item.set(key, value));
                return item;
            });
        }).then((item) => this.saveWhereKeyIsOnRelated(item).then(() => item));
    }

    prepareRawUpdates(item) {
        var rawUpdates = Object.create(null);

        this.Mapping.writeableSqlColumns.filter((column) => item.has(column.name)).map((column) => {
            var setter = _.isFunction(column.set) ? column.set(item.get(column.name)) : column.set;
            rawUpdates[column.name] = this.Mapping.dbContext.knex.raw(setter);
        });

        return rawUpdates;
    }

    prepareSqlColumnsForSave(item) {
        var unsetValues = Object.create(null);

        this.Mapping.sqlColumns.forEach((column) => {
            if (item.has(column.name)) {
                unsetValues[column.name] = item.get(column.name);
                item.unset(column.name);
            }
        });

        return unsetValues;
    }

    saveWhereKeyIsOnItem(item) {
        return Q.all(this.relationsWhereKeyIsOnItem
            .filter((relation) => relation.references.cascade)
            .map((relation) => this.handleRelated(item, relation, this.saveWithKeyOnItem)));
    }

    saveWithKeyOnItem(item, keyName, operation, related) {
        return operation.save(related).then((related) => item.set(keyName, related.id));
    }

    saveWhereKeyIsOnRelated(item) {
        return Q.all(this.relationsWhereKeyIsOnRelated.map((relation) => {
            return this.handleRelated(item, relation, relation.references.cascade ? this.saveWithKeyOnRelated : this.saveRelatedKey);
        }));
    }

    saveWithKeyOnRelated(item, keyName, operation, related) {
        related.set(keyName, item.id);
        return operation.save(related);
    }

    handleRelated(item, relation, saveFunction) {
        var relationName = "relation_" + relation.name;
        var value = item.relations[relationName];
        var keyName = relation.references.mappedBy;
        var operation = new BookshelfDeepSaveOperation(relation.references.mapping, this.options);
        var curriedSaveFunction = saveFunction.bind(this, item, keyName, operation);

        return Q.when(value && this.saveRelatedValue(value, curriedSaveFunction)).then(() => {
            if (relation.references.orphanRemoval) {
                return this.removeOrphans(item, relation, value);
            }
        });
    }

    saveRelatedValue(value, saveOperation) {
        if (_.isFunction(value.save)) {
            return saveOperation(value);
        } else if (Array.isArray(value.models)) {
            return Q.all(value.models.map(saveOperation));
        } else {
            throw new Error("Related value of type '" + typeof value + "' can not be saved");
        }
    }

    removeOrphans(item, relation, value) {
        var idColumn = relation.references.identifiedBy || "id";

        return this.isRelationWithKeyIsOnRelated(relation) ?
            this.removeOneToManyOrphans(item, relation, value, idColumn) :
            this.removeManyToOneOrphans(item, relation);
    }

    removeOneToManyOrphans(item, relation, value, idColumn) {
        var ids = value && (Array.isArray(value.models) ? _.pluck(value.models, idColumn) : [value[idColumn]]);
        var keyName = relation.references.mappedBy;

        function query() {
            return relation.references.mapping.Collection.forge().query().where((q) => {
                if (ids && ids.length) {
                    q.whereNotIn("id", ids);
                    q.andWhere(keyName, item.id);
                } else {
                    q.where(keyName, item.id);
                }
                q.orWhereNull(keyName);
            });
        }

        return this.addTransactionToQuery(query()).select(idColumn).then((results) => {
            return Q.all(_.map(results, (result) => {
                if (result && result[idColumn]) {
                    var BookshelfRepository = require("./BookshelfRepository");
                    return new BookshelfRepository(relation.references.mapping).remove(result[idColumn], this.options);
                }
            }));
        });
    }

    removeManyToOneOrphans(item, relation) {
        var fkColumn = relation.references.mappedBy;

        var query = () => {
            var query = item.Collection.forge().query().table(item.tableName).where(item.idAttribute, item[item.idAttribute]);
            return this.addTransactionToQuery(query);
        };

        return item.get(fkColumn) || query().select(fkColumn).then((results) => {
            return Q.all(_.map(results, (result) => result && result[fkColumn] && query().update(fkColumn, null).then(() => {
                var BookshelfRepository = require("./BookshelfRepository");
                return new BookshelfRepository(relation.references.mapping).remove(result[fkColumn], this.options);
            })));
        });
    }

    saveRelatedKey(item, fkColumn, operation, related) {
        var entityId = item.id;
        related.set(fkColumn, entityId);
        var query = related.Collection.forge().query().table(related.tableName).where(related.idAttribute, related[related.idAttribute]);
        this.addTransactionToQuery(query);
        return query.update(fkColumn, entityId);
    }

}

module.exports = BookshelfDeepSaveOperation;

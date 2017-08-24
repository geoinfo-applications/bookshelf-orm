"use strict";

const Q = require("q");
const _ = require("underscore");
const BookshelfDeepOperation = require("./BookshelfDeepOperation");
const DefaultBehavior = require("./BookshelfDeepSaveOperationDefaultBehavior");
const HistoryBehavior = require("./BookshelfDeepSaveOperationHistoryBehavior");


class BookshelfDeepSaveOperation extends BookshelfDeepOperation {

    constructor(mapping, options) {
        super(mapping, options);
        this.saveBehavior = this.Mapping.keepHistory ? new HistoryBehavior() : new DefaultBehavior();
    }

    save(item) {
        return this.saveWhereKeyIsOnItem(item).then(() => {
            const rawUpdates = this.prepareRawUpdates(item);
            const unsetValues = this.prepareSqlColumnsForSave(item);

            return this.executeSaveOperation(item).then((item) => {
                return Q.when(Object.keys(rawUpdates).length && this.Mapping.createQuery(item, this.options).update(rawUpdates)).then(() => item);
            }).then((item) => {
                _.each(unsetValues, (value, key) => item.set(key, value));
                return item;
            });
        }).then((item) => this.saveWhereKeyIsOnRelated(item).then(() => item));
    }

    executeSaveOperation(item) {
        return this.saveBehavior.executeSaveOperation(item, this.options, this.Mapping);
    }

    prepareRawUpdates(item) {
        const rawUpdates = Object.create(null);

        this.Mapping.writeableSqlColumns.filter((column) => item.has(column.name)).map((column) => {
            const setter = _.isFunction(column.set) ? column.set(item.get(column.name)) : column.set;
            rawUpdates[column.name] = this.Mapping.dbContext.knex.raw(setter);
        });

        return rawUpdates;
    }

    prepareSqlColumnsForSave(item) {
        const unsetValues = Object.create(null);

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
        const relationName = "relation_" + relation.name;
        const value = item.relations[relationName];
        const keyName = relation.references.mappedBy;
        const operation = new BookshelfDeepSaveOperation(relation.references.mapping, this.options);
        const curriedSaveFunction = (related) => saveFunction.call(this, item, keyName, operation, related, relation);

        return Q.when(value && this.saveRelatedValue(value, curriedSaveFunction, relation.references.saveSequential)).then(() => {
            if (relation.references.orphanRemoval) {
                return this.removeOrphans(item, relation, value);
            }
        });
    }

    saveRelatedValue(value, saveOperation, sequential) {
        if (_.isFunction(value.save)) {
            return saveOperation(value);
        } else if (Array.isArray(value.models)) {
            return this.runSaveOperation(value.models, saveOperation, sequential);
        } else {
            throw new Error("Related value of type '" + typeof value + "' can not be saved");
        }
    }

    runSaveOperation(models, saveOperation, sequential) {
        return sequential ? this.doSequential(models, saveOperation) : Q.all(models.map(saveOperation));
    }

    doSequential(list, callback) {
        return _.reduce(list, (promise, item, index) => {
            return promise.then(() => callback(item, index));
        }, Q.when());
    }

    removeOrphans(item, relation, value) {
        const idColumn = relation.references.identifiedBy || "id";

        return this.isRelationWithKeyIsOnRelated(relation) ?
            this.removeOneToManyOrphans(item, relation, value, idColumn) :
            this.removeManyToOneOrphans(item, relation);
    }

    removeOneToManyOrphans(item, relation, value, idColumn) {
        const ids = value && (Array.isArray(value.models) ? _.pluck(value.models, idColumn) : [value[idColumn]]);
        const keyName = relation.references.mappedBy;

        return relation.references.mapping.createQuery(null, this.options).where((q) => {
            if (ids && ids.length) {
                q.whereNotIn("id", ids);
                q.andWhere(keyName, item.id);
            } else {
                q.where(keyName, item.id);
            }
            q.orWhereNull(keyName);
        }).select(idColumn).then((results) => {
            const BookshelfRepository = require("./BookshelfRepository");

            return Q.all(_.filter(results, (result) => result && result[idColumn]).map((result) => {
                return new BookshelfRepository(relation.references.mapping).remove(result[idColumn], this.options);
            }));
        });
    }

    removeManyToOneOrphans(item, relation) {
        const fkColumn = relation.references.mappedBy;

        if (item.get(fkColumn)) {
            return;
        }

        return this.Mapping.createQuery(item, this.options).select(fkColumn).then((results) => {
            const BookshelfRepository = require("./BookshelfRepository");

            return Q.all(_.filter(results, (result) => result && result[fkColumn]).map((result) => {
                return new BookshelfRepository(relation.references.mapping).remove(result[fkColumn], this.options);
            })).then(() => {
                return this.Mapping.createQuery(item, this.options).update(fkColumn, null);
            });
        });
    }

    saveRelatedKey(item, fkColumn, operation, related, relation) {
        const entityId = item.id;
        related.set(fkColumn, entityId);
        const query = relation.references.mapping.createQuery(null, this.options).where(related.idAttribute, related[related.idAttribute]);
        this.addTransactionToQuery(query);
        return query.update(fkColumn, entityId);
    }

}

module.exports = BookshelfDeepSaveOperation;

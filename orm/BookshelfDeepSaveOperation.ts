"use strict";

import Q from "q";
import _ from "underscore";
import Bookshelf from "bookshelf";
import BookshelfRepository from "./BookshelfRepository";
import BookshelfDeepOperation from "./BookshelfDeepOperation";
import IBookshelfDeepSaveOperationBehavior from "./IBookshelfDeepSaveOperationBehavior";
import DefaultBehavior from "./BookshelfDeepSaveOperationDefaultBehavior";
import HistoryBehavior from "./BookshelfDeepSaveOperationHistoryBehavior";
import { required } from "./Annotations";
import BookshelfMapping from "./BookshelfMapping";
import IEntityRepositoryOptions from "./IEntityRepositoryOptions";


export default class BookshelfDeepSaveOperation<M extends Bookshelf.Model<any>> extends BookshelfDeepOperation {

    private saveBehavior: IBookshelfDeepSaveOperationBehavior<M>;

    constructor(mapping: BookshelfMapping, options: IEntityRepositoryOptions = required("options")) {
        super(mapping, options);
        this.saveBehavior = this.Mapping.keepHistory ? new HistoryBehavior<M>() : new DefaultBehavior<M>();
    }

    public async save(item: M): Promise<M> {
        await this.saveWhereKeyIsOnItem(item);
        const rawUpdates = this.prepareRawUpdates(item);
        const unsetValues = this.prepareSqlColumnsForSave(item);
        const item5 = await this.executeSaveOperation(item);
        await Q.when(Object.keys(rawUpdates).length && this.Mapping.createQuery(item5, this.options).update(rawUpdates));
        _.each(unsetValues, (value, key: string) => item5.set(key, value));
        await this.saveWhereKeyIsOnRelated(item5);
        return item5;
    }

    private executeSaveOperation(item: M): Promise<M> {
        return this.saveBehavior.executeSaveOperation(item, this.Mapping, this.options);
    }

    private prepareRawUpdates(item) {
        const rawUpdates = Object.create(null);

        this.Mapping.writeableSqlColumns.filter((column) => item.has(column.name)).map((column) => {
            const setter = column.set ? column.set(item.get(column.name), this.Mapping.dbContext.knex as any) : column.set;
            rawUpdates[column.name] = this.Mapping.dbContext.knex.raw(setter as any);
        });

        return rawUpdates;
    }

    private prepareSqlColumnsForSave(item) {
        const unsetValues = Object.create(null);

        this.Mapping.sqlColumns.forEach((column) => {
            if (item.has(column.name)) {
                unsetValues[column.name] = item.get(column.name);
                item.unset(column.name);
            }
        });

        return unsetValues;
    }

    private saveWhereKeyIsOnItem(item) {
        return Q.all(this.relationsWhereKeyIsOnItem
            .filter((relation) => relation.references.cascade)
            .map((relation) => this.handleRelated(item, relation, this.saveWithKeyOnItem)));
    }

    private saveWithKeyOnItem(item, keyName, operation, related) {
        return operation.save(related).then((related) => item.set(keyName, related.id));
    }

    private saveWhereKeyIsOnRelated(item) {
        return Q.all(this.relationsWhereKeyIsOnRelated.map((relation) => {
            return this.handleRelated(item, relation, relation.references.cascade ? this.saveWithKeyOnRelated : this.saveRelatedKey);
        }));
    }

    private saveWithKeyOnRelated(item, keyName, operation, related, relation) {
        const columnName = relation.references.identifies || "id";
        related.set(keyName, item.attributes[columnName]);
        return operation.save(related);
    }

    private handleRelated(item, relation, saveFunction) {
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

    private saveRelatedValue(value, saveOperation, sequential) {
        if (_.isFunction(value.save)) {
            return saveOperation(value);
        } else if (Array.isArray(value.models)) {
            return this.runSaveOperation(value.models, saveOperation, sequential);
        } else {
            throw new Error("Related value of type '" + typeof value + "' can not be saved");
        }
    }

    private runSaveOperation(models, saveOperation, sequential) {
        return sequential ? this.doSequential(models, saveOperation) : Q.all(models.map(saveOperation));
    }

    private doSequential(list, callback) {
        return _.reduce(list, (promise, item, index) => {
            return promise.then(() => callback(item, index));
        }, Q.when());
    }

    private removeOrphans(item, relation, value) {
        const idColumn = relation.references.identifiedBy || "id";

        return this.isRelationWithKeyIsOnRelated(relation) ?
            this.removeOneToManyOrphans(item, relation, value, idColumn) :
            this.removeManyToOneOrphans(item, relation);
    }

    private removeOneToManyOrphans(item, relation, value, idColumn) {
        const ids = value && (Array.isArray(value.models) ? _.pluck(value.models, idColumn) : [value[idColumn]]);
        const fkColumn = relation.references.mappedBy;

        return relation.references.mapping.createQuery(null, this.options).where((q) => {
            if (_.isEmpty(ids)) {
                q.where(fkColumn, item.id);
            } else {
                q.whereNotIn(idColumn, ids);
                q.andWhere(fkColumn, item.id);
            }
            q.orWhereNull(fkColumn);
        }).select(idColumn).then((results) => {
            return this.removeOrphanInRelatedRepository(relation, results, idColumn);
        });
    }

    private removeManyToOneOrphans(item, relation) {
        const fkColumn = relation.references.mappedBy;

        if (item.get(fkColumn)) {
            return;
        }

        return this.Mapping.createQuery(item, this.options).select(fkColumn)
            .then((results) => this.removeOrphanInRelatedRepository(relation, results, fkColumn))
            .then(() => this.Mapping.createQuery(item, this.options).update(fkColumn, null as any));
    }

    private removeOrphanInRelatedRepository(relation, results, fkColumn) {
        const repository = new BookshelfRepository(relation.references.mapping);

        const ids = results.filter((result) => result && result[fkColumn]).map((result) => result[fkColumn]);
        return repository.remove(ids, this.options);
    }

    private saveRelatedKey(item, fkColumn, _operation, related, relation) {
        const columnName = relation.references.identifies || "id";
        const entityId = item.attributes[columnName];
        related.set(fkColumn, entityId);

        if (related.isNew()) {
            return;
        }

        const query = relation.references.mapping.createQuery(null, this.options).where(related.idAttribute, related[related.idAttribute]);
        this.addTransactionToQuery(query);
        return query.update(fkColumn, entityId);
    }

}


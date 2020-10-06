"use strict";

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
import { Dictionary } from "ts-essentials";


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
        await Promise.resolve(Object.keys(rawUpdates).length && this.Mapping.createQuery(item5, this.options).update(rawUpdates));
        Object.keys(unsetValues).forEach((key) => item5.set(key, unsetValues[key]));
        await this.saveWhereKeyIsOnRelated(item5);
        return item5;
    }

    private executeSaveOperation(item: M): Promise<M> {
        return this.saveBehavior.executeSaveOperation(item, this.Mapping, this.options);
    }

    private prepareRawUpdates(item: M) {
        const rawUpdates = Object.create(null);

        this.Mapping.writeableSqlColumns.filter((column) => item.has(column.name)).map((column) => {
            const setter = column.set ? column.set(item.get(column.name), this.Mapping.dbContext.knex as any) : column.set;
            rawUpdates[column.name] = this.Mapping.dbContext.knex.raw(setter as any);
        });

        return rawUpdates;
    }

    private prepareSqlColumnsForSave(item: M): Dictionary<unknown> {
        const unsetValues = Object.create(null);

        this.Mapping.sqlColumns.forEach((column) => {
            if (item.has(column.name)) {
                unsetValues[column.name] = item.get(column.name);
                item.unset(column.name);
            }
        });

        return unsetValues;
    }

    private saveWhereKeyIsOnItem(item: M) {
        return Promise.all(this.relationsWhereKeyIsOnItem
            .filter((relation) => relation.references.cascade)
            .map((relation) => this.handleRelated(item, relation, this.saveWithKeyOnItem)));
    }

    private async saveWithKeyOnItem(item: M, keyName, operation, related) {
        const savedRelated = await operation.save(related);
        return item.set(keyName, savedRelated.id);
    }

    private saveWhereKeyIsOnRelated(item: M) {
        return Promise.all(this.relationsWhereKeyIsOnRelated.map((relation) => {
            return this.handleRelated(item, relation, relation.references.cascade ? this.saveWithKeyOnRelated : this.saveRelatedKey);
        }));
    }

    private saveWithKeyOnRelated(item: M, keyName, operation, related, relation) {
        const columnName = relation.references.identifies || "id";
        related.set(keyName, item.attributes[columnName]);
        return operation.save(related);
    }

    private async handleRelated(item, relation, saveFunction) {
        const relationName = `relation_${relation.name}`;
        const value = item.relations[relationName];
        const keyName = relation.references.mappedBy;
        const operation = new BookshelfDeepSaveOperation(relation.references.mapping, this.options);
        const curriedSaveFunction = (related) => saveFunction.call(this, item, keyName, operation, related, relation);

        await Promise.resolve(value && this.saveRelatedValue(value, curriedSaveFunction, relation.references.saveSequential));
        if (relation.references.orphanRemoval) {
            return this.removeOrphans(item, relation, value);
        }
    }

    private saveRelatedValue(value, saveOperation, sequential) {
        if (_.isFunction(value.save)) {
            return saveOperation(value);
        } else if (Array.isArray(value.models)) {
            return this.runSaveOperation(value.models, saveOperation, sequential);
        } else {
            throw new Error(`Related value of type '${typeof value}' can not be saved`);
        }
    }

    private runSaveOperation(models, saveOperation, sequential) {
        return sequential ? this.doSequential(models, saveOperation) : Promise.all(models.map(saveOperation));
    }

    private doSequential(list, callback) {
        return list.reduce(async (promise, item, index) => {
            await promise;
            return callback(item, index);
        }, Promise.resolve());
    }

    private removeOrphans(item: M, relation, value) {
        const idColumn = relation.references.identifiedBy || "id";

        return this.isRelationWithKeyIsOnRelated(relation) ?
            this.removeOneToManyOrphans(item, relation, value, idColumn) :
            this.removeManyToOneOrphans(item, relation);
    }

    private async removeOneToManyOrphans(item: M, relation, value, idColumn) {
        const ids = value && (Array.isArray(value.models) ? _.pluck(value.models, idColumn) : [value[idColumn]]);
        const fkColumn = relation.references.mappedBy;
        const identifies = relation.references.identifies || "id";

        const results = await relation.references.mapping.createQuery(null, this.options).where((q) => {
            if (_.isEmpty(ids)) {
                q.where(fkColumn, item.get(identifies));
            } else {
                q.whereNotIn(idColumn, ids);
                q.andWhere(fkColumn, item.get(identifies));
            }
            q.orWhereNull(fkColumn);
        }).select(idColumn);
        return this.removeOrphanInRelatedRepository(relation, results, idColumn);
    }

    private async removeManyToOneOrphans(item: M, relation) {
        const fkColumn = relation.references.mappedBy;

        if (item.get(fkColumn)) {
            return;
        }

        const results = await this.Mapping.createQuery(item, this.options).select(fkColumn);
        await this.removeOrphanInRelatedRepository(relation, results, fkColumn);
        return this.Mapping.createQuery(item, this.options).update(fkColumn, null as any);
    }

    private removeOrphanInRelatedRepository(relation, results, fkColumn) {
        const repository = new BookshelfRepository(relation.references.mapping);

        const ids = results.filter((result) => result && result[fkColumn]).map((result) => result[fkColumn]);
        return repository.remove(ids, this.options);
    }

    private saveRelatedKey(item: M, fkColumn, _operation, related, relation) {
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


"use strict";

import _ from "underscore";
import Bookshelf from "bookshelf";
import SaveOperation from "./BookshelfDeepSaveOperation";
import RemoveOperation from "./BookshelfDeepRemoveOperation";
import FetchOperation from "./BookshelfDeepFetchOperation";
import BookshelfRelations from "./BookshelfRelations";
import { IColumnDescriptor } from "./typedef/IColumnDescriptor";
import MappingRelationsIterator from "./MappingRelationsIterator";
import IEntityRepositoryOptions from "./IEntityRepositoryOptions";
import BookshelfMapping from "./BookshelfMapping";
import { required } from "./Annotations";


export default class BookshelfRepository<M extends Bookshelf.Model<any>, ID = number> {

    private static readonly CHUNK_SIZE = 1000;

    private readonly Mapping: BookshelfMapping;
    private readonly relations: BookshelfRelations;

    public constructor(Mapping: BookshelfMapping) {
        this.Mapping = Mapping;
        this.relations = new BookshelfRelations(this.Mapping);
    }

    private get idColumnName() {
        return this.Mapping.identifiedBy;
    }

    public async findAll(ids?: ID[] | null | IEntityRepositoryOptions, options: IEntityRepositoryOptions = required("options")) {
        if (this.idsIsOptions(ids)) {
            return this.findAll(null, ids);
        }

        if (ids && ids.length === 0) {
            return this.Mapping.Collection.forge();
        }

        return this.findAllChunked(ids, options);
    }

    private idsIsOptions<ID>(ids: ID[] | IEntityRepositoryOptions | undefined): ids is IEntityRepositoryOptions {
        return !!ids && !_.isArray(ids);
    }

    private async findAllChunked(ids: ID[] | null | undefined, options: IEntityRepositoryOptions) {
        const generator = this.getNextChunk(ids, options);
        const results: M[] = [];

        for (let current = generator.next(); !current.done; current = generator.next()) {
            const collection = await current.value;
            results.push(...collection.models);
        }

        return this.Mapping.Collection.forge(results);
    }

    private* getNextChunk(ids: ID[] | null | undefined, options: IEntityRepositoryOptions) {
        if (!Array.isArray(ids) || !ids.length) {
            return yield this.findWhere(null, options);
        }

        const chunks = _.chunk(ids, BookshelfRepository.CHUNK_SIZE) as number[][];

        for (const chunk of chunks) {
            yield this.findWhere((q) => {
                q.whereIn(this.idColumnName, chunk);
                chunk.forEach((id) => q.orderByRaw(`${this.idColumnName} = ? DESC`, [id]));
            }, options);
        }
    }

    public findWhere(condition, options: IEntityRepositoryOptions = required("options")) {
        const collection = (this.Mapping.Collection.forge() as Bookshelf.Collection<any>).query((q) => {
            if (condition) {
                condition.call(this, q);
            }

            if (this.Mapping.discriminator) {
                q.andWhere(this.Mapping.discriminator);
            }
        });

        return this.fetchWithOptions(collection, options);
    }

    public findByConditions(conditions, options: IEntityRepositoryOptions = required("options")) {
        const relations = options && this.getFilteredRelations(options) || this.Mapping.relations;

        return this.findWhere((q) => {
            q.whereIn(this.Mapping.identifiedBy, (subQuery) => {
                subQuery.select(`${this.Mapping.tableName}.${this.Mapping.identifiedBy}`).from(this.Mapping.tableName);

                if (this.Mapping.discriminator) {
                    subQuery.andWhere(this.Mapping.discriminator);
                }

                if (options && options.transacting) {
                    subQuery.transacting(options.transacting);
                }

                relations.forEach((relation) => {
                    this.joinRelations(subQuery, relation, this.Mapping);
                });
                conditions.forEach((condition) => {
                    condition.query(subQuery);
                });
            });

        }, options);
    }

    private getFilteredRelations(options: IEntityRepositoryOptions = required("options")) {
        return _.reject(this.Mapping.relations, (relation) => {
            return _.contains(options!.exclude!, relation.name);
        });
    }

    private joinRelations(q, relation, parentMapping) {
        this.mapToRelation(q, relation, parentMapping);
        const mapping = relation.references.mapping;
        mapping.relations.forEach((child) => this.joinRelations(q, child, mapping));
    }

    private mapToRelation(q, relation, parentMapping) {
        const mappingTableName = relation.references.mapping.tableName;
        const mappingDefaultArray = [mappingTableName, parentMapping.tableName];
        const mappingArray = relation.type === "belongsTo" ? mappingDefaultArray : mappingDefaultArray.reverse();

        q.leftOuterJoin.apply(q, [
            mappingTableName,
            `${_.first(mappingArray)}.${relation.references.mapping.identifiedBy}`,
            `${_.last(mappingArray)}.${relation.references.mappedBy}`
        ]);
    }

    public findOne(id: ID, options: IEntityRepositoryOptions = required("options")) {
        if (_.isUndefined(id)) {
            return Promise.resolve(null);
        }
        const query = this.createIdQuery(id);
        const model = (this.Mapping.Model.forge(query) as Bookshelf.Model<any>);

        if (this.Mapping.discriminator) {
            model.where(this.Mapping.discriminator);
        }

        return this.fetchWithOptions(model, options);
    }

    private fetchWithOptions(model, options: IEntityRepositoryOptions = required("options")) {
        return new FetchOperation(this.Mapping, options).fetch(model, this.relations.getFetchOptions(options));
    }

    public save(item: M, options: IEntityRepositoryOptions = required("options")) {
        if (this.isCollectionType(item)) {
            return this.invokeOnCollection(item, this.save, options);
        }

        this.stringifyJson(item);
        const saveOperation = new SaveOperation(this.Mapping, options);
        return saveOperation.save(item);
    }

    public stringifyJson(item: M) {
        function stringifyJsonFields(mapping: BookshelfMapping, node) {
            if (node.attributes) {
                _.where(mapping.columns, { type: "json" }).forEach((column: IColumnDescriptor) => {
                    const value = node.attributes[column.name];

                    if (!_.isString(value)) {
                        node.attributes[column.name] = value === null ? null : JSON.stringify(value);
                    }
                });
            }
        }

        return new MappingRelationsIterator(stringifyJsonFields).traverse(this.Mapping, item);
    }

    public async remove(item: M | ID, options: IEntityRepositoryOptions = required("options")) {
        if (this.isCollectionType(item)) {
            return this.invokeOnCollection(item, this.remove, options);
        }

        const id = item instanceof this.Mapping.Model ? (item as M).get(this.idColumnName) : item;

        if (id === undefined) {
            return;
        }

        item = await this.findOne(id, options);

        if (item) {
            await new RemoveOperation(this.Mapping, options).remove(item);
        }
    }

    private isCollectionType(item: ID | M | M[] | Bookshelf.Collection<M>): item is (M[] | Bookshelf.Collection<M>) {
        return Array.isArray(item) || item instanceof this.Mapping.Collection;
    }

    private invokeOnCollection(collection: M[] | Bookshelf.Collection<M>, fn, options: IEntityRepositoryOptions = required("options")) {
        const iterator = _.partial(fn, _, options).bind(this);
        return Promise.all(Array.isArray(collection) ? collection.map(iterator) : collection.map(iterator));
    }

    public updateRaw(values, where, options: IEntityRepositoryOptions = required("options")) {
        const query = this.Mapping.createQuery(null, options).where(where).update(values);

        if (options && options.transacting) {
            query.transacting(options.transacting as any);
        }

        return query;
    }

    private createIdQuery(id: ID) {
        const query = {};
        query[this.idColumnName] = id;
        return query;
    }

}

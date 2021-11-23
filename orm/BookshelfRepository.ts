"use strict";

import _ from "underscore";
import Knex from "knex";
import Bookshelf from "bookshelf";
import SaveOperation from "./BookshelfDeepSaveOperation";
import RemoveOperation from "./BookshelfDeepRemoveOperation";
import FetchOperation from "./BookshelfDeepFetchOperation";
import BookshelfRelations from "./BookshelfRelations";
import MappingRelationsIterator from "./MappingRelationsIterator";
import IEntityRepositoryOptions from "./IEntityRepositoryOptions";
import BookshelfMapping from "./BookshelfMapping";
import { required } from "./Annotations";
import IPaginationOptions from "./typedef/IPaginationOptions";


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

        return this.findAllChunked(ids, null, options);
    }

    private idsIsOptions<ID>(ids: ID[] | IEntityRepositoryOptions | undefined): ids is IEntityRepositoryOptions {
        return !!ids && !Array.isArray(ids);
    }

    private async findAllChunked(ids: ID[] | null | undefined, paginationOptions: IPaginationOptions | null, options: IEntityRepositoryOptions) {
        const generator = this.getNextChunk(ids, paginationOptions, options);
        const results: M[] = [];

        for (let current = generator.next(); !current.done; current = generator.next()) {
            const collection = await current.value;
            results.push(...(collection as any).models);
        }

        return this.Mapping.Collection.forge(results);
    }

    private* getNextChunk(ids: ID[] | null | undefined, paginationOptions: IPaginationOptions | null, options: IEntityRepositoryOptions) {
        if (!Array.isArray(ids) || !ids.length) {
            return yield this.findWhere(null, paginationOptions, options);
        }

        const chunks = _.chunk(ids, BookshelfRepository.CHUNK_SIZE) as ID[][];

        for (const chunk of chunks) {
            yield this.findWhere((q) => {
                q.whereIn(this.idColumnName, chunk);
                chunk.forEach((id) => q.orderByRaw(`${this.idColumnName} = ? DESC`, [id]));
            }, paginationOptions, options);
        }
    }

    public findWhere(condition, pageableOptions: IPaginationOptions | null, options: IEntityRepositoryOptions = required("options")) {
        const collection = this.getCollection(condition, pageableOptions ? { ...pageableOptions, skipOffset: false } : null, options);
        return this.fetchWithOptions(collection, options);
    }

    public count(condition, pageableOptions: IPaginationOptions | null, options: IEntityRepositoryOptions = required("options")) {
        const collection = this.getCollection(condition, pageableOptions ? {...pageableOptions, skipOffset: true} : null, options);
        return this.countWithOptions(collection, options);
    }

    private getCollection(condition, pageableOptions: IPaginationOptions & { skipOffset: boolean } | null, options) {
        return (this.Mapping.Collection.forge() as Bookshelf.Collection<any>).query((q) => {
            if (condition) {
                condition.call(this, q);
            }

            if (pageableOptions) {
                q.limit(pageableOptions.limit);
                if (!pageableOptions.skipOffset) {
                    q.offset(pageableOptions.offset);
                }
            }

            if (this.Mapping.discriminator) {
                q.andWhere(this.Mapping.addDiscriminator(options));
            }
        });
    }

    public findByConditions(conditions, paginationOptions: IPaginationOptions | null, options: IEntityRepositoryOptions = required("options")) {
        const relations = options && this.getFilteredRelations(options) || this.Mapping.relations;

        return this.findWhere((q) => {
            q.whereIn(this.Mapping.identifiedBy, (subQuery) => {
                subQuery.select(`${this.Mapping.tableName}.${this.Mapping.identifiedBy}`).from(this.Mapping.tableName);

                if (this.Mapping.discriminator) {
                    subQuery.andWhere(this.Mapping.addDiscriminator(options));
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

        }, paginationOptions, options);
    }

    private getFilteredRelations(options: IEntityRepositoryOptions = required("options")) {
        return _.reject(this.Mapping.relations, (relation) => {
            return options!.exclude!.includes(relation.name);
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
            model.where(this.Mapping.addDiscriminator(options));
        }

        return this.fetchWithOptions(model, options);
    }

    private fetchWithOptions(model, options: IEntityRepositoryOptions = required("options")) {
        return new FetchOperation(this.Mapping, options).fetch(model, this.relations.getFetchOptions(options));
    }

    private countWithOptions(model, options: IEntityRepositoryOptions = required("options")) {
        return new FetchOperation(this.Mapping, options).count(model, this.relations.getFetchOptions(options));
    }

    public save(item: M, options?: IEntityRepositoryOptions): Promise<M>;
    public save(item: M[] | Bookshelf.Collection<M>, options?: IEntityRepositoryOptions): Promise<M[]>;

    public save(item: M | M[] | Bookshelf.Collection<M>, options: IEntityRepositoryOptions = required("options")): Promise<M[] | M> {
        if (this.isCollectionType(item)) {
            return this.invokeOnCollection(item, (item: M) => this.save(item, options));
        }

        this.stringifyJson(item);
        const saveOperation: SaveOperation<M> = new SaveOperation<M>(this.Mapping, options);
        return saveOperation.save(item);
    }

    public stringifyJson(item: M) {
        function stringifyJsonFields(mapping: BookshelfMapping, node) {
            if (node.attributes) {
                for (const column of mapping.regularColumns.filter(({ type }) => type === "json")) {
                    const value = node.attributes[column.name];

                    if (!_.isString(value)) {
                        node.attributes[column.name] = value === null ? null : JSON.stringify(value);
                    }
                }
            }
        }

        return new MappingRelationsIterator(stringifyJsonFields).traverse(this.Mapping, item);
    }

    public async remove(item: M | ID, options: IEntityRepositoryOptions = required("options")) {
        if (this.isCollectionType(item)) {
            return this.invokeOnCollection(item, (item: M) => this.remove(item, options));
        }

        const id = (item as any) instanceof this.Mapping.Model ? (item as M).get(this.idColumnName) : item;

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

    private invokeOnCollection(collection: M[] | Bookshelf.Collection<M>, fn: (item: M) => Promise<M>): Promise<M[]> {
        return Promise.all(Array.isArray(collection) ? collection.map((item) => fn(item)) : collection.map((item) => fn(item)));
    }

    public updateRaw<TRecord = any>(values, where, options: IEntityRepositoryOptions = required("options")): Knex.QueryBuilder<TRecord, number> {
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

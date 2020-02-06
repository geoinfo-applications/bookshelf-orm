"use strict";

const Q = require("q");
const _ = require("underscore");
const SaveOperation = require("./BookshelfDeepSaveOperation");
const RemoveOperation = require("./BookshelfDeepRemoveOperation");
const FetchOperation = require("./BookshelfDeepFetchOperation");
const BookshelfRelations = require("./BookshelfRelations");
const MappingRelationsIterator = require("./MappingRelationsIterator");
const { required } = require("./Annotations");


class BookshelfRepository {

    constructor(Mapping) {
        this.Mapping = Mapping;
        this.relations = new BookshelfRelations(this.Mapping);
        this.conditionHandlers = [];
    }

    get idColumnName() {
        return this.Mapping.identifiedBy;
    }

    get CHUNK_SIZE() {
        return 1000;
    }

    findAll(ids, options = required("options")) {
        if (ids && !_.isArray(ids)) {
            return this.findAll(null, ids);
        }

        if (ids && ids.length === 0) {
            return Q.when(this.Mapping.Collection.forge());
        }

        return this.findAllChunked(ids, options);
    }

    async findAllChunked(ids, options) {
        const generator = this.getNextChunk(ids, options);
        const results = [];

        for (let current = generator.next(); !current.done; current = generator.next()) {
            const collection = await current.value;
            results.push(...collection.models);
        }

        return this.Mapping.Collection.forge(results);
    }

    * getNextChunk(ids, options) {
        if (!Array.isArray(ids) || !ids.length) {
            return yield this.findWhere(null, options);
        }

        const chunks = _.chunk(ids, this.CHUNK_SIZE);

        for (const chunk of chunks) {
            yield this.findWhere((q) => {
                q.whereIn(this.idColumnName, chunk);
                _.each(chunk, (id) => q.orderByRaw(`${this.idColumnName} = ? DESC`, [id]));
            }, options);
        }
    }

    findWhere(condition, options = required("options")) {
        const collection = this.Mapping.Collection.forge().query((q) => {
            condition && condition.call(this, q);

            if (this.Mapping.discriminator) {
                q.andWhere(this.Mapping.discriminator);
            }

        });

        return this.fetchWithOptions(collection, options);
    }

    findByConditions(conditions, options = required("options")) {
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

    getFilteredRelations(options = required("options")) {
        return _.reject(this.Mapping.relations, (relation) => {
            return _.contains(options.exclude, relation.name);
        });
    }

    joinRelations(q, relation, parentMapping) {
        this.mapToRelation(q, relation, parentMapping);
        const mapping = relation.references.mapping;
        mapping.relations.forEach((child) => this.joinRelations(q, child, mapping));
    }

    mapToRelation(q, relation, parentMapping) {
        const mappingTableName = relation.references.mapping.tableName;
        const mappingDefaultArray = [mappingTableName, parentMapping.tableName];
        const mappingArray = relation.type === "belongsTo" ? mappingDefaultArray : mappingDefaultArray.reverse();

        q.leftOuterJoin.apply(q,
            [
                mappingTableName,
                _.first(mappingArray) + "." + relation.references.mapping.identifiedBy,
                _.last(mappingArray) + "." + relation.references.mappedBy
            ]
        );
    }

    findOne(id, options = required("options")) {
        if (_.isUndefined(id)) {
            return Promise.resolve(null);
        }
        const query = this.createIdQuery(id);
        const model = this.Mapping.Model.forge(query);

        if (this.Mapping.discriminator) {
            model.where(this.Mapping.discriminator);
        }

        return this.fetchWithOptions(model, options);
    }

    fetchWithOptions(model, options = required("options")) {
        return new FetchOperation(this.Mapping, options).fetch(model, this.relations.getFetchOptions(options));
    }

    save(item, options = required("options")) {
        if (this.isCollectionType(item)) {
            return this.invokeOnCollection(item, this.save, options);
        }

        this.stringifyJson(item);
        const saveOperation = new SaveOperation(this.Mapping, options);
        return saveOperation.save(item);
    }

    stringifyJson(item) {
        function stringifyJsonFields(mapping, node) {
            if (node.attributes) {
                _.where(mapping.columns, { type: "json" }).forEach((column) => {
                    const value = node.attributes[column.name];

                    if (!_.isString(value)) {
                        node.attributes[column.name] = value === null ? null : JSON.stringify(value);
                    }
                });
            }
        }

        return new MappingRelationsIterator(stringifyJsonFields).traverse(this.Mapping, item);
    }

    remove(item, options = required("options")) {
        if (this.isCollectionType(item)) {
            return this.invokeOnCollection(item, this.remove, options);
        }

        const id = item instanceof this.Mapping.Model ? item.get(this.idColumnName) : item;
        if (_.isUndefined(id)) {
            return Promise.resolve();
        }
        const operation = new RemoveOperation(this.Mapping, options);

        return this.findOne(id, options).then((item) => item && operation.remove(item));
    }

    isCollectionType(item) {
        return Array.isArray(item) || item instanceof this.Mapping.Collection;
    }

    invokeOnCollection(collection, fn, options = required("options")) {
        const iterator = _.partial(fn, _, options).bind(this);
        return _.isArray(collection) ? Q.all(collection.map(iterator)) : collection.mapThen(iterator);
    }

    updateRaw(values, where, options = required("options")) {
        const query = this.Mapping.createQuery(null, options).where(where).update(values);

        if (options && options.transacting) {
            query.transacting(options.transacting);
        }

        return query;
    }

    createIdQuery(id) {
        const query = {};
        query[this.idColumnName] = id;
        return query;
    }
}


module.exports = BookshelfRepository;

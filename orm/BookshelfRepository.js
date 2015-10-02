"use strict";

var Q = require("q");
var _ = require("underscore");
var SaveOperation = require("./BookshelfDeepSaveOperation");
var RemoveOperation = require("./BookshelfDeepRemoveOperation");
var BookshelfRelations = require("./BookshelfRelations");
var MappingRelationsIterator = require("./MappingRelationsIterator");


class BookshelfRepository {

    constructor(Mapping) {
        this.Mapping = Mapping;
        this.relations = new BookshelfRelations(this.Mapping);
    }

    findAll(ids, options) {
        if (ids && !_.isArray(ids)) {
            return this.findAll(null, ids);
        }

        if (ids && ids.length === 0) {
            return Q.when(this.Mapping.Collection.forge());
        }

        return this.findWhere(function (q) {
            if (ids) {
                q.whereIn(this.idColumnName, ids);

                _.each(ids, function (id) {
                    q.orderByRaw(this.idColumnName + "=" + id + " DESC");
                }, this);
            }
        }, options);
    }

    findWhere(condition, options) {
        var collection = this.Mapping.Collection.forge().query(function (q) {
            condition.call(this, q);

            if (this.Mapping.discriminator) {
                q.andWhere(this.Mapping.discriminator);
            }

        }.bind(this));

        return this.fetchWithOptions(collection, options);
    }

    findOne(id, options) {
        var query = this.createIdQuery(id);
        var model = this.Mapping.Model.forge(query);

        if (this.Mapping.discriminator) {
            model.where(this.Mapping.discriminator);
        }

        return this.fetchWithOptions(model, options);
    }

    fetchWithOptions(model, options) {
        return model.fetch(this.relations.getFetchOptions(options))
            .then(this.stripEmptyRelations.bind(this))
            .then(this.fetchSqlColumns.bind(this, options));
    }

    stripEmptyRelations(item) {
        function stripRelationIfEmpty(relatedNode, node, key) {
            if (Object.keys(relatedNode.attributes).length === 0) {
                delete node.relations[key];
            }
        }

        return this.mappingRelationsIterator(item, null, stripRelationIfEmpty);
    }

    fetchSqlColumns(options, item) {
        var fetchOperations = [];

        this.mappingRelationsIterator(item, (mapping, item) => {
            if (mapping.readableSqlColumns.length) {
                var query = mapping.createQuery(item, options);

                var promise = query.select(mapping.readableSqlColumns.map(column => {
                    var getter = _.isFunction(column.get) ? column.get() : column.get;
                    return mapping.dbContext.knex.raw(getter + " as " + column.name);
                })).then(result => {
                    mapping.readableSqlColumns.forEach(column => item.set(column.name, result[0][column.name]));
                });

                fetchOperations.push(promise);
            }
        });

        return Q.all(fetchOperations).then(() => item);
    }

    stringifyJson(item) {
        function stringifyJsonFields(mapping, node) {
            if (node.attributes) {
                _.where(mapping.columns, { type: "json" }).forEach(function (column) {
                    var value = node.attributes[column.name];

                    if (!_.isString(value)) {
                        node.attributes[column.name] = JSON.stringify(value);
                    }
                });
            }
        }

        return this.mappingRelationsIterator(item, stringifyJsonFields);
    }

    mappingRelationsIterator(item, preOrder, postOrder) {
        return new MappingRelationsIterator(preOrder, postOrder).traverse(this.Mapping, item);
    }

    save(item, options) {
        if (this.isCollectionType(item)) {
            return this.invokeOnCollection(item, this.save, options);
        }

        this.stringifyJson(item);
        var saveOperation = new SaveOperation(this.Mapping, options);
        return saveOperation.save(item);
    }

    remove(item, options) {
        if (this.isCollectionType(item)) {
            return this.invokeOnCollection(item, this.remove, options);
        }

        var id = item instanceof this.Mapping.Model ? item[this.idColumnName] : item;
        var operation = new RemoveOperation(this.Mapping, options);

        return this.findOne(id).then(operation.remove.bind(operation));
    }

    isCollectionType(item) {
        return Array.isArray(item) || item instanceof this.Mapping.Collection;
    }

    invokeOnCollection(collection, fn, options) {
        var iterator = _.partial(fn, _, options).bind(this);
        return _.isArray(collection) ? Q.all(collection.map(iterator)) :  collection.mapThen(iterator);
    }

    updateRaw(values, where, options) {
        return this.Mapping.Collection.forge().query().where(where).update(values, options);
    }

    get idColumnName() {
        return this.Mapping.identifiedBy;
    }

    createIdQuery(id) {
        var query = {};
        query[this.idColumnName] = id;
        return query;
    }

}

module.exports = BookshelfRepository;

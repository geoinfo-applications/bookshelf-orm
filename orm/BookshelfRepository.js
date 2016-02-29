"use strict";

var Q = require("q");
var _ = require("underscore");
var SaveOperation = require("./BookshelfDeepSaveOperation");
var RemoveOperation = require("./BookshelfDeepRemoveOperation");
var FetchOperation = require("./BookshelfDeepFetchOperation");
var BookshelfRelations = require("./BookshelfRelations");
var MappingRelationsIterator = require("./MappingRelationsIterator");


class BookshelfRepository {

    constructor(Mapping) {
        this.Mapping = Mapping;
        this.relations = new BookshelfRelations(this.Mapping);
    }

    get idColumnName() {
        return this.Mapping.identifiedBy;
    }

    findAll(ids, options) {
        if (ids && !_.isArray(ids)) {
            return this.findAll(null, ids);
        }

        if (ids && ids.length === 0) {
            return Q.when(this.Mapping.Collection.forge());
        }

        return this.findWhere((q) => {
            if (ids) {
                q.whereIn(this.idColumnName, ids);

                _.each(ids, (id) => q.orderByRaw(this.idColumnName + "=" + id + " DESC"));
            }
        }, options);
    }

    findWhere(condition, options) {
        var collection = this.Mapping.Collection.forge().query((q) => {
            condition.call(this, q);

            if (this.Mapping.discriminator) {
                q.andWhere(this.Mapping.discriminator);
            }

        });

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
        return new FetchOperation(this.Mapping, options).fetch(model, this.relations.getFetchOptions(options));
    }

    save(item, options) {
        if (this.isCollectionType(item)) {
            return this.invokeOnCollection(item, this.save, options);
        }

        this.stringifyJson(item);
        var saveOperation = new SaveOperation(this.Mapping, options);
        return saveOperation.save(item);
    }

    stringifyJson(item) {
        function stringifyJsonFields(mapping, node) {
            if (node.attributes) {
                _.where(mapping.columns, { type: "json" }).forEach((column) => {
                    var value = node.attributes[column.name];

                    if (!_.isString(value)) {
                        node.attributes[column.name] = JSON.stringify(value);
                    }
                });
            }
        }

        return new MappingRelationsIterator(stringifyJsonFields).traverse(this.Mapping, item);
    }

    remove(item, options) {
        if (this.isCollectionType(item)) {
            return this.invokeOnCollection(item, this.remove, options);
        }

        var id = item instanceof this.Mapping.Model ? item[this.idColumnName] : item;
        var operation = new RemoveOperation(this.Mapping, options);

        return this.findOne(id).then((item) => item && operation.remove(item));
    }

    isCollectionType(item) {
        return Array.isArray(item) || item instanceof this.Mapping.Collection;
    }

    invokeOnCollection(collection, fn, options) {
        var iterator = _.partial(fn, _, options).bind(this);
        return _.isArray(collection) ? Q.all(collection.map(iterator)) :  collection.mapThen(iterator);
    }

    updateRaw(values, where, options) {
        var query = this.Mapping.Collection.forge().query().where(where).update(values);

        if (options && options.transacting) {
            query.transacting(options.transacting);
        }

        return query;
    }

    createIdQuery(id) {
        var query = {};
        query[this.idColumnName] = id;
        return query;
    }

}

module.exports = BookshelfRepository;

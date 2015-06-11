"use strict";

var Q = require("q");
var _ = require("underscore");
var SaveOperation = require("./BookshelfDeepSaveOperation");
var RemoveOperation = require("./BookshelfDeepRemoveOperation");
var BookshelfRelations = require("./BookshelfRelations");
var MappingRelationsIterator = require("./MappingRelationsIterator");


function BookshelfRepository(Mapping) {
    this.Mapping = Mapping;
    this.relations = new BookshelfRelations(this.Mapping);
}

BookshelfRepository.prototype = {

    findAll: function (ids, options) {
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
    },

    findWhere: function (condition, options) {
        var collection = this.Mapping.Collection.forge().query(function (q) {
            condition.call(this, q);

            if (this.Mapping.discriminator) {
                q.andWhere(this.Mapping.discriminator);
            }

        }.bind(this));

        return this.fetchWithOptions(collection, options);
    },

    findOne: function (id, options) {
        var query = this.createIdQuery(id);
        var model = this.Mapping.Model.forge(query);

        if (this.Mapping.discriminator) {
            model.where(this.Mapping.discriminator);
        }

        return this.fetchWithOptions(model, options);
    },

    fetchWithOptions: function (model, options) {
        return model.fetch(this.relations.getFetchOptions(options)).then(this.stripEmptyRelations.bind(this));
    },

    stripEmptyRelations: function (item) {
        function stripRelationIfEmpty(relatedNode, node, key) {
            if (Object.keys(relatedNode.attributes).length === 0) {
                delete node.relations[key];
            }
        }

        return this.mappingRelationsIterator(item, null, stripRelationIfEmpty);
    },

    stringifyJson: function (item) {
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
    },

    mappingRelationsIterator: function (item, preOrder, postOrder) {
        return new MappingRelationsIterator(preOrder, postOrder).traverse(this.Mapping, item);
    },

    save: function (item, options) {
        if (this.isCollectionType(item)) {
            return this.invokeOnCollection(item, this.save, options);
        }

        this.stringifyJson(item);
        var saveOperation = new SaveOperation(this.Mapping.relations, options);
        return saveOperation.save(item);
    },

    remove: function (item, options) {
        if (this.isCollectionType(item)) {
            return this.invokeOnCollection(item, this.remove, options);
        }

        var id = item instanceof this.Mapping.Model ? item[this.idColumnName] : item;
        var operation = new RemoveOperation(this.Mapping.relations, options);

        return this.findOne(id).then(operation.remove.bind(operation));
    },

    isCollectionType: function (item) {
        return Array.isArray(item) || item instanceof this.Mapping.Collection;
    },

    invokeOnCollection: function (collection, fn, options) {
        var iterator = _.partial(fn, _, options).bind(this);
        return _.isArray(collection) ? Q.all(collection.map(iterator)) :  collection.mapThen(iterator);
    },

    updateRaw: function (values, where, options) {
        return this.Mapping.Collection.forge().query().where(where).update(values, options);
    },

    get idColumnName() {
        return this.Mapping.identifiedBy;
    },

    createIdQuery: function (id) {
        var query = {};
        query[this.idColumnName] = id;
        return query;
    }

};

module.exports = BookshelfRepository;

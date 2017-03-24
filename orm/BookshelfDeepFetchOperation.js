"use strict";

var Q = require("q");
var _ = require("underscore");
var BookshelfDeepOperation = require("./BookshelfDeepOperation");
var MappingRelationsIterator = require("./MappingRelationsIterator");


class BookshelfDeepFetchOperation extends BookshelfDeepOperation {

    constructor(mapping, options) {
        super(mapping, options);
    }

    fetch(model, fetchOptions) {
        return model.fetch(fetchOptions)
            .then((model) => this.stripEmptyRelations(model))
            .then((model) => this.fetchSqlColumns(model, fetchOptions));
    }

    stripEmptyRelations(model) {
        return this.mappingRelationsIterator(model, null, this.stripRelationIfEmpty);
    }

    stripRelationIfEmpty(relatedNode, node, key) {
        if (Object.keys(relatedNode.attributes).length === 0) {
            delete node.relations[key];
        }
    }

    fetchSqlColumns(model, fetchOptions) {
        var fetchOperations = [];

        if (_.contains(fetchOptions.exclude, "*")) {
            return model;
        }

        this.mappingRelationsIterator(model, (mapping, model) => {
            if (mapping.readableSqlColumns.length) {
                fetchOperations.push(this.fetchReadableSqlColumns(mapping, model, fetchOptions));
            }
        });

        return Q.all(fetchOperations).then(() => model);
    }

    fetchReadableSqlColumns(mapping, model, fetchOptions) {
        var query = mapping.createQuery(model, this.options);

        var rawSelects = mapping.readableSqlColumns.filter((column) => {
            return !_.contains(fetchOptions.exclude, column.name);
        }).map((column) => {
            var getter = _.isFunction(column.get) ? column.get() : column.get;
            return mapping.dbContext.knex.raw(getter + " as \"" + column.name + "\"");
        });

        return query.select(rawSelects).then((result) => {
            mapping.readableSqlColumns.forEach((column) => model.set(column.name, result[0][column.name]));
        });
    }

    mappingRelationsIterator(model, preOrder, postOrder) {
        return new MappingRelationsIterator(preOrder, postOrder).traverse(this.Mapping, model);
    }

}

module.exports = BookshelfDeepFetchOperation;

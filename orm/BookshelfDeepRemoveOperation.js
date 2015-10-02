"use strict";

var Q = require("q");
var _ = require("underscore");
var BookshelfDeepOperation = require("./BookshelfDeepOperation");


class BookshelfDeepRemoveOperation extends BookshelfDeepOperation {

    constructor(mapping, options) {
        super(mapping, options);
    }

    remove(item) {
        return this.dropRelations(this.relationsWhereKeyIsOnRelated, item)
            .then(() => item.destroy(this.options))
            .then(item => this.dropRelations(this.relationsWhereKeyIsOnItem, item).then(() => item));
    }

    dropRelations(collection, item) {
        return Q.all(collection.map(relation => this.dropRelated(item, relation)));
    }

    dropRelated(item, relation) {
        var relationName = "relation_" + relation.name;
        var related = item.relations[relationName];

        return related && this.handleRelated(item, relation, related);
    }

    handleRelated(item, relation, related) {
        if (relation.references.cascade) {
            return this.cascadeDropRelations(relation, related);
        } else if (this.isRelationWithKeyIsOnRelated(relation)) {
            return this.cascadeForeignKeys(item, relation, related);
        }
    }

    cascadeDropRelations(relation, related) {
        var mapping = relation.references.mapping;
        return this.cascadeDrop(related, mapping);
    }

    cascadeDrop(related, mapping) {
        var operation = new BookshelfDeepRemoveOperation(mapping, this.options);

        if (_.isFunction(related.destroy)) {
            return operation.remove(related);
        } else if (Array.isArray(related.models)) {
            return Q.all(related.models.map(operation.remove, operation));
        } else {
            throw new Error("Related value of type '" + typeof related + "' can not be removed");
        }
    }

    cascadeForeignKeys(item, relation, related) {
        if (_.isArray(related.models)) {
            return Q.all(related.models.map(this.removeForeignKey.bind(this, item, relation)));
        } else {
            return this.removeForeignKey(item, relation, related);
        }
    }

    removeForeignKey(item, relation, related) {
        var fkColumn = relation.references.mappedBy;
        var query = related.Collection.forge().query().table(related.tableName).where(related.idAttribute, related[related.idAttribute]);
        this.addTransactionToQuery(query);

        return query.update(fkColumn, null);
    }

}

module.exports = BookshelfDeepRemoveOperation;

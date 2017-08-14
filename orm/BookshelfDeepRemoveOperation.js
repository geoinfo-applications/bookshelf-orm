"use strict";

const Q = require("q");
const _ = require("underscore");
const BookshelfDeepOperation = require("./BookshelfDeepOperation");


class BookshelfDeepRemoveOperation extends BookshelfDeepOperation {

    constructor(mapping, options) {
        super(mapping, options);
    }

    remove(item) {
        return this.dropRelations(this.relationsWhereKeyIsOnRelated, item)
            .then(() => this.executeRemoveOperation(item))
            .then(() => this.dropRelations(this.relationsWhereKeyIsOnItem, item))
            .then(() => item);
    }

    executeRemoveOperation(item) {
        if (this.Mapping.onDelete) {
            return this.Mapping.createQuery(item, this.option).update(this.Mapping.onDelete);
        } else {
            return item.destroy(this.options);
        }
    }

    dropRelations(collection, item) {
        return Q.all(collection.map((relation) => this.dropRelated(item, relation)));
    }

    dropRelated(item, relation) {
        const relationName = "relation_" + relation.name;
        const related = item.relations[relationName];

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
        const mapping = relation.references.mapping;
        return this.cascadeDrop(related, mapping);
    }

    cascadeDrop(related, mapping) {
        const operation = new BookshelfDeepRemoveOperation(mapping, this.options);

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
        const fkColumn = relation.references.mappedBy;
        const query = relation.mapping.createQuery(null, this.options).where(related.idAttribute, related[related.idAttribute]);
        this.addTransactionToQuery(query);

        return query.update(fkColumn, null);
    }

}

module.exports = BookshelfDeepRemoveOperation;

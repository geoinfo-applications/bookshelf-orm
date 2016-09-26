"use strict";

class BookshelfDeepOperation {

    constructor(mapping, options) {
        this.Mapping = mapping;
        this.relations = mapping.relations || [];
        this.options = options;
    }

    get cascadeRelations() {
        return this.relations.filter((relation) => relation.references.cascade);
    }

    get relationsWhereKeyIsOnRelated() {
        return this.relations.filter(this.isRelationWithKeyIsOnRelated);
    }

    get relationsWhereKeyIsOnItem() {
        return this.relations.filter((relation) => relation.type === "belongsTo");
    }

    isRelationWithKeyIsOnRelated(relation) {
        return relation.type === "hasMany" || relation.type === "hasOne";
    }

    addTransactionToQuery(query) {
        return BookshelfDeepOperation.addTransactionToQuery(this.options, query);
    }

    static addTransactionToQuery(options, query) {
        if (options && options.transacting) {
            query.transacting(options.transacting);
        }

        return query;
    }

}

module.exports = BookshelfDeepOperation;

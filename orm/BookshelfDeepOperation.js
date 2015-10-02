"use strict";

class BookshelfDeepOperation {

    constructor(mapping, options) {
        this.Mapping = mapping;
        this.relations = mapping.relations || [];
        this.options = options;
    }

    get cascadeRelations() {
        return this.relations.filter(relation => relation.references.cascade);
    }

    get relationsWhereKeyIsOnRelated() {
        return this.relations.filter(this.isRelationWithKeyIsOnRelated);
    }

    get relationsWhereKeyIsOnItem() {
        return this.relations.filter(relation => relation.type === "belongsTo");
    }

    isRelationWithKeyIsOnRelated(relation) {
        return relation.type === "hasMany" || relation.type === "hasOne";
    }

    addTransactionToQuery(query) {
        if (this.options && this.options.transacting) {
            query.transacting(this.options.transacting);
        }

        return query;
    }

}

module.exports = BookshelfDeepOperation;

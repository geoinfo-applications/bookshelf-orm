"use strict";

import Knex from "knex";
import IEntityRepositoryOptions from "./IEntityRepositoryOptions";
import { required } from "./Annotations";
import BookshelfMapping from "./BookshelfMapping";
import { IRelationDescriptor } from "./typedef/IRelationDescriptor";


export default abstract class BookshelfDeepOperation {

    protected readonly Mapping: BookshelfMapping;
    protected readonly relations: Array<IRelationDescriptor<unknown>>;
    protected readonly options: IEntityRepositoryOptions;

    protected constructor(mapping: BookshelfMapping, options: IEntityRepositoryOptions = required("options")) {
        this.Mapping = mapping;
        this.relations = mapping.relations || [];
        this.options = options;
    }

    protected get cascadeRelations() {
        return this.relations.filter((relation) => relation.references.cascade);
    }

    protected get relationsWhereKeyIsOnRelated() {
        return this.relations.filter(this.isRelationWithKeyIsOnRelated);
    }

    protected get relationsWhereKeyIsOnItem() {
        return this.relations.filter((relation) => relation.type === "belongsTo");
    }

    protected isRelationWithKeyIsOnRelated(relation) {
        return relation.type === "hasMany" || relation.type === "hasOne";
    }

    protected addTransactionToQuery(query) {
        return BookshelfDeepOperation.addTransactionToQuery(query, this.options);
    }

    public static addTransactionToQuery<Q extends Knex.ChainableInterface>(query: Q, options: IEntityRepositoryOptions = required("options")): Q {
        if (options && options.transacting) {
            query.transacting(options.transacting as any);
        }

        return query;
    }

}


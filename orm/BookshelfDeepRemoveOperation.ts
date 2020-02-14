"use strict";

import Q from "q";
import _ from "underscore";
import BookshelfDeepOperation from "./BookshelfDeepOperation";
import { required } from "./Annotations";
import BookshelfMapping from "./BookshelfMapping";
import IEntityRepositoryOptions from "./IEntityRepositoryOptions";


export default class BookshelfDeepRemoveOperation extends BookshelfDeepOperation {

    constructor(mapping: BookshelfMapping, options: IEntityRepositoryOptions = required("options")) {
        super(mapping, options);
    }

    public async remove(item) {
        await this.dropRelations(this.relationsWhereKeyIsOnRelated, item);
        await this.executeRemoveOperation(item);
        await this.dropRelations(this.relationsWhereKeyIsOnItem, item);
        return item;
    }

    private executeRemoveOperation(item) {
        if (this.Mapping.onDelete) {
            return this.Mapping.createQuery(item, this.options).update(this.Mapping.onDelete);
        } else {
            return item.destroy(this.options);
        }
    }

    private dropRelations(collection, item) {
        return Q.all(collection.map((relation) => this.dropRelated(item, relation)));
    }

    private dropRelated(item, relation) {
        const relationName = `relation_${relation.name}`;
        const related = item.relations[relationName];

        return related && this.handleRelated(item, relation, related);
    }

    private handleRelated(item, relation, related) {
        if (relation.references.cascade) {
            return this.cascadeDropRelations(relation, related);
        } else if (this.isRelationWithKeyIsOnRelated(relation)) {
            return this.cascadeForeignKeys(item, relation, related);
        }
    }

    private cascadeDropRelations(relation, related) {
        const mapping = relation.references.mapping;
        return this.cascadeDrop(related, mapping);
    }

    private cascadeDrop(related, mapping) {
        const operation = new BookshelfDeepRemoveOperation(mapping, this.options);

        if (_.isFunction(related.destroy)) {
            return operation.remove(related);
        } else if (Array.isArray(related.models)) {
            return Q.all(related.models.map(operation.remove, operation));
        } else {
            throw new Error(`Related value of type '${typeof related}' can not be removed`);
        }
    }

    private cascadeForeignKeys(item, relation, related) {
        if (_.isArray(related.models)) {
            return Q.all(related.models.map(this.removeForeignKey.bind(this, item, relation)));
        } else {
            return this.removeForeignKey(item, relation, related);
        }
    }

    private removeForeignKey(_item, relation, related) {
        const fkColumn = relation.references.mappedBy;
        const query = relation.references.mapping.createQuery(null, this.options).where(related.idAttribute, related[related.idAttribute]);
        this.addTransactionToQuery(query);

        return query.update(fkColumn, null);
    }

}


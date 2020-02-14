"use strict";

import BookshelfDeepOperation from "./BookshelfDeepOperation";
import MappingRelationsIterator from "./MappingRelationsIterator";
import BookshelfMapping from "./BookshelfMapping";
import IEntityRepositoryOptions from "./IEntityRepositoryOptions";
import { required } from "./Annotations";


export default class BookshelfDeepFetchOperation extends BookshelfDeepOperation {

    constructor(mapping: BookshelfMapping, options: IEntityRepositoryOptions = required("options")) {
        super(mapping, options);
    }

    public async fetch(model, fetchOptions: IEntityRepositoryOptions = required("fetchOptions")) {
        try {
            const model1 = await model.fetch(fetchOptions);
            return await this.stripEmptyRelations(model1);
        } catch (error) {
            if (error.message === "EmptyResponse") {
                return null;
            }

            throw error;
        }
    }

    private stripEmptyRelations(model) {
        return this.mappingRelationsIterator(model, null, this.stripRelationIfEmpty);
    }

    private stripRelationIfEmpty(relatedNode, node, key) {
        if (Object.keys(relatedNode.attributes).length === 0) {
            delete node.relations[key];
        }
    }

    private mappingRelationsIterator(model, preOrder, postOrder) {
        return new MappingRelationsIterator(preOrder, postOrder).traverse(this.Mapping, model);
    }

}


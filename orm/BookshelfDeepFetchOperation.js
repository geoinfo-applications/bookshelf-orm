"use strict";

const BookshelfDeepOperation = require("./BookshelfDeepOperation");
const MappingRelationsIterator = require("./MappingRelationsIterator");
const { required } = require("./Annotations");


class BookshelfDeepFetchOperation extends BookshelfDeepOperation {

    constructor(mapping, options = required("options")) {
        super(mapping, options);
    }

    fetch(model, fetchOptions = required("fetchOptions")) {
        return model.fetch(fetchOptions)
            .then((model) => this.stripEmptyRelations(model));
    }

    stripEmptyRelations(model) {
        return this.mappingRelationsIterator(model, null, this.stripRelationIfEmpty);
    }

    stripRelationIfEmpty(relatedNode, node, key) {
        if (Object.keys(relatedNode.attributes).length === 0) {
            delete node.relations[key];
        }
    }

    mappingRelationsIterator(model, preOrder, postOrder) {
        return new MappingRelationsIterator(preOrder, postOrder).traverse(this.Mapping, model);
    }

}

module.exports = BookshelfDeepFetchOperation;

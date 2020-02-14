"use strict";

import BookshelfMapping from "./BookshelfMapping";


type CallbackType = ((relatedNode, node, key?: string) => void) | null;

export default class MappingRelationsIterator {

    private readonly preOrder: CallbackType;
    private readonly postOrder: CallbackType;

    public constructor(preOrder: CallbackType = null, postOrder: CallbackType = null) {
        this.preOrder = preOrder;
        this.postOrder = postOrder;
    }

    public traverse(mapping: BookshelfMapping, node) {
        if (node) {
            if (node.models) {
                node.models.forEach(this.traverse.bind(this, mapping));
            } else {
                this.callPreOrder(mapping, node);
                this.traverseRelations(mapping, node);
            }
        }

        return node;
    }

    private callPreOrder(mapping: BookshelfMapping, node) {
        if (this.preOrder) {
            this.preOrder(mapping, node);
        }
    }

    private traverseRelations(mapping, node) {
        if (mapping.relations && node.relations) {
            mapping.relations.forEach(this.traverseRelation.bind(this, node));
        }
    }

    private traverseRelation(node, relation) {
        const key = `relation_${relation.name}`;
        const relatedNode = node.relations[key];

        if (relatedNode) {
            if (relatedNode.models) {
                relatedNode.models.forEach(this.traverse.bind(this, relation.references.mapping));
            } else {
                this.traverse(relation.references.mapping, relatedNode);
                this.callPostOrder(relatedNode, node, key);
            }
        }
    }

    private callPostOrder(relatedNode, node, key: string) {
        if (this.postOrder) {
            this.postOrder(relatedNode, node, key);
        }
    }

}


"use strict";


class MappingRelationsIterator {

    constructor(preOrder, postOrder) {
        this.preOrder = preOrder;
        this.postOrder = postOrder;
    }

    traverse(mapping, node) {
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

    callPreOrder(mapping, node) {
        if (this.preOrder) {
            this.preOrder(mapping, node);
        }
    }

    traverseRelations(mapping, node) {
        if (mapping.relations && node.relations) {
            mapping.relations.forEach(this.traverseRelation.bind(this, node));
        }
    }

    traverseRelation(node, relation) {
        const key = "relation_" + relation.name;
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

    callPostOrder(relatedNode, node, key) {
        if (this.postOrder) {
            this.postOrder(relatedNode, node, key);
        }
    }

}

module.exports = MappingRelationsIterator;

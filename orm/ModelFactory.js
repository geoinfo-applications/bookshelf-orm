"use strict";

function ModelFactory(dbContext) {
    this.dbContext = dbContext;
    this.knex = dbContext.knex;
}

ModelFactory.prototype = {

    createModel: function (config) {

        var identifiedBy = config.identifiedBy || "id";
        var prototype = {
            tableName: config.tableName,
            idAttribute: identifiedBy
        };

        if (config.relations) {
            config.relations.forEach(this.addRelation.bind(this, prototype));
        }

        var Model = this.dbContext.Model.extend(prototype);
        var Collection = this.dbContext.Collection.extend({ model: Model });

        return {
            Model: Model,
            Collection: Collection,

            relations: config.relations,
            columns: config.columns,
            discriminator: config.discriminator,
            identifiedBy: identifiedBy,
            startTransaction: this.dbContext.transaction.bind(this.dbContext)
        };

    },

    addRelation: function (prototype, relation) {
        var fkName = relation.references.mappedBy = relation.references.mappedBy || relation.name + "_id";

        prototype["relation_" + relation.name] = function () {
            if (!(relation.type in this)) {
                throw new Error("Relation of type '" + relation.type + "' doesn't exist");
            }

            return this[relation.type](relation.references.mapping.Model, fkName);
        };
    }

};

module.exports = {
    context: {},
    registerContext: function (name, context) {
        this.context[name] = new ModelFactory(context);
    }
};

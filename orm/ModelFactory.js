"use strict";

function ModelFactory(dbContext) {
    this.dbContext = dbContext;
    this.knex = dbContext.knex;
}

ModelFactory.prototype = {

    createModel: function (config) {
        var dbContext = this.dbContext;
        var identifiedBy = config.identifiedBy || "id";
        var sqlColumns = config.columns ? config.columns.filter(c => c.type === "sql") : [];
        var columns = config.columns ? config.columns.filter(c => c.type !== "sql") : [];

        var prototype = {
            tableName: config.tableName,
            idAttribute: identifiedBy,

            constructor: function () {
                dbContext.Model.apply(this, arguments);
                this.on("fetched", (item, attributes, options) => fetchSqlColumns(item, options));
                this.on("saved", (item, attributes, options) => saveSqlColumns(item, options));
            }
        };

        function fetchSqlColumns(item, options) {
            var readableColumns = sqlColumns.filter(c => c.get);

            if (readableColumns.length === 0) {
                return item;
            }

            var query = createQuery(item, options);
            return query.select(readableColumns.map(column => {
                var getter = typeof column.get === "function" ? column.get() : column.get;
                return dbContext.knex.raw(getter + " as " + column.name);
            })).then(result => {
                readableColumns.forEach(column => item.set(column.name, result[0][column.name]));
            }).then(() => item);
        }

        function saveSqlColumns(item, options) {
            var writableColumns = sqlColumns.filter(c => c.set);

            if (writableColumns.length === 0) {
                return item;
            }

            var query = createQuery(item, options);
            writableColumns.forEach(column => {
                var setter = typeof column.set === "function" ? column.set(item.get(column.name)) : column.set;
                query.update(column.name, dbContext.knex.raw(setter));
            });

            return query.then(() => item);
        }

        function createQuery(item, options) {
            var query = dbContext.knex(config.tableName).where(identifiedBy, item.get(identifiedBy));

            if (config.discriminator) {
                query.andWhere(config.discriminator);
            }

            // todo: transacting
            if (options.transacting) {
                query.transacting(options.transacting);
            }

            return query;
        }

        if (config.relations) {
            config.relations.forEach(this.addRelation.bind(this, prototype));
        }

        var Model = dbContext.Model.extend(prototype);
        var Collection = dbContext.Collection.extend({
            model: Model,
            constructor: function () {
                dbContext.Collection.apply(this, arguments);
                this.on("fetched", (collection, resp, options) => {
                    return collection.mapThen(item => fetchSqlColumns(item, options)).then(() => collection);
                });
            }
        });

        return {
            Model: Model,
            Collection: Collection,

            relations: config.relations,
            columns: columns,
            discriminator: config.discriminator,
            identifiedBy: identifiedBy,
            startTransaction: dbContext.transaction.bind(dbContext)
        };

    },

    addRelation: function (prototype, relation) {
        var relationName = this.toUnderscoreSpace(relation.name);
        var fkName = relation.references.mappedBy = relation.references.mappedBy || relationName + "_id";

        prototype["relation_" + relation.name] = function () {
            if (!(relation.type in this)) {
                throw new Error("Relation of type '" + relation.type + "' doesn't exist");
            }

            return this[relation.type](relation.references.mapping.Model, fkName);
        };
    },

    toUnderscoreSpace: function (string) {
        return string.replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase();
    }

};

module.exports = {
    context: {},
    registerContext: function (name, context) {
        this.context[name] = new ModelFactory(context);
    }
};

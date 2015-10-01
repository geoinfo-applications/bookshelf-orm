"use strict";

class BookshelfModel {

    constructor(dbContext, config) {
        this.dbContext = dbContext;
        this.tableName = config.tableName;
        this.identifiedBy = BookshelfModel.getOptionOrDefault(config.identifiedBy, "id");
        this.relations = BookshelfModel.getOptionOrDefault(config.relations, []);
        this.columns = BookshelfModel.getOptionOrDefault(config.columns, []);
        this.discriminator = config.discriminator;
        this.Model = this.createModel();
        this.Collection = this.createCollection();
        this.startTransaction = dbContext.transaction.bind(dbContext);
    }

    static getOptionOrDefault(configProperty, defaultValue) {
        return configProperty || defaultValue;
    }

    get sqlColumns() {
        return this.columns.filter(c => c.type === "sql");
    }

    createModel() {
        var self = this;

        var prototype = {
            tableName: this.tableName,
            idAttribute: this.identifiedBy,

            constructor: function () {
                self.dbContext.Model.apply(this, arguments);
                this.on("fetched", (item, attributes, options) => self.fetchSqlColumns(self.sqlColumns, item, options));
                this.on("saved", (item, attributes, options) => self.saveSqlColumns(self.sqlColumns, item, options));
            }
        };

        this.relations.forEach(this.addRelation.bind(this, prototype));
        return this.dbContext.Model.extend(prototype);
    }

    createCollection() {
        var self = this;

        return this.dbContext.Collection.extend({
            model: this.Model,
            constructor: function () {
                self.dbContext.Collection.apply(this, arguments);
                this.on("fetched", (collection, resp, options) => {
                    return collection.mapThen(item => self.fetchSqlColumns(self.sqlColumns, item, options)).then(() => collection);
                });
            }
        });
    }

    addRelation(prototype, relation) {
        var relationName = BookshelfModel.toUnderscoreSpace(relation.name);
        var fkName = relation.references.mappedBy = relation.references.mappedBy || relationName + "_id";

        prototype["relation_" + relation.name] = function () {
            if (!(relation.type in this)) {
                throw new Error("Relation of type '" + relation.type + "' doesn't exist");
            }

            return this[relation.type](relation.references.mapping.Model, fkName);
        };
    }

    static toUnderscoreSpace(string) {
        return string.replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase();
    }

    fetchSqlColumns(sqlColumns, item, options) {
        var readableColumns = sqlColumns.filter(c => c.get);

        if (readableColumns.length === 0) {
            return item;
        }

        var query = this.createQuery(item, options);
        return query.select(readableColumns.map(column => {
            var getter = typeof column.get === "function" ? column.get() : column.get;
            return this.dbContext.knex.raw(getter + " as " + column.name);
        })).then(result => {
            readableColumns.forEach(column => item.set(column.name, result[0][column.name]));
        }).then(() => item);
    }

    saveSqlColumns(sqlColumns, item, options) {
        var writableColumns = sqlColumns.filter(c => c.set);

        if (writableColumns.length === 0) {
            return item;
        }

        var query = this.createQuery(item, options);
        writableColumns.forEach(column => {
            var setter = typeof column.set === "function" ? column.set(item.get(column.name)) : column.set;
            query.update(column.name, this.dbContext.knex.raw(setter));
        });

        return query.then(() => item);
    }

    createQuery(item, options) {
        var query = this.dbContext.knex(this.tableName).where(this.identifiedBy, item.get(this.identifiedBy));

        if (this.discriminator) {
            query.andWhere(this.discriminator);
        }

        // todo: transacting
        if (options.transacting) {
            query.transacting(options.transacting);
        }

        return query;
    }

}

module.exports = BookshelfModel;
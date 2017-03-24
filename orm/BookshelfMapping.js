"use strict";

/**
 * Describes a DB Mapping
 * @property {string} tableName - Fully qualified name of DB Table
 * @property {string} [identifiedBy = "id"] - Primary key column
 * @property {Array<String | ColumnDescriptor>} [columns] - columns to fetch. 'underscore_space' will be converted to 'lowerCamelCase' in Entity
 * @property {Object | Function} [discriminator] - Fetch only Entities which match a given query, Knex where condition
 * @property {Array<RelationDescriptor>} [relations] - Managed relations of this Entity.
 *                                                     There will be a getter and setter for n:1 relations
 *                                                     There will be a getter and modifiers ("add"/"remove" + relation.name) for m:n relations
 */
class BookshelfMapping {

    constructor(dbContext, config) {
        this.dbContext = dbContext;
        this.tableName = config.tableName;
        this.identifiedBy = BookshelfMapping.getOptionOrDefault(config.identifiedBy, "id");
        this.relations = BookshelfMapping.getOptionOrDefault(config.relations, []);
        this.relationNames = BookshelfMapping.getOptionOrDefault(this.relations, []).map((r) => r.name);
        this.columns = BookshelfMapping.getOptionOrDefault(config.columns, []);
        this.discriminator = config.discriminator;
        this.Model = this.createModel();
        this.Collection = this.createCollection();
        this.startTransaction = dbContext.transaction.bind(dbContext);

        this.columnMappings = this.columns.map((column) => typeof column === "string" ? { name: column } : column);
        this.columnNames = this.columnMappings.map((column) => column.name);
        this.regularColumns = this.columnMappings.filter((c) => c.type !== "sql");
        this.regularColumnNames = this.regularColumns.map((column) => column.name);
        this.sqlColumns = this.columnMappings.filter((c) => c.type === "sql");
        this.writeableSqlColumns = this.sqlColumns.filter((c) => c.set);
        this.readableSqlColumns = this.sqlColumns.filter((c) => c.get);
    }

    static getOptionOrDefault(configProperty, defaultValue) {
        return configProperty || defaultValue;
    }

    createModel() {
        var prototype = {
            tableName: this.tableName,
            idAttribute: this.identifiedBy
        };

        this.relations.forEach(this.addRelation.bind(this, prototype));
        return this.dbContext.Model.extend(prototype);
    }

    createCollection() {
        return this.dbContext.Collection.extend({ model: this.Model });
    }

    addRelation(prototype, relation) {
        var relationName = BookshelfMapping.toUnderscoreSpace(relation.name);
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

    createQuery(item, options) {
        var query = this.dbContext.knex(this.tableName).where(this.identifiedBy, item.get(this.identifiedBy));

        if (this.discriminator) {
            query.andWhere(this.discriminator);
        }

        if (options && options.transacting) {
            query.transacting(options.transacting);
        }

        return query;
    }

}

module.exports = BookshelfMapping;

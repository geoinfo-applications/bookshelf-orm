"use strict";

const StringUtils = require("./StringUtils");
const { required } = require("./Annotations");


/**
 * Describes a DB Mapping
 *
 * @property {string} tableName - Fully qualified name of DB Table
 * @property {string} [identifiedBy = "id"] - Primary key column
 * @property {Array<String | ColumnDescriptor>} [columns] - columns to fetch. 'underscore_space' will be converted to 'lowerCamelCase' in Entity
 * @property {Object | Function} [discriminator] - Fetch only Entities which match a given query, Knex where condition
 * @property {Object} [onDelete] - Execute instead of regular delete statement, Knex update statement
 *
 * @property {Boolean} [keepHistory = false] - Keep an History History in this table. New states are appended instead of updated.
 *                    Columns 'revision_id' and 'parent_id' will be added to mapping, thus requires these columns in DB.
 *                    'revision_id' must have a unique default value, is the Primary Key at best.
 *                    'identifiedBy' must not be the Primary Key, since many revisions with the same ID can exist.
 *
 * @property {Boolean} [historyColumns = { revisionId: "revision_id", parentId: "parent_id" }] - Configure alias for history columns
 *
 * @property {Array<RelationDescriptor>} [relations] - Managed relations of this Entity.
 *                    There will be a getter and setter for n:1 relations
 *                    There will be a getter and modifiers ("add"/"remove" + relation.name) for m:n relations
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
        this.onDelete = config.onDelete;
        this.keepHistory = BookshelfMapping.getOptionOrDefault(config.keepHistory, false);
        this.historyColumns = BookshelfMapping.getOptionOrDefault(config.historyColumns, { revisionId: "revision_id", parentId: "parent_id" });

        this.configureHistory();

        this.Model = this.createModel();
        this.Collection = this.createCollection();
        this.startTransaction = dbContext.transaction.bind(dbContext);

        this.deriveColumnAccessors();
        this.provideForeignKeyColumnsToRelatedMappings(this.relations);
    }

    static getOptionOrDefault(configProperty, defaultValue) {
        return configProperty || defaultValue;
    }

    configureHistory() {
        if (this.keepHistory) {
            this.discriminator = this.addHistoryDiscriminator();

            const columns = new Set(this.columns).add(this.historyColumns.revisionId).add(this.historyColumns.parentId);
            this.columns = [...columns];
        }
    }

    addHistoryDiscriminator() {
        const discriminator = this.discriminator;
        const { revisionId, parentId } = this.historyColumns;

        return (q) => {
            q.whereNotIn(revisionId, (q) => q.from(this.tableName).whereNotNull(parentId).andWhere(discriminator).select(parentId));
            q.andWhere(discriminator);
        };
    }

    deriveColumnAccessors() {
        this.columnMappings = this.columns.map((column) => typeof column === "string" ? { name: column } : column);
        this.columnNames = this.columnMappings.map((column) => column.name);
        this.regularColumns = this.columnMappings.filter((c) => c.type !== "sql");
        this.regularColumnNames = this.regularColumns.map((column) => column.name);
        this.sqlColumns = this.columnMappings.filter((c) => c.type === "sql");
        this.writeableSqlColumns = this.sqlColumns.filter((c) => c.set);
        this.readableSqlColumns = this.sqlColumns.filter((c) => c.get);

        this.qualifiedRegularColumnNames = this.relations
            .filter((r) => r.type === "belongsTo")
            .map((r) => r.references.mappedBy)
            .concat(this.regularColumnNames)
            .map((name) => `${this.tableName}.${name}`);
    }

    provideForeignKeyColumnsToRelatedMappings() {
        this.relations.filter((r) => r.type === "hasMany" || r.type === "hasOne").forEach((r) => {
            r.references.mapping.qualifiedRegularColumnNames.push(r.references.mappedBy);
        });
    }

    createModel() {
        const prototype = {
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
        const relationName = StringUtils.camelToSnakeCase(relation.name);
        const fkName = relation.references.mappedBy = relation.references.mappedBy || relationName + "_id";

        prototype["relation_" + relation.name] = function () {
            if (!(relation.type in this)) {
                throw new Error("Relation of type '" + relation.type + "' doesn't exist");
            }

            return this[relation.type](relation.references.mapping.Model, fkName);
        };
    }

    createQuery(item, options = required("options")) {
        // jshint maxcomplexity:false
        const query = this.dbContext.knex(this.tableName);

        if (item) {
            query.where(this.identifiedBy, item.get(this.identifiedBy));
        }

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

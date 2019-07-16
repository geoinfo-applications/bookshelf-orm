"use strict";

const _ = require("underscore");
const StringUtils = require("./StringUtils");
const { required } = require("./Annotations");


class BookshelfRelations {

    constructor(Mapping) {
        this.Mapping = Mapping;
        this.relationNamesDeep = this.getRelationNamesDeep();
        this.withRelatedFetchOptions = this.getWithRelatedFetchOptions();
    }

    getFetchOptions(options = required("options")) {
        const fetchProperties = this.fetchProperties;

        if (options) {
            this.addOptionalFetchOptions(options, fetchProperties);
        }

        this.manageReadableSqlColumns(options, fetchProperties);
        return fetchProperties;
    }

    addOptionalFetchOptions(options, fetchProperties) {
        const optionalOptions = {
            exclude: () => this.applyExcludesToFetchProperties(fetchProperties, options.exclude),
            columns: () => {
                fetchProperties.columns = options.columns;
            },
            transacting: () => fetchProperties.transacting = options.transacting
        };

        Object.keys(optionalOptions).filter((key) => options[key]).forEach((key) => optionalOptions[key]());
    }

    manageReadableSqlColumns(options, fetchProperties) {
        fetchProperties.exclude = options && options.exclude;
        fetchProperties.exclude = _.isArray(fetchProperties.exclude) &&
            fetchProperties.exclude.map((sqlColumnName) => StringUtils.camelToSnakeCase(sqlColumnName));

        fetchProperties.columns = fetchProperties.columns || this.Mapping.qualifiedRegularColumnNames;
        fetchProperties.columns = fetchProperties.columns.map((sqlColumnName) => StringUtils.camelToSnakeCase(sqlColumnName));

        this.addPrimaryKeyIfColumnsAreDefinedInProperties(fetchProperties);
        this.addReadableSqlColumnsToFetchProperties(fetchProperties);
    }

    addPrimaryKeyIfColumnsAreDefinedInProperties(fetchProperties) {
        let primaryKeyColumn = `${this.Mapping.tableName}.${this.Mapping.identifiedBy}`;
        if (!_.contains(fetchProperties.columns, primaryKeyColumn)) {
            fetchProperties.columns.push(primaryKeyColumn);
        }
    }

    addReadableSqlColumnsToFetchProperties(fetchProperties) {
        const selectedReadableSqlColumnNames = this.getSelectedReadableColumnNames(fetchProperties);
        const selectedReadableSqlColumns = selectedReadableSqlColumnNames.map((name) => _.findWhere(this.Mapping.readableSqlColumns, { name }));

        return this.addSqlColumnsToFetchPropertiesColumnsAsSqlQuery(fetchProperties, selectedReadableSqlColumns);
    }

    getSelectedReadableColumnNames(fetchProperties) {
        const defaultSqlReadableColumnNames = this.Mapping.readableSqlColumns.map((sqlColumns) => sqlColumns.name);
        const excludedSqlReadableColumnNames = _.intersection(fetchProperties.exclude, defaultSqlReadableColumnNames);
        const selectedSqlReadableColumnNames = _.intersection(fetchProperties.columns, defaultSqlReadableColumnNames);

        const readableColumnNamesAppearConditions = [
            {
                condition: () =>  _.contains(fetchProperties.exclude, "*"),
                execute: () => []
            }, {
                condition: () =>  excludedSqlReadableColumnNames.length,
                execute: () => _.difference(defaultSqlReadableColumnNames, excludedSqlReadableColumnNames)
            }, {
                condition: () =>  selectedSqlReadableColumnNames.length,
                execute: () => {
                    selectedSqlReadableColumnNames.forEach((sqlColumn) => {
                        let sqlColumnIndex = fetchProperties.columns.indexOf(sqlColumn);
                        fetchProperties.columns.splice(sqlColumnIndex, 1);
                    });
                    return selectedSqlReadableColumnNames;
                }
            }, {
                condition: () =>  true,
                execute: () => defaultSqlReadableColumnNames
            }
        ];

        return _.find(readableColumnNamesAppearConditions, (condition) => condition.condition()).execute();
    }

    addSqlColumnsToFetchPropertiesColumnsAsSqlQuery(fetchProperties, selectedReadableSqlColumns) {
        fetchProperties.columns = fetchProperties.columns.concat(this.getRawColumnSelectStatements(selectedReadableSqlColumns));
    }

    getRawColumnSelectStatements(selectedReadableSqlColumns) {
        return selectedReadableSqlColumns.map((sqlColumn) => {
            let getter = _.isFunction(sqlColumn.get) ? sqlColumn.get() : sqlColumn.get;
            return this.Mapping.dbContext.knex.raw(getter + " as \"" + sqlColumn.name + "\"");
        });
    }

    applyExcludesToFetchProperties(fetchProperties, exclude) {
        if (_.contains(exclude, "*")) {
            fetchProperties.withRelated = [];
            return;
        }

        const wildcardExcludes = exclude.filter((e) => e.endsWith("*"));
        let excludes = _.difference(exclude, wildcardExcludes);
        excludes = this.addWildcardExcludes(excludes, wildcardExcludes);
        excludes = excludes.map(this.renameRelationProperty, this);

        fetchProperties.withRelated = _.reject(fetchProperties.withRelated, (name) => {
            name = _.isObject(name) ? _.keys(name)[0] : name;
            return excludes.some((exclude) => name.indexOf(exclude) === 0);
        });
    }

    addWildcardExcludes(excludes, wildcardExcludes) {
        if (wildcardExcludes.length) {
            wildcardExcludes = wildcardExcludes.map((e) => e.substring(0, e.length - 1));
            wildcardExcludes = this.relationNamesDeep.filter((name) => wildcardExcludes.some((exclude) => name.startsWith(exclude)));
            excludes = _.union(excludes, wildcardExcludes);
        }
        return excludes;
    }

    renameRelationProperty(propertyName) {
        const isRelationName = _.contains(this.relationNamesDeep, propertyName);

        if (isRelationName) {
            return propertyName.split(".").map((name) => "relation_" + name).join(".");
        }

        return propertyName;
    }

    get relationNames() {
        return _.map(this.Mapping.relations, (relation) => relation.name);
    }

    getRelationNamesDeep() {
        function extractName(parent, relation) {
            const name = _.compact([parent, relation.name]).join(".");
            return [name].concat(_.map(relation.references.mapping.relations, _.partial(extractName, name)));
        }

        return _.flatten(_.map(this.Mapping.relations, _.partial(extractName, "")));
    }

    get fetchProperties() {
        return { withRelated: this.withRelatedFetchOptions };
    }

    getWithRelatedFetchOptions() {
        return this.relationNamesDeep.map((relationName) => {
            const relationNamePath = relationName.split(".");
            const prefixedRelationName = relationNamePath.map((name) => "relation_" + name).join(".");
            const mapping = relationNamePath.reduce(BookshelfRelations.lookupReferencedMapping, this.Mapping);
            const mainRelationName = relationNamePath[0];

            const relatedQuery = Object.create(null);
            relatedQuery[prefixedRelationName] = (query) => {
                if (mapping.discriminator && !this.skipDiscriminator(mapping, mainRelationName)) {
                    query.where(mapping.discriminator);
                }
                const regularColumns = mapping.qualifiedRegularColumnNames;
                const sqlColumns = this.getRawColumnSelectStatements(mapping.readableSqlColumns);
                const columns = regularColumns.concat(sqlColumns);

                query.select(columns);
            };

            return relatedQuery;
        });
    }

    static lookupReferencedMapping(mapping, name) {
        return BookshelfRelations.lookupReference(mapping, name).references.mapping;
    }

    static lookupReference(mapping, name) {
        return mapping.relations.find((relation) => relation.name === name);
    }

    skipDiscriminator(referencedMapping, relationName) {
        const lookupReference = BookshelfRelations.lookupReference(this.Mapping, relationName);
        return lookupReference && lookupReference.references.identifies && lookupReference.references.identifies !== referencedMapping.identifiedBy;
    }
}

module.exports = BookshelfRelations;

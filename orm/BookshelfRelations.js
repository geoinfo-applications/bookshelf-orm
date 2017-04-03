"use strict";

const _ = require("underscore");
const StringUtils = require("./StringUtils");


class BookshelfRelations {

    constructor(Mapping) {
        this.Mapping = Mapping;
        this.relationNamesDeep = this.getRelationNamesDeep();
        this.withRelatedFetchOptions = this.getWithRelatedFetchOptions();
    }

    getFetchOptions(options) {
        var fetchProperties = this.fetchProperties;

        if (options) {
            this.addOptionalFetchOptions(options, fetchProperties);
        }

        this.manageReadableSqlColumns(options, fetchProperties);
        return fetchProperties;
    }

    addOptionalFetchOptions(options, fetchProperties) {
        var optionalOptions = {
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
        let selectedReadableSqlColumnNames = this.getSelectedReadableColumnNames(fetchProperties);
        var selectedReadableSqlColumns = selectedReadableSqlColumnNames.map((name) => _.findWhere(this.Mapping.readableSqlColumns, { name }))

        return this.addSqlColumnsToFetchPropertiesColumnsAsSqlQuery(fetchProperties, selectedReadableSqlColumns);
    }

    getSelectedReadableColumnNames(fetchProperties) {

        let defaultSqlReadableColumnNames = this.Mapping.readableSqlColumns.map((sqlColumns) => sqlColumns.name);
        let excludedSqlReadableColumnNames = _.intersection(fetchProperties.exclude, defaultSqlReadableColumnNames);
        let selectedSqlReadableColumnNames = _.intersection(fetchProperties.columns, defaultSqlReadableColumnNames);

        let readableColumnNamesAppearConditions = [
            {
                condition: _.contains(fetchProperties.exclude, "*"),
                execute: () => []
            }, {
                condition: excludedSqlReadableColumnNames.length,
                execute: () => _.difference(defaultSqlReadableColumnNames, excludedSqlReadableColumnNames)
            }, {
                condition: selectedSqlReadableColumnNames.length,
                execute: () => {
                    selectedSqlReadableColumnNames.forEach((sqlColumn) => {
                        let sqlColumnIndex = fetchProperties.columns.indexOf(sqlColumn);
                        fetchProperties.columns.splice(sqlColumnIndex, 1);
                    });
                    return selectedSqlReadableColumnNames;
                }
            }, {
                condition: true,
                execute: () => defaultSqlReadableColumnNames
            }
        ];

        return _.find(readableColumnNamesAppearConditions, (condition) => condition.condition).execute();
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

        var wildcardExcludes = exclude.filter((e) => e.endsWith("*"));
        var excludes = _.difference(exclude, wildcardExcludes);
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
        var isRelationName = _.contains(this.relationNamesDeep, propertyName);

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
            var name = _.compact([parent, relation.name]).join(".");
            return [name].concat(_.map(relation.references.mapping.relations, _.partial(extractName, name)));
        }

        return _.flatten(_.map(this.Mapping.relations, _.partial(extractName, "")));
    }

    get fetchProperties() {
        return { withRelated: this.withRelatedFetchOptions };
    }

    getWithRelatedFetchOptions() {
        return this.relationNamesDeep.map((relationName) => {
            var relationNamePath = relationName.split(".");
            var prefixedRelationName = relationNamePath.map((name) => "relation_" + name).join(".");
            var mapping = relationNamePath.reduce(this.lookupReferencedMapping, this.Mapping);


            var relatedQuery = Object.create(null);
            relatedQuery[prefixedRelationName] = (query) => {
                if (mapping.discriminator) {
                    query.where(mapping.discriminator);
                }

                query.select(this.getRawColumnSelectStatements(mapping.readableSqlColumns).concat("*"));
            };

            return relatedQuery;
        });
    }

    lookupReferencedMapping(mapping, name) {
        return _.findWhere(mapping.relations, { name: name }).references.mapping;
    }

}

module.exports = BookshelfRelations;

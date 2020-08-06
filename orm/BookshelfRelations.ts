"use strict";

import _ from "underscore";
import StringUtils from "./StringUtils";
import BookshelfMapping from "./BookshelfMapping";
import { required } from "./Annotations";
import IEntityRepositoryOptions from "./IEntityRepositoryOptions";
import { IReadableSqlColumnDescriptor } from "./typedef/IColumnDescriptor";


export default class BookshelfRelations {

    private readonly Mapping: BookshelfMapping;
    private readonly relationNamesDeep: string[];
    private readonly withRelatedFetchOptions: Array<{ [prop: string]: () => void }>;

    public constructor(Mapping: BookshelfMapping) {
        this.Mapping = Mapping;
        this.relationNamesDeep = this.getRelationNamesDeep();
        this.withRelatedFetchOptions = this.getWithRelatedFetchOptions();
    }

    public getFetchOptions(options: IEntityRepositoryOptions = required("options")): IEntityRepositoryOptions {
        const fetchProperties = this.fetchProperties;

        if (options) {
            this.addOptionalFetchOptions(options, fetchProperties);
        }

        this.manageReadableSqlColumns(options, fetchProperties);
        return fetchProperties;
    }

    private addOptionalFetchOptions(options: IEntityRepositoryOptions, fetchProperties) {
        const optionalOptions = {
            exclude: () => this.applyExcludesToFetchProperties(fetchProperties, options!.exclude),
            columns: () => {
                fetchProperties.columns = options!.columns;
            },
            transacting: () => fetchProperties.transacting = options!.transacting,
            debug: () => fetchProperties.debug = options!.debug
        };

        Object.keys(optionalOptions).filter((key) => options![key]).forEach((key) => optionalOptions[key]());
    }

    private manageReadableSqlColumns(options: IEntityRepositoryOptions, fetchProperties) {
        fetchProperties.exclude = options && options.exclude;
        fetchProperties.exclude = _.isArray(fetchProperties.exclude) &&
            fetchProperties.exclude.map((sqlColumnName) => StringUtils.camelToSnakeCase(sqlColumnName));

        fetchProperties.columns = fetchProperties.columns || this.Mapping.qualifiedRegularColumnNames;
        fetchProperties.columns = fetchProperties.columns.map((sqlColumnName) => StringUtils.camelToSnakeCase(sqlColumnName));

        this.addPrimaryKeyIfColumnsAreDefinedInProperties(fetchProperties);
        this.addReadableSqlColumnsToFetchProperties(fetchProperties);
    }

    private addPrimaryKeyIfColumnsAreDefinedInProperties(fetchProperties) {
        const primaryKeyColumn = `${this.Mapping.tableName}.${this.Mapping.identifiedBy}`;
        if (!_.contains(fetchProperties.columns, primaryKeyColumn)) {
            fetchProperties.columns.push(primaryKeyColumn);
        }
    }

    private addReadableSqlColumnsToFetchProperties(fetchProperties) {
        const selectedReadableSqlColumnNames = this.getSelectedReadableColumnNames(fetchProperties);
        const selectedReadableSqlColumns = selectedReadableSqlColumnNames.map((name) => _.findWhere(this.Mapping.readableSqlColumns, { name }));

        return this.addSqlColumnsToFetchPropertiesColumnsAsSqlQuery(fetchProperties, selectedReadableSqlColumns);
    }

    private getSelectedReadableColumnNames(fetchProperties) {
        const defaultSqlReadableColumnNames = this.Mapping.readableSqlColumns.map((sqlColumns) => sqlColumns.name);
        const excludedSqlReadableColumnNames = _.intersection(fetchProperties.exclude, defaultSqlReadableColumnNames);
        const selectedSqlReadableColumnNames = _.intersection(fetchProperties.columns, defaultSqlReadableColumnNames);

        const readableColumnNamesAppearConditions = [
            {
                condition: () => _.contains(fetchProperties.exclude, "*"),
                execute: () => []
            }, {
                condition: () => excludedSqlReadableColumnNames.length,
                execute: () => _.difference(defaultSqlReadableColumnNames, excludedSqlReadableColumnNames)
            }, {
                condition: () => selectedSqlReadableColumnNames.length,
                execute: () => {
                    selectedSqlReadableColumnNames.forEach((sqlColumn) => {
                        const sqlColumnIndex = fetchProperties.columns.indexOf(sqlColumn);
                        fetchProperties.columns.splice(sqlColumnIndex, 1);
                    });
                    return selectedSqlReadableColumnNames;
                }
            }, {
                condition: () => true,
                execute: () => defaultSqlReadableColumnNames
            }
        ];

        return readableColumnNamesAppearConditions.find(
            (condition) => condition.condition()
        )!.execute();
    }

    private addSqlColumnsToFetchPropertiesColumnsAsSqlQuery(fetchProperties, selectedReadableSqlColumns) {
        fetchProperties.columns = fetchProperties.columns.concat(this.getRawColumnSelectStatements(selectedReadableSqlColumns));
    }

    private getRawColumnSelectStatements(selectedReadableSqlColumns) {
        return selectedReadableSqlColumns.map((sqlColumn: IReadableSqlColumnDescriptor) => {
            const getter = _.isFunction(sqlColumn.get) ? sqlColumn.get(this.Mapping.dbContext.knex as any) : sqlColumn.get;
            return this.Mapping.dbContext.knex.raw(`${getter} as "${sqlColumn.name}"`);
        });
    }

    private applyExcludesToFetchProperties(fetchProperties, exclude) {
        if (_.contains(exclude, "*")) {
            fetchProperties.withRelated = [];
            return;
        }

        const wildcardExcludes = exclude.filter((e) => e.endsWith("*"));
        let excludes: string[] = _.difference(exclude, wildcardExcludes);
        excludes = this.addWildcardExcludes(excludes, wildcardExcludes);
        excludes = excludes.map(this.renameRelationProperty, this);

        fetchProperties.withRelated = _.reject(fetchProperties.withRelated, (name: string) => {
            name = _.isObject(name) ? _.keys(name)[0] : name;
            return excludes.some((exclude) => name.indexOf(exclude) === 0);
        });
    }

    private addWildcardExcludes(excludes, wildcardExcludes) {
        if (wildcardExcludes.length) {
            wildcardExcludes = wildcardExcludes.map((e) => e.substring(0, e.length - 1));
            wildcardExcludes = this.relationNamesDeep.filter((name) => wildcardExcludes.some((exclude) => name.startsWith(exclude)));
            excludes = _.union(excludes, wildcardExcludes);
        }
        return excludes;
    }

    private renameRelationProperty(propertyName) {
        const isRelationName = _.contains(this.relationNamesDeep, propertyName);

        if (isRelationName) {
            return propertyName.split(".").map((name) => "relation_" + name).join(".");
        }

        return propertyName;
    }

    public get relationNames() {
        return _.map(this.Mapping.relations, (relation) => relation.name);
    }

    private getRelationNamesDeep() {
        function extractName(parent, relation) {
            const name = _.compact([parent, relation.name]).join(".");
            return [name].concat(_.map(relation.references.mapping.relations, _.partial(extractName, name)));
        }

        return _.flatten(_.map(this.Mapping.relations, _.partial(extractName, "")));
    }

    private get fetchProperties(): IEntityRepositoryOptions {
        return { withRelated: this.withRelatedFetchOptions };
    }

    private getWithRelatedFetchOptions(): Array<{ [prop: string]: () => void }> {
        return this.relationNamesDeep.map((relationName) => {
            const relationNamePath = relationName.split(".");
            const prefixedRelationName = relationNamePath.map((name) => `relation_${name}`).join(".");
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

    private static lookupReferencedMapping(mapping, name) {
        return BookshelfRelations.lookupReference(mapping, name).references.mapping;
    }

    private static lookupReference(mapping, name) {
        return mapping.relations.find((relation) => relation.name === name);
    }

    private skipDiscriminator(referencedMapping, relationName) {
        const lookupReference = BookshelfRelations.lookupReference(this.Mapping, relationName);
        return lookupReference && lookupReference.references.identifies && lookupReference.references.identifies !== referencedMapping.identifiedBy;
    }
}


"use strict";

var _ = require("underscore");


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

        return fetchProperties;
    }

    addOptionalFetchOptions(options, fetchProperties) {
        var optionalOptions = {
            exclude: () => this.applyExcludesToFetchProperties(fetchProperties, options.exclude),
            columns: () => fetchProperties.columns = options.columns,
            transacting: () => fetchProperties.transacting = options.transacting
        };

        fetchProperties.exclude = options.exclude;
        fetchProperties.columns = fetchProperties.columns || this.Mapping.regularColumnNames;

        Object.keys(optionalOptions).filter((key) => options[key]).forEach((key) => optionalOptions[key]());
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

            if (mapping.discriminator) {
                var relatedQuery = Object.create(null);
                relatedQuery[prefixedRelationName] = (query) => query.where(mapping.discriminator);
                return relatedQuery;
            } else {
                return prefixedRelationName;
            }
        });
    }

    lookupReferencedMapping(mapping, name) {
        return _.findWhere(mapping.relations, { name: name }).references.mapping;
    }

}

module.exports = BookshelfRelations;

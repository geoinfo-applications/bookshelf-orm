"use strict";

var _ = require("underscore");


class BookshelfRelations {

    constructor(Mapping) {
        this.Mapping = Mapping;
        this.relationNamesDeep = this.getRelationNamesDeep();
        this.relationNamesDeepWithPrefixes = this.getRelationNamesDeepWithPrefixes();
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
            transacting: () => options.transacting
        };

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

        fetchProperties.withRelated = _.reject(fetchProperties.withRelated, (name) => excludes.some((exclude) => name.indexOf(exclude) === 0));
    }

    addWildcardExcludes(excludes, wildcardExcludes) {
        if (wildcardExcludes.length) {
            wildcardExcludes = wildcardExcludes.map((e) => e.substring(0, e.length - 1));
            wildcardExcludes = this.relationNamesDeep.filter((name) => wildcardExcludes.some((exclude) => {
                return name.startsWith(exclude);
            }));
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

    getRelationNamesDeepWithPrefixes() {
        return this.relationNamesDeep.map((relationName) => relationName.split(".").map((name) => "relation_" + name).join("."));
    }

    get fetchProperties() {
        return { withRelated: this.relationNamesDeepWithPrefixes };
    }

}

module.exports = BookshelfRelations;

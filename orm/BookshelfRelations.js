"use strict";

var _ = require("underscore");


class BookshelfRelations {

    constructor(Mapping) {
        this.Mapping = Mapping;
    }

    getFetchOptions(options) {
        var fetchProperties = this.fetchProperties;

        if (options && options.exclude) {
            this.applyExcludesToFetchProperties(fetchProperties, options.exclude);
        }

        return fetchProperties;
    }

    applyExcludesToFetchProperties(fetchProperties, exclude) {
        var excludes = exclude.map(this.renameRelationProperty, this);

        fetchProperties.withRelated = fetchProperties.withRelated.filter(property => {
            return !excludes.some(exclude => property.indexOf(exclude) === 0);
        });
    }

    renameRelationProperty(propertyName) {
        var isRelationName = _.contains(this.relationNamesDeep, propertyName);

        if (isRelationName) {
            return propertyName.split(".").map(function (namePart) {
                return "relation_" + namePart;
            }).join(".");
        }

        return propertyName;
    }

    get relationNames() {
        return _.map(this.Mapping.relations, relation => relation.name);
    }

    get relationNamesDeep() {
        function extractName(parent, relation) {
            var name = _.compact([parent, relation.name]).join(".");
            return [name].concat(_.map(relation.references.mapping.relations, _.partial(extractName, name)));
        }

        return _.flatten(_.map(this.Mapping.relations, _.partial(extractName, "")));
    }

    get relationNamesDeepWithPrefixes() {
        return this.relationNamesDeep.map(function (relationName) {
            return relationName.split(".").map(function (name) {
                return "relation_" + name;
            }).join(".");
        });
    }

    get fetchProperties() {
        return { withRelated: this.relationNamesDeepWithPrefixes };
    }

}

module.exports = BookshelfRelations;

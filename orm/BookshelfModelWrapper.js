"use strict";

var _ = require("underscore");
var BookshelfModelRelation = require("./BookshelfModelRelation");


function BookshelfModelWrapper(Mapping, Entity) {
    this.Mapping = Mapping;
    this.Entity = Entity || Object;
}

BookshelfModelWrapper.prototype = {

    wrap: function (item, entityConstructorArguments) {
        return item && (this.wrapCollectionTypes(item) || this.createWrappedInstance(item, entityConstructorArguments));
    },

    wrapCollectionTypes: function (item) {
        if (Array.isArray(item)) {
            return item.map(this.wrap, this);
        } else if (item instanceof this.Mapping.Collection) {
            return this.wrap(item.models);
        }
    },

    createWrappedInstance: function (item, entityConstructorArguments) {
        var wrapped = Object.create(this.Entity.prototype);

        Object.defineProperty(wrapped, "item", {

            get: function () {
                return item;
            }

        });

        this.defineProperties(wrapped, item);
        this.Entity.apply(wrapped, [].concat(entityConstructorArguments));

        return wrapped;
    },

    defineProperties: function (wrapped, item) {
        this.defineColumnProperties(wrapped, item);
        this.defineRelationalProperties(wrapped, item);
    },

    get columnMappings() {
        return _.map(this.Mapping.columns, function (column) {
            return _.isObject(column) ? column : { name: column };
        });
    },

    defineColumnProperties: function (wrapped, item) {
        this.columnMappings.forEach(function (property) {
            Object.defineProperty(wrapped, this.toCamelCase(property.name), {

                get: function () {
                    var value = item.get(property.name);
                    return (property.type === "json" && _.isString(value)) ? JSON.parse(value) : value;
                },

                set: function (value) {
                    if (property.type === "json") {
                        value = JSON.stringify(value);
                    }

                    item.set(property.name, value);
                },

                enumerable: true

            });
        }, this);
    },

    toCamelCase: function (str) {
        return str.split("_").map(function (token, index) {
            return index === 0 ? token : this.firstLetterUp(token);
        }, this).join("");
    },

    firstLetterUp: function (str) {
        return str[0].toUpperCase() + str.substr(1);
    },

    defineRelationalProperties: function (wrapped, item) {
        _.each(this.Mapping.relations, function (relation) {
            var wrapper = new BookshelfModelWrapper(relation.references.mapping, relation.references.type);
            var bookshelfModelRelation = new BookshelfModelRelation(wrapped, item, wrapper, relation);

            wrapped["new" + this.firstLetterUp(relation.name)] = function (model) {
                return wrapper.createNew(model);
            };

            if (relation.type in bookshelfModelRelation) {
                bookshelfModelRelation[relation.type]();
            } else {
                throw new Error("Relation of type '" + relation.type + "' not implemented");
            }

        }, this);
    },

    unwrap: function (entity) {
        if (Array.isArray(entity)) {
            return entity.map(this.unwrap, this);
        }

        this.columnMappings.filter(function (property) {
            return property.type === "json";
        }).forEach(function (property) {
            entity[property.name] = entity[property.name];
        }, this);

        return entity.item;
    },

    createNew: function (flatModel) {
        var relationNames = _.intersection(_.pluck(this.Mapping.relations, "name"), _.keys(flatModel));
        var model = flatModel ? _.omit(flatModel, relationNames) : flatModel;

        var item = this.Mapping.Model.forge();
        var wrapped = this.wrap(item, Array.prototype.slice.call(arguments));

        _.extend(wrapped, model);

        if (flatModel && relationNames) {
            relationNames.forEach(function (relationName) {

                var relatedData = flatModel[relationName];

                if (Array.isArray(relatedData)) {
                    wrapped["add" + this.firstLetterUp(relationName)](relatedData.map(function (data) {
                        return wrapped["new" + this.firstLetterUp(relationName)](data);
                    }, this));
                } else if (relatedData) {
                    wrapped[relationName] = wrapped["new" + this.firstLetterUp(relationName)](relatedData);
                }
            }, this);
        }

        return wrapped;
    }

};

module.exports = BookshelfModelWrapper;

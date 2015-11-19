"use strict";

var _ = require("underscore");
var BookshelfModelRelation = require("./BookshelfModelRelation");


class BookshelfModelWrapper {

    constructor(Mapping, Entity) {
        this.Mapping = Mapping;
        this.Entity = Entity || Object;
    }

    wrap(item, entityConstructorArguments) {
        return item && (this.wrapCollectionTypes(item) || this.createWrappedInstance(item, entityConstructorArguments));
    }

    wrapCollectionTypes(item) {
        if (Array.isArray(item)) {
            return item.map(this.wrap, this);
        } else if (item instanceof this.Mapping.Collection) {
            return this.wrap(item.models);
        }
    }

    createWrappedInstance(item, entityConstructorArguments) {
        entityConstructorArguments = Array.prototype.slice.call(arguments, 1);
        var wrapped = new (Function.prototype.bind.apply(this.Entity, entityConstructorArguments))();
        this.defineProperties(wrapped, item);
        this.addItemGetter(wrapped, item);

        return wrapped;
    }

    addItemGetter(wrapped, item) {
        Object.defineProperty(wrapped, "item", {
            get: () => item
        });
    }

    defineProperties(wrapped, item) {
        this.defineColumnProperties(wrapped, item);
        this.defineRelationalProperties(wrapped, item);
    }

    get columnMappings() {
        return _.map(this.Mapping.columns, (column) => _.isObject(column) ? column : { name: column });
    }

    defineColumnProperties(wrapped, item) {
        this.columnMappings.forEach((property) => {
            Object.defineProperty(wrapped, this.toCamelCase(property.name), {
                get: getter,
                set: setter,
                enumerable: true
            });

            function getter() {
                var value = item.get(property.name);
                return (property.type === "json" && _.isString(value)) ? JSON.parse(value) : value;
            }

            function setter(value) {
                if (property.type === "json") {
                    value = JSON.stringify(value);
                }

                item.set(property.name, value);
            }
        });
    }

    toCamelCase(str) {
        return str.split("_").map((token, index) => (index === 0 ? token : this.firstLetterUp(token))).join("");
    }

    firstLetterUp(str) {
        return str[0].toUpperCase() + str.substr(1);
    }

    defineRelationalProperties(wrapped, item) {
        _.each(this.Mapping.relations, (relation) => {
            var wrapper = new BookshelfModelWrapper(relation.references.mapping, relation.references.type);
            var bookshelfModelRelation = new BookshelfModelRelation(wrapped, item, wrapper, relation);

            wrapped["new" + this.firstLetterUp(relation.name)] = (model) => wrapper.createNew(model);

            if (relation.type in bookshelfModelRelation) {
                bookshelfModelRelation[relation.type]();
            } else {
                throw new Error("Relation of type '" + relation.type + "' not implemented");
            }

        });
    }

    unwrap(entity) {
        if (Array.isArray(entity)) {
            return entity.map(this.unwrap, this);
        }

        this.columnMappings.filter((property) => property.type === "json").forEach((property) => entity[property.name] = entity[property.name]);

        return entity.item;
    }

    createNew(flatModel) {
        var relationNames = _.intersection(_.map(this.Mapping.relations, (r) => r.name), _.keys(flatModel));
        var model = flatModel ? _.omit(flatModel, relationNames) : flatModel;

        var item = this.Mapping.Model.forge();
        var wrapped = this.wrap(item, Array.prototype.slice.call(arguments));

        _.extend(wrapped, _.pick(model, _.map(this.columnMappings, (m) => m.name).map(this.toCamelCase.bind(this))));

        if (flatModel && relationNames) {
            relationNames.forEach((relationName) => {
                var relatedData = flatModel[relationName];
                var pascalCasedName = this.firstLetterUp(relationName);

                if (Array.isArray(relatedData)) {
                    wrapped["add" + pascalCasedName](relatedData.map((data) => {
                        return wrapped["new" + pascalCasedName](data);
                    }));
                } else if (relatedData) {
                    wrapped[relationName] = wrapped["new" + pascalCasedName](relatedData);
                }
            });
        }

        return wrapped;
    }

}

module.exports = BookshelfModelWrapper;

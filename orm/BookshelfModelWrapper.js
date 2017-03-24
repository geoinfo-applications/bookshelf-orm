"use strict";

const _ = require("underscore");
const BookshelfModelRelation = require("./BookshelfModelRelation");
const StringUtils = require("./StringUtils");


class BookshelfModelWrapper {

    constructor(Mapping, Entity) {
        this.Mapping = Mapping;
        this.Entity = Entity || Object;
    }

    get columnMappings() {
        return this.Mapping.columnMappings;
    }

    get columnNames() {
        return this.Mapping.columnNames;
    }

    wrap(item) {
        return item && (this.wrapCollectionTypes(item) || this.createWrappedInstance(item));
    }

    wrapCollectionTypes(item) {
        if (Array.isArray(item)) {
            return item.map(this.wrap, this);
        } else if (item instanceof this.Mapping.Collection) {
            return this.wrap(item.models);
        }
    }

    createWrappedInstance(item) {
        var wrapped = new this.Entity();
        this.addItemGetter(wrapped, item);

        var wrappedPrototype = this.getWrappedPrototype();
        Object.setPrototypeOf(wrapped, wrappedPrototype);
        this.localizeProperties(wrapped, wrappedPrototype);

        return wrapped;
    }

    addItemGetter(wrapped, item) {
        Object.defineProperty(wrapped, "item", {
            get: () => item
        });
    }

    getWrappedPrototype() {
        if (this.wrappedPrototype) {
            return this.wrappedPrototype;
        }

        this.wrappedPrototype = this.createWrappedPrototype();
        this.wrappedPrototypeKeys = Object.keys(this.wrappedPrototype);

        return this.wrappedPrototype;
    }

    createWrappedPrototype() {
        var wrappedPrototype = Object.create(this.Entity.prototype);
        this.defineProperties(wrappedPrototype);

        Object.defineProperty(wrappedPrototype, "toJSON", {
            enumerable: false,
            value() {
                return _.pick(this, Object.keys(this).concat(Object.keys(wrappedPrototype)));
            }
        });

        return wrappedPrototype;
    }

    defineProperties(wrapped) {
        this.defineColumnProperties(wrapped);
        this.defineRelationalProperties(wrapped);
    }

    defineColumnProperties(wrapped) {
        this.columnMappings.forEach((property) => this.defineColumnProperty(wrapped, property));
    }

    defineColumnProperty(wrapped, property) {
        Object.defineProperty(wrapped, StringUtils.snakeToCamelCase(property.name), {
            get() {
                var value = this.item.get(property.name);
                return (property.type === "json" && _.isString(value)) ? JSON.parse(value) : value;
            },
            set(value) {
                if (property.type === "json") {
                    value = JSON.stringify(value);
                }

                this.item.set(property.name, value);
            },
            enumerable: true
        });
    }

    defineRelationalProperties(wrapped) {
        this.Mapping.relations.forEach((relation) => {
            var wrapper = new BookshelfModelWrapper(relation.references.mapping, relation.references.type);
            var bookshelfModelRelation = new BookshelfModelRelation(wrapped, wrapper, relation);

            wrapped["new" + StringUtils.firstLetterUp(relation.name)] = (model) => wrapper.createNew(model);

            if (relation.type in bookshelfModelRelation) {
                bookshelfModelRelation[relation.type]();
            } else {
                throw new Error("Relation of type '" + relation.type + "' not implemented");
            }

        });
    }

    localizeProperties(wrapped, wrappedPrototype) {
        this.wrappedPrototypeKeys.forEach((key) => {
            if (!wrapped.hasOwnProperty(key)) {
                Object.defineProperty(wrapped, key, Object.getOwnPropertyDescriptor(wrappedPrototype, key));
            }
        });
    }

    unwrap(entity) {
        if (Array.isArray(entity)) {
            return entity.map(this.unwrap, this);
        }

        this.columnMappings.filter((property) => property.type === "json").forEach((property) => {
            var propertyName = StringUtils.snakeToCamelCase(property.name);
            entity[propertyName] = entity[propertyName];
        });

        return entity.item;
    }

    createNew(flatModel) {
        var item = this.Mapping.Model.forge();
        var wrapped = this.wrap(item);

        this.applyFlatModel(wrapped, flatModel);

        return wrapped;
    }

    applyFlatModel(wrapped, flatModel) {
        if (flatModel) {
            var relationNames = this.Mapping.relationNames.filter((name) => name in flatModel);

            this.applyFlatModelValues(wrapped, _.omit(flatModel, relationNames));
            this.applyFlatModelRelations(wrapped, flatModel, relationNames);
        }
    }

    applyFlatModelValues(wrapped, model) {
        for (var name of this.columnNames) {
            name = StringUtils.snakeToCamelCase(name);
            if (name in model) {
                wrapped[name] = model[name];
            }
        }
    }

    applyFlatModelRelations(wrapped, model, relationNames) {
        if (!relationNames) {
            return;
        }

        relationNames.forEach((relationName) => {
            var relatedData = model[relationName];
            var pascalCasedName = StringUtils.firstLetterUp(relationName);

            if (Array.isArray(relatedData)) {
                wrapped["add" + pascalCasedName](relatedData.map((data) => {
                    return wrapped["new" + pascalCasedName](data);
                }));
            } else if (relatedData) {
                wrapped[relationName] = wrapped["new" + pascalCasedName](relatedData);
            }
        });
    }

}

module.exports = BookshelfModelWrapper;

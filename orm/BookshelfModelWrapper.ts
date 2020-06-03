"use strict";

import _ from "underscore";
import Bookshelf from "bookshelf";
import BookshelfModelRelation from "./BookshelfModelRelation";
import StringUtils from "./StringUtils";
import BookshelfMapping from "./BookshelfMapping";
import IEntityType from "./typedef/IEntityType";


export default class BookshelfModelWrapper<E extends IEntityType> {

    private readonly Mapping: BookshelfMapping;
    private readonly Entity: () => E;
    private readonly modelMap: WeakMap<object, E>;
    private wrappedPrototype: E;
    private wrappedPrototypeKeys: string[];

    public constructor(Mapping: BookshelfMapping, Entity: () => E) {
        this.Mapping = Mapping;
        this.Entity = Entity || Object;
        this.modelMap = new WeakMap();
    }

    private get columnMappings() {
        return this.Mapping.columnMappings;
    }

    private get columnNames() {
        return this.Mapping.columnNames;
    }

    public wrap(item: Bookshelf.Model<any>) {
        if (this.modelMap.has(item)) {
            return this.modelMap.get(item);
        }

        return item && (this.wrapCollectionTypes(item) || this.createWrappedInstance(item));
    }

    private wrapCollectionTypes(item: object) {
        if (Array.isArray(item)) {
            return item.map(this.wrap, this);
        } else if (item instanceof this.Mapping.Collection) {
            return this.wrap((item as any).models);
        }
    }

    private createWrappedInstance(item: object): E {
        const wrapped = Reflect.construct(this.Entity, []) as E;
        this.addItemGetter(wrapped, item);

        const wrappedPrototype = this.getWrappedPrototype();
        Object.setPrototypeOf(wrapped, wrappedPrototype);
        this.localizeProperties(wrapped, wrappedPrototype);

        this.modelMap.set(item, wrapped);
        return wrapped;
    }

    private addItemGetter(wrapped, item: object) {
        Object.defineProperty(wrapped, "item", {
            get: () => item
        });
    }

    private getWrappedPrototype() {
        if (this.wrappedPrototype) {
            return this.wrappedPrototype;
        }

        this.wrappedPrototype = this.createWrappedPrototype();
        this.wrappedPrototypeKeys = Object.keys(this.wrappedPrototype);

        return this.wrappedPrototype;
    }

    private createWrappedPrototype() {
        const wrappedPrototype = Object.create(this.Entity.prototype);
        this.defineProperties(wrappedPrototype);

        Object.defineProperty(wrappedPrototype, "toJSON", {
            enumerable: false,
            value() {
                return _.pick(this, Object.keys(this).concat(Object.keys(wrappedPrototype)));
            }
        });

        return wrappedPrototype;
    }

    private defineProperties(wrapped) {
        this.defineColumnProperties(wrapped);
        this.defineRelationalProperties(wrapped);
    }

    private defineColumnProperties(wrapped) {
        this.columnMappings.forEach((property) => this.defineColumnProperty(wrapped, property));
    }

    private defineColumnProperty(wrapped, property) {
        Object.defineProperty(wrapped, StringUtils.snakeToCamelCase(property.name), {
            get() {
                const value = this.item.get(property.name);
                return (property.type === "json" && _.isString(value)) ? JSON.parse(value) : value;
            },
            set(value) {
                if (property.type === "json") {
                    value = value === null ? null : JSON.stringify(value);
                }

                this.item.set(property.name, value);
            },
            enumerable: true
        });
    }

    private defineRelationalProperties(wrapped) {
        this.Mapping.relations.forEach((relation) => {
            const wrapper = new BookshelfModelWrapper(relation.references.mapping as BookshelfMapping, relation.references.type as any);
            const bookshelfModelRelation = new BookshelfModelRelation(wrapped, wrapper, relation);

            wrapped[`new${StringUtils.firstLetterUp(relation.name)}`] = (model) => wrapper.createNew(model);

            if (relation.type in bookshelfModelRelation) {
                bookshelfModelRelation[relation.type]();
            } else {
                throw new Error(`Relation of type '${relation.type}' not implemented`);
            }

        });
    }

    private localizeProperties(wrapped, wrappedPrototype) {
        this.wrappedPrototypeKeys.forEach((key) => {
            if (!Object.prototype.hasOwnProperty.call(wrapped, key)) {
                Object.defineProperty(wrapped, key, Object.getOwnPropertyDescriptor(wrappedPrototype, key)!);
            }
        });
    }

    public unwrap(entity: E): Bookshelf.Model<any>;
    public unwrap(entity: E[]): Bookshelf.Model<any>[];

    public unwrap(entity: E | E[]): Bookshelf.Model<any> | Bookshelf.Model<any>[] {
        if (Array.isArray(entity)) {
            return entity.map((e) => this.unwrap(e));
        }

        this.columnMappings.filter((property) => property.type === "json").forEach((property) => {
            const propertyName = StringUtils.snakeToCamelCase(property.name);
            entity[propertyName] = entity[propertyName]; // eslint-disable-line no-self-assign
        });

        return entity.item!;
    }

    public createNew(flatModel?: object) {
        const item = this.Mapping.Model.forge() as Bookshelf.Model<any>;
        const wrapped = this.wrap(item);

        this.applyFlatModel(wrapped, flatModel);

        return wrapped;
    }

    private applyFlatModel(wrapped, flatModel?: object) {
        if (flatModel) {
            const relationNames = this.Mapping.relationNames.filter((name) => name in flatModel);

            this.applyFlatModelValues(wrapped, _.omit(flatModel, relationNames));
            this.applyFlatModelRelations(wrapped, flatModel, relationNames);
        }
    }

    private applyFlatModelValues(wrapped, model) {
        for (let name of this.columnNames) {
            name = StringUtils.snakeToCamelCase(name);
            if (name in model) {
                wrapped[name] = model[name];
            }
        }
    }

    private applyFlatModelRelations(wrapped, model, relationNames) {
        if (!relationNames) {
            return;
        }

        relationNames.forEach((relationName) => {
            const relatedData = model[relationName];
            const pascalCasedName = StringUtils.firstLetterUp(relationName);

            if (Array.isArray(relatedData)) {
                wrapped[`add${pascalCasedName}`](relatedData.map((data) => {
                    return wrapped[`new${pascalCasedName}`](data);
                }));
            } else if (relatedData) {
                wrapped[relationName] = wrapped[`new${pascalCasedName}`](relatedData);
            }
        });
    }

}


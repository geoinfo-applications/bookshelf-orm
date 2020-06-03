"use strict";

import Bookshelf from "bookshelf";
import StringUtils from "./StringUtils";
import BookshelfModelWrapper from "./BookshelfModelWrapper";
import IEntityType from "./typedef/IEntityType";


export default class BookshelfModelRelation<E extends IEntityType> {

    private readonly wrapped;
    private readonly wrapper: BookshelfModelWrapper<E>;
    private readonly relation;
    private readonly relationName: string;
    private readonly pascalCasedName: string;

    public constructor(wrapped, wrapper: BookshelfModelWrapper<E>, relation) {
        this.wrapped = wrapped;
        this.wrapper = wrapper;
        this.relation = relation;
        this.relationName = `relation_${this.relation.name}`;
        this.pascalCasedName = StringUtils.firstLetterUp(this.relation.name);
    }

    public hasMany() {
        const self = this;

        this.defineProperty({
            get() {
                return self.oneToManyGetter(this.item);
            }
        });

        this.wrapped[`add${this.pascalCasedName}`] = function (entity) {
            return self.addRelated(this.item, entity);
        };

        this.wrapped[`remove${this.pascalCasedName}`] = function (entity) {
            return self.removeRelated(this.item, entity);
        };
    }

    public belongsTo() {
        const self = this;

        this.defineProperty({
            get() {
                return self.oneToOneGetter(this.item);
            },
            set(entity) {
                self.oneToOneSetter(this.item, entity);
            }
        });
    }

    public hasOne() {
        const self = this;

        this.defineProperty({
            get() {
                return self.oneToOneGetter(this.item);
            },
            set(entity) {
                self.oneToManySetter(this.item, entity);
            }
        });
    }

    private defineProperty(propertyDescriptor) {
        propertyDescriptor.enumerable = true;
        Object.defineProperty(this.wrapped, this.relation.name, propertyDescriptor);
    }

    private oneToManyGetter(item) {
        return this.wrapper.wrap(item.related(this.relationName).models);
    }

    private oneToOneGetter(item) {
        const related = item.relations[this.relationName];
        return related ? this.wrapper.wrap(related) : null;
    }

    private oneToOneSetter(item, entity) {
        const referencedColumn = this.relation.references.identifies || "id";
        let unwrapped: Bookshelf.Model<any> | null = null;
        let id = null;

        if (entity) {
            unwrapped = this.wrapper.unwrap(entity);
            id = unwrapped.attributes[referencedColumn];
        }

        item.set(this.relation.references.mappedBy, id);
        item.relations[this.relationName] = unwrapped;
    }

    private oneToManySetter(item, entity) {
        let unwrapped: Bookshelf.Model<any> | null = null;

        if (entity) {
            unwrapped = this.wrapper.unwrap(entity);
            unwrapped.set(this.relation.references.mappedBy, item.id);
        }

        item.relations[this.relationName] = unwrapped;
    }

    private addRelated(item, entity) {
        if (Array.isArray(entity)) {
            return entity.map(this.addRelated.bind(this, item));
        }

        const model = this.wrapper.unwrap(entity);
        model.set(this.relation.references.mappedBy, item.id);
        item.related(this.relationName).add(model);
    }

    private removeRelated(item, entity) {
        if (Array.isArray(entity)) {
            return entity.map(this.removeRelated.bind(this, item));
        }

        const model = this.wrapper.unwrap(entity);
        model.set(this.relation.references.mappedBy, null);
        item.related(this.relationName).remove(model);
    }

}


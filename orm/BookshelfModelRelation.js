"use strict";


class BookshelfModelRelation {

    constructor(wrapped, wrapper, relation) {
        this.wrapped = wrapped;
        this.wrapper = wrapper;
        this.relation = relation;
    }

    get relationName() {
        return "relation_" + this.relation.name;
    }

    get pascalCasedName() {
        return this.wrapper.firstLetterUp(this.relation.name);
    }

    hasMany() {
        var self = this;

        this.defineProperty({
            get() {
                return self.oneToManyGetter(this.item);
            }
        });

        this.wrapped["add" + this.pascalCasedName] = function (entity) {
            return self.addRelated(this.item, entity);
        };

        this.wrapped["remove" + this.pascalCasedName] = function (entity) {
            return self.removeRelated(this.item, entity);
        };
    }

    belongsTo() {
        var self = this;

        this.defineProperty({
            get() {
                return self.oneToOneGetter(this.item);
            },
            set(entity) {
                self.oneToOneSetter(this.item, entity);
            }
        });
    }

    hasOne() {
        var self = this;

        this.defineProperty({
            get() {
                return self.oneToOneGetter(this.item);
            },
            set(entity) {
                self.oneToManySetter(this.item, entity);
            }
        });
    }

    defineProperty(propertyDescriptor) {
        propertyDescriptor.enumerable = true;
        Object.defineProperty(this.wrapped, this.relation.name, propertyDescriptor);
    }

    oneToManyGetter(item) {
        return this.wrapper.wrap(item.related(this.relationName).models);
    }

    oneToOneGetter(item) {
        var related = item.relations[this.relationName];
        return related ? this.wrapper.wrap(related) : null;
    }

    oneToOneSetter(item, entity) {
        var unwrapped = null;
        var id = null;

        if (entity) {
            unwrapped = this.wrapper.unwrap(entity);
            id = unwrapped.id;
        }

        item.set(this.relation.references.mappedBy, id);
        item.relations[this.relationName] = unwrapped;
    }

    oneToManySetter(item, entity) {
        var unwrapped = null;

        if (entity) {
            unwrapped = this.wrapper.unwrap(entity);
            unwrapped.set(this.relation.references.mappedBy, item.id);
        }

        item.relations[this.relationName] = unwrapped;
    }

    addRelated(item, entity) {
        if (Array.isArray(entity)) {
            return entity.map(this.addRelated.bind(this, item));
        }

        var model = this.wrapper.unwrap(entity);
        model.set(this.relation.references.mappedBy, item.id);
        item.related(this.relationName).add(model);
    }

    removeRelated(item, entity) {
        if (Array.isArray(entity)) {
            return entity.map(this.removeRelated.bind(this, item));
        }

        var model = this.wrapper.unwrap(entity);
        model.set(this.relation.references.mappedBy, null);
        item.related(this.relationName).remove(model);
    }

}

module.exports = BookshelfModelRelation;

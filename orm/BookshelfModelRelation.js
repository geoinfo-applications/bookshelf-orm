"use strict";


function BookshelfModelRelation(wrapped, item, wrapper, relation) {
    this.wrapped = wrapped;
    this.item = item;
    this.wrapper = wrapper;
    this.relation = relation;
}

BookshelfModelRelation.prototype = {

    get relationName() {
        return "relation_" + this.relation.name;
    },

    get pascalCasedName() {
        return this.wrapper.firstLetterUp(this.relation.name);
    },

    hasMany: function () {
        this.defineProperty({
            get: this.oneToManyGetter.bind(this)
        });

        this.wrapped["add" + this.pascalCasedName] = this.addRelated.bind(this);
        this.wrapped["remove" + this.pascalCasedName] = this.removeRelated.bind(this);
    },

    belongsTo: function () {
        this.defineProperty({
            get: this.oneToOneGetter.bind(this),
            set: this.oneToOneSetter.bind(this)
        });
    },

    hasOne: function () {
        this.defineProperty({
            get: this.oneToOneGetter.bind(this),
            set: this.oneToManySetter.bind(this)
        });
    },

    defineProperty: function (propertyDescriptor) {
        propertyDescriptor.enumerable = true;
        Object.defineProperty(this.wrapped, this.relation.name, propertyDescriptor);
    },

    oneToManyGetter: function oneToManyGetter() {
        return this.wrapper.wrap(this.item.related(this.relationName).models);
    },

    oneToOneGetter: function oneToOneGetter() {
        var related = this.item.relations[this.relationName];
        return related ? this.wrapper.wrap(related) : null;
    },

    oneToOneSetter: function oneToOneSetter(entity) {
        var unwrapped = null;
        var id = null;

        if (entity) {
            unwrapped = this.wrapper.unwrap(entity);
            id = unwrapped.id;
        }

        this.item.set(this.relation.references.mappedBy, id);
        this.item.relations[this.relationName] = unwrapped;
    },

    oneToManySetter: function oneToManySetter(entity) {
        var unwrapped = this.wrapper.unwrap(entity);
        unwrapped.set(this.relation.references.mappedBy, this.item.id);
        this.item.relations[this.relationName] = unwrapped;
    },

    addRelated: function addRelated(entity) {
        if (Array.isArray(entity)) {
            return entity.map(addRelated.bind(this));
        }

        var model = this.wrapper.unwrap(entity);
        model.set(this.relation.references.mappedBy, this.item.id);
        this.item.related(this.relationName).add(model);
    },

    removeRelated: function removeRelated(entity) {
        if (Array.isArray(entity)) {
            return entity.map(removeRelated.bind(this));
        }

        var model = this.wrapper.unwrap(entity);
        model.set(this.relation.references.mappedBy, null);
        this.item.related(this.relationName).remove(model);
    }

};

module.exports = BookshelfModelRelation;

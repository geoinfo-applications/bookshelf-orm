"use strict";

var Q = require("q");
var BookshelfRepository = require("./BookshelfRepository");
var BookshelfModelWrapper = require("./BookshelfModelWrapper");


function EntityRepository(Entity, Mapping) {
    this.wrapper = new BookshelfModelWrapper(Mapping, Entity);
    this.Mapping = Mapping;
    this.Entity = Entity;
    this.repository = new BookshelfRepository(Mapping);
}

EntityRepository.prototype = {

    newEntity: function (flatModel) {
        return this.wrapper.createNew(flatModel);
    },

    findAll: function (ids, options) {
        return this.repository.findAll(ids, options).then(this.wrap.bind(this));
    },

    findAllWhere: function (q, options) {
        return this.repository.findWhere(q, options).then(function (items) {
            return items.length ? this.wrap(items) : [];
        }.bind(this));
    },

    findWhere: function (q, options) {
        return this.repository.findWhere(q, options).then(function (items) {
            if (items.length) {
                return this.wrap(items.pop());
            } else {
                return null;
            }
        }.bind(this));
    },

    findOne: function (id, options) {
        return this.repository.findOne(id, options).then(this.wrap.bind(this));
    },

    save: function (entity) {
        if (Array.isArray(entity)) {
            return Q.all(entity.map(this.save, this));
        }

        return this.repository.save(this.unwrap(entity)).then(this.wrap.bind(this));
    },

    remove: function (entity) {
        if (Array.isArray(entity)) {
            return Q.all(entity.map(this.remove, this));
        } else if (entity instanceof this.Entity) {
            entity = this.unwrap(entity);
        }

        return this.repository.remove(entity);
    },

    wrap: function (item, entityConstructorArguments) {
        return this.wrapper.wrap(item, entityConstructorArguments);
    },

    unwrap: function (entity) {
        return this.wrapper.unwrap(entity);
    }

};

module.exports = EntityRepository;

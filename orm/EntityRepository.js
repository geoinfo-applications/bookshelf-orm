"use strict";

var Q = require("q");
var _ = require("underscore");
var BookshelfRepository = require("./BookshelfRepository");
var BookshelfModelWrapper = require("./BookshelfModelWrapper");


function EntityRepository(Entity, Mapping) {
    this.Entity = Entity;
    this.Mapping = Mapping;
    this.wrapper = new BookshelfModelWrapper(Mapping, Entity);
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

    save: function (entity, options) {
        if (Array.isArray(entity)) {
            return Q.all(entity.map(_.partial(this.save, _, options), this));
        }

        return this.executeTransactional(function () {
            return this.repository.save(this.unwrap(entity), options).then(this.wrap.bind(this));
        }.bind(this), options);
    },

    remove: function (entity, options) {
        if (Array.isArray(entity)) {
            return Q.all(entity.map(_.partial(this.remove, _, options), this));
        } else if (entity instanceof this.Entity) {
            entity = this.unwrap(entity);
        }

        return this.executeTransactional(function () {
            return this.repository.remove(entity, options);
        }.bind(this), options);
    },

    executeTransactional: function (operation, options) {
        if (options && options.transactional && !options.transacting) {
            return this.Mapping.startTransaction(function (t) {
                options.transacting = t;
                return operation();
            });
        } else {
            return operation();
        }
    },

    wrap: function (item, entityConstructorArguments) {
        return this.wrapper.wrap(item, entityConstructorArguments);
    },

    unwrap: function (entity) {
        return this.wrapper.unwrap(entity);
    }

};

module.exports = EntityRepository;

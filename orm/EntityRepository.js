"use strict";

var Q = require("q");
var _ = require("underscore");
var BookshelfRepository = require("./BookshelfRepository");
var BookshelfModelWrapper = require("./BookshelfModelWrapper");
var BookshelfDeepOperation = require("./BookshelfDeepOperation");


class EntityRepository {

    constructor(Entity, Mapping) {
        this.Entity = Entity;
        this.Mapping = Mapping;
        this.wrapper = new BookshelfModelWrapper(Mapping, Entity);
        this.repository = new BookshelfRepository(Mapping);
    }

    newEntity(flatModel) {
        return this.wrapper.createNew(flatModel);
    }

    findAll(ids, options) {
        return this.repository.findAll(ids, options).then(this.wrap.bind(this));
    }

    findAllWhere(q, options) {
        return this.repository.findWhere(q, options).then((items) => {
            return items.length ? this.wrap(items) : [];
        });
    }

    findWhere(q, options) {
        return this.repository.findWhere(q, options).then((items) => {
            if (items.length) {
                return this.wrap(items.pop());
            } else {
                return null;
            }
        });
    }

    findOne(id, options) {
        return this.repository.findOne(id, options).then(this.wrap.bind(this));
    }

    save(entity, options) {
        if (Array.isArray(entity)) {
            return Q.all(entity.map(_.partial(this.save, _, options), this));
        }

        return this.executeTransactional(() => {
            return this.repository.save(this.unwrap(entity), options).then(this.wrap.bind(this));
        }, options).tap((entity) => {
            this.afterSave(entity[this.Mapping.identifiedBy]);
        });
    }

    /**
     * Hook, is called once after every successful save operation
     * @param Number id of saved entity
     */
    afterSave() {
    }

    remove(entity, options) {
        if (Array.isArray(entity)) {
            return Q.all(entity.map(_.partial(this.remove, _, options), this));
        } else if (entity instanceof this.Entity) {
            entity = this.unwrap(entity);
        }

        return this.executeTransactional(() => {
            return this.repository.remove(entity, options);
        }, options).tap(() => {
            var id  = _.isObject(entity) ? entity[this.Mapping.identifiedBy] : +entity;
            if (id) {
                this.afterRemove(id);
            }
        });
    }

    /**
     * Hook, is called once after every successful remove operation
     * @param Number id of removed entity
     */
    afterRemove() {
    }

    executeTransactional(operation, options) {
        if (options && options.transactional && !options.transacting) {
            return this.Mapping.startTransaction((t) => {
                options.transacting = t;
                return operation();
            });
        } else {
            return operation();
        }
    }

    wrap(item, entityConstructorArguments) {
        return this.wrapper.wrap(item, entityConstructorArguments);
    }

    unwrap(entity) {
        return this.wrapper.unwrap(entity);
    }

    addTransactionToQuery(options, query) {
        return BookshelfDeepOperation.addTransactionToQuery(options, query);
    }

}

module.exports = EntityRepository;

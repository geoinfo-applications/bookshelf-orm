"use strict";

const Q = require("q");
const _ = require("underscore");
const BookshelfRepository = require("./BookshelfRepository");
const BookshelfModelWrapper = require("./BookshelfModelWrapper");
const BookshelfDeepOperation = require("./BookshelfDeepOperation");
const { required } = require("./Annotations");


/**
 * Abstraction on top of BookshelfRepository, Bookshelf and Knex. Provies basic CRUD operations for a specific type.
 */
class EntityRepository {

    /**
     * @param {Class | Function} Entity - Class or constructor function. Entities from this repository will be instances of this Type
     * @param {BookshelfMapping} Mapping - {@link DBMappingRegistry#compile Compiled Mapping} which describes this type and its relations
     */
    constructor(Entity, Mapping) {
        this.Entity = Entity;
        this.Mapping = Mapping;
        this.wrapper = new BookshelfModelWrapper(Mapping, Entity);
        this.repository = new BookshelfRepository(Mapping);
    }

    /**
     * Create new instance of Entity.
     * @param {object} [flatModel] - Simple object representation of Entity, e.g. after deserializing JSON. Properties missing in Mapping are dropped
     * @returns {Entity} - Instance of Entity, with given properties if any
     */
    newEntity(flatModel) {
        return this.wrapper.createNew(flatModel);
    }

    /**
     * Fetch one Entity from this Repository
     * @param {ID} id - Identifier of Entity, specified in Mapping by "identifiedBy"
     * @param {object} [options] - Bookshelf fetch options
     * @param {Transaction} [options.transacting] - Run in given transaction
     * @param {boolean} [options.transactional] - Run in a transaction, start new one if not already transacting
     * @param {Array<string>} [options.exclude] - Relation names to exclude, deep relations in dot notation. Specify wildcards using "*"
     * @returns {Promise<Entity|null>} - Returns Promise resolved with entity, or null if not found
     */
    findOne(id, options = null) {
        return this.repository.findOne(id, options).then((item) => this.wrapper.wrap(item));
    }

    /**
     * Fetch all Entities, or Entities with given Ids from this Repository
     * @param {Array<ID>} ids - Identifiers of Entities, specified in Mapping by "identifiedBy"
     * @param {object} [options] - Bookshelf fetch options
     * @param {Transaction} [options.transacting] - Run in given transaction
     * @param {boolean} [options.transactional] - Run in a transaction, start new one if not already transacting
     * @param {Array<string>} [options.exclude] - Relation names to exclude, deep relations in dot notation. Specify wildcards using "*"
     * @returns {Promise<Array<Entity>>} - Returns Promise resolved with array of entities, or empty list if not found.
     *                                If ids were specified, Entities are sorted statically by given ids
     */
    findAll(ids, options = null) {
        return this.repository.findAll(ids, options).then((item) => this.wrapper.wrap(item));
    }

    /**
     * Fetch Entities using a query
     * @param {Function} q - Callback, used as Bookshelf/Knex where condition.
     * @param {object} [options] - Bookshelf fetch options
     * @param {Transaction} [options.transacting] - Run in given transaction
     * @param {boolean} [options.transactional] - Run in a transaction, start new one if not already transacting
     * @param {Array<string>} [options.exclude] - Relation names to exclude, deep relations in dot notation. Specify wildcards using "*"
     * @returns {Promise<Array<Entity>>} - Returns Promise resolved with array of entities, or empty list if not found.
     */
    findAllWhere(q, options = null) {
        return this.repository.findWhere(q, options).then((items) => {
            return items.length ? this.wrapper.wrap(items) : [];
        });
    }

    /**
     * Fetch Entity using a query
     * @param {Function} q - Callback, used as Bookshelf/Knex where condition.
     * @param {object} [options] - Bookshelf fetch options
     * @param {Transaction} [options.transacting] - Run in given transaction
     * @param {boolean} [options.transactional] - Run in a transaction, start new one if not already transacting
     * @param {Array<string>} [options.exclude] - Relation names to exclude, deep relations in dot notation. Specify wildcards using "*"
     * @returns {Promise<Entity|null>} - Returns Promise resolved with entity, or null if not found
     */
    findWhere(q, options = null) {
        return this.repository.findWhere(q, options).then((items) => {
            if (items.length) {
                return this.wrapper.wrap(items.pop());
            } else {
                return null;
            }
        });
    }

    findByConditions(conditions, options = null) {
        return this.repository.findByConditions(conditions, options).then((items) => {
            return items.length ? this.wrapper.wrap(items) : [];
        });
    }

    /**
     * Save one or multiple Entities to this Repository
     * @param {Entity | Array<Entity>} entity - Entity or Entities to save
     * @param {object} [options] - Bookshelf save options
     * @param {Transaction} [options.transacting] - Run in given transaction
     * @param {boolean} [options.transactional] - Run in a transaction, start new one if not already transacting
     * @param {string} [options.method] - Specify "update" or "insert". Defaults to "update", or "insert" if Id is null
     * @returns {Promise<Entity | Array<Entity>>} - Returns Promise resolved with saved entity, or array of saved entities
     */
    save(entity, options = null) {
        if (Array.isArray(entity)) {
            return Q.all(entity.map((entity) => this.save(entity, options)));
        }

        return this.executeTransactional(() => {
            return this.repository.save(this.wrapper.unwrap(entity), options).then((item) => this.wrapper.wrap(item));
        }, options).tap((entity) => {
            this.afterSave(entity[this.Mapping.identifiedBy]);
        });
    }

    /**
     * Hook, is called once after every successful save operation
     * @param {ID} id - Identifier of saved Entity
     */
    afterSave() {
    }

    /**
     * Remove one or multiple Entities from this Repository
     * @param {Entity | Array<Entity> | ID | Array<ID>} entity - Entity or Entities, Id or Ids to remove
     * @param {object} [options] - Bookshelf save options
     * @param {Transaction} [options.transacting] - Run in given transaction
     * @param {boolean} [options.transactional] - Run in a transaction, start new one if not already transacting
     * @returns {Promise<Void>} - Returns Promise resolved after removal
     */
    remove(entity, options = null) {
        if (Array.isArray(entity)) {
            return Q.all(entity.map((entity) => this.remove(entity, options)));
        } else if (entity instanceof this.Entity) {
            entity = this.wrapper.unwrap(entity);
        }

        return this.executeTransactional(() => {
            return this.repository.remove(entity, options);
        }, options).tap(() => {
            const id  = _.isObject(entity) ? entity[this.Mapping.identifiedBy] : +entity;

            if (id) {
                this.afterRemove(id);
            }
        });
    }

    /**
     * Hook, is called once after every successful remove operation
     * @param {ID} id - Identifier of removed Entity
     */
    afterRemove() {
    }

    /**
     * Execute an operation in a running or new transaction
     * @param {Function} operation - Callback to execute in a transaction
     * @param {object} options - Bookshelf options
     * @param {Transaction} [options.transacting] - Run in given transaction
     * @param {boolean} [options.transactional] - Run in a transaction, start new one if not already transacting
     * @returns {Promise<*>} - Promise resolved with result of operation. If operation fails, Promise is rejected
     */
    executeTransactional(operation, options = null) {
        if (options && options.transactional && !options.transacting) {
            return this.Mapping.startTransaction((t) => {
                options.transacting = t;
                return Q.try(operation).then(t.commit).catch(t.rollback);
            });
        } else {
            return Q.try(operation);
        }
    }

    /**
     * Add an already started transaction to given query. If not yet started, no transaction will be added
     * @param {Transaction} [options.transacting] - Add Transaction object to given query
     * @param {KnexQuery} query - Add transaction to query, if one was started.
     * @param {object} options - Bookshelf options
     * @param {Transaction} [options.transacting] - Run in given transaction
     * @param {boolean} [options.transactional] - Run in a transaction, start new one if not already transacting
     * @returns {KnexQuery} query - Returns KnexQuery for chaining
     */
    addTransactionToQuery(query, options = required("options")) {
        return BookshelfDeepOperation.addTransactionToQuery(query, options);
    }

    /**
     * Returns whether an Entity with the given Identifier exists.
     * @param {ID} id - Identifier
     * @param {object} [options] - Bookshelf save options
     * @param {Transaction} [options.transacting] - Run in given transaction
     * @param {boolean} [options.transactional] - Run in a transaction, start new one if not already transacting
     * @returns {Promise<boolean>} - Returns Promise resolved with flag indicating whether an Entity with the given Identifier exists
     */
    exists(id, options = null) {
        if (!id) {
            return Q.when(false);
        }

        options = _.extend({}, options, { exclude: ["*"] });
        return this.findOne(id, options).then((entity) => !!entity);
    }

}

module.exports = EntityRepository;

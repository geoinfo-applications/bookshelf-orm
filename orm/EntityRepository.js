"use strict";

var Q = require("q");
var _ = require("underscore");
var BookshelfRepository = require("./BookshelfRepository");
var BookshelfModelWrapper = require("./BookshelfModelWrapper");
var BookshelfDeepOperation = require("./BookshelfDeepOperation");


/**
 * Abstraction on top of BookshelfRepository, Bookshelf and Knex. Provies basic CRUD operations for a specific type.
 */
class EntityRepository {

    /**
     * @param {Class | Function} Entity - Class or constructor function. Entities from this repository will be instances of this Type
     * @param {BookshelfMapping} Mapping - Mapping which describes this type and its relations
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
     * @param {Number | *} id - Identifier of Entity, specified in Mapping by "identifiedBy". Defaults to "id".
     * @param {object} [options] - Bookshelf fetch options
     * @param {Transaction} [options.transacting] - Run in given transaction
     * @param {boolean} [options.transactional] - Run in a transaction, start new one if not already transacting
     * @param {string[]} [options.exclude] - Relation names to exclude, deep relations in dot notation. Specify wildcards using "*"
     * @returns {Promise<Entity|null>} - Returns Promise resolved with entity, or null if not found
     */
    findOne(id, options) {
        return this.repository.findOne(id, options).then((item) => this.wrapper.wrap(item));
    }

    /**
     * Fetch all Entities, or Entities with given Ids from this Repository
     * @param {Number[] | *[]} ids - Identifiers of Entities, specified in Mapping by "identifiedBy". Defaults to "id".
     * @param {object} [options] - Bookshelf fetch options
     * @param {Transaction} [options.transacting] - Run in given transaction
     * @param {boolean} [options.transactional] - Run in a transaction, start new one if not already transacting
     * @param {string[]} [options.exclude] - Relation names to exclude, deep relations in dot notation. Specify wildcards using "*"
     * @returns {Promise<Entity[]>} - Returns Promise resolved with array of entities, or empty list if not found.
     *                                If ids were specified, Entities are sorted statically by given ids
     */
    findAll(ids, options) {
        return this.repository.findAll(ids, options).then((item) => this.wrapper.wrap(item));
    }

    /**
     * Fetch Entities using a query
     * @param {Function} q - Callback, used as Bookshelf/Knex where condition.
     * @param {object} [options] - Bookshelf fetch options
     * @param {Transaction} [options.transacting] - Run in given transaction
     * @param {boolean} [options.transactional] - Run in a transaction, start new one if not already transacting
     * @param {string[]} [options.exclude] - Relation names to exclude, deep relations in dot notation. Specify wildcards using "*"
     * @returns {Promise<Entity[]>} - Returns Promise resolved with array of entities, or empty list if not found.
     */
    findAllWhere(q, options) {
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
     * @param {string[]} [options.exclude] - Relation names to exclude, deep relations in dot notation. Specify wildcards using "*"
     * @returns {Promise<Entity|null>} - Returns Promise resolved with entity, or null if not found
     */
    findWhere(q, options) {
        return this.repository.findWhere(q, options).then((items) => {
            if (items.length) {
                return this.wrapper.wrap(items.pop());
            } else {
                return null;
            }
        });
    }

    /**
     * Save one or multiple Entities to this Repository
     * @param {Entity | Entity[]} entity - Entity or Entities to save
     * @param {object} [options] - Bookshelf save options
     * @param {Transaction} [options.transacting] - Run in given transaction
     * @param {boolean} [options.transactional] - Run in a transaction, start new one if not already transacting
     * @param {string} [options.method] - Specify "update" or "insert". Defaults to "update", or "insert" if Id is null
     * @returns {Promise<Entity | Entity[]>} - Returns Promise resolved with saved entity, or array of saved entities
     */
    save(entity, options) {
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
     * @param {Number | *} id - Identifier of saved Entity
     */
    afterSave() {
    }

    /**
     * Remove one or multiple Entities from this Repository
     * @param {Entity | Entity[] | Number | Number[] | * | *[]} entity - Entity or Entities, Id or Ids to remove
     * @param {object} [options] - Bookshelf save options
     * @param {Transaction} [options.transacting] - Run in given transaction
     * @param {boolean} [options.transactional] - Run in a transaction, start new one if not already transacting
     * @returns {Promise<Void>} - Returns Promise resolved after removal
     */
    remove(entity, options) {
        if (Array.isArray(entity)) {
            return Q.all(entity.map((entity) => this.remove(entity, options)));
        } else if (entity instanceof this.Entity) {
            entity = this.wrapper.unwrap(entity);
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
     * @param {Number | *} id - Identifier of removed Entity
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
    executeTransactional(operation, options) {
        if (options && options.transactional && !options.transacting) {
            return this.Mapping.startTransaction((t) => {
                options.transacting = t;
                return operation();
            });
        } else {
            return Q.try(operation);
        }
    }

    /**
     * Add an already started transaction to given query. If not yet started, no transaction will be added
     * @param {Transaction} [options.transacting] - Add Transaction object to given query
     * @param {KnexQuery} query - Add transaction to query, if one was started.
     * @returns {KnexQuery} query - Returns KnexQuery for chaining
     */
    addTransactionToQuery(options, query) {
        return BookshelfDeepOperation.addTransactionToQuery(options, query);
    }

}

module.exports = EntityRepository;

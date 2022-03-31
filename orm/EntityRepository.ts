"use strict";

import Q from "q";
import Knex from "knex";
import _ from "underscore";
import BookshelfRepository from "./BookshelfRepository";
import BookshelfMapping from "./BookshelfMapping";
import BookshelfModelWrapper from "./BookshelfModelWrapper";
import BookshelfDeepOperation from "./BookshelfDeepOperation";
import IEntityRepositoryOptions from "./IEntityRepositoryOptions";
import { required } from "./Annotations";
import IEntityType from "./typedef/IEntityType";
import { DeepPartial } from "ts-essentials";
import Bookshelf = require("bookshelf");
import IPaginationOptions from "./typedef/IPaginationOptions";
import IPageableResult from "./typedef/IPageableResult";


/**
 * Abstraction on top of BookshelfRepository, Bookshelf and Knex. Provides basic CRUD operations for a specific type.
 */
export default class EntityRepository<E extends object | IEntityType, ID = number> {

    public Mapping: BookshelfMapping;
    private readonly Entity;
    protected readonly wrapper: BookshelfModelWrapper<E>;
    protected readonly repository: BookshelfRepository<Bookshelf.Model<any>, ID>;

    /**
     * @param {Class | Function} Entity - Class or constructor function. Entities from this repository will be instances of this Type
     * @param {BookshelfMapping} Mapping - {@link DBMappingRegistry#compile Compiled Mapping} which describes this type and its relations
     */
    protected constructor(Entity, Mapping) {
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
    public newEntity(flatModel?: DeepPartial<E>): E {
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
    public async findOne(id: ID, options: IEntityRepositoryOptions = null): Promise<E | null> {
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
    public async findAll(ids?: ID[] | IEntityRepositoryOptions, options: IEntityRepositoryOptions = null): Promise<E[]> {
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
    public async findAllWhere(q: (q: Knex.QueryBuilder) => void, options: IEntityRepositoryOptions = null): Promise<E[]> {
        const items = await this.repository.findWhere(q, null, options);
        return (items.length ? this.wrapper.wrap(items) : []) as E[];
    }

    /**
     * Serves functionality for pagination using a query. Returns fetched entries and count
     * @param {Function | null} q - Callback, used as Bookshelf/Knex where condition.
     * @param {IPaginationOptions | null} [pagination] - pagination options
     * @param {number} [pagination.offset] - offset part for pagination
     * @param {number} [pagination.limit] - limit for certain number of entries
     * @param {object} [options] - Bookshelf fetch options
     * @param {Transaction} [options.transacting] - Run in given transaction
     * @param {boolean} [options.transactional] - Run in a transaction, start new one if not already transacting
     * @param {Array<string>} [options.exclude] - Relation names to exclude, deep relations in dot notation. Specify wildcards using "*"
     * @returns {Promise<IPageableResult<Entity>>} - Returns a promise which contains entries as Array<Entity> and count as string
     */
    public async paginate(q: ((q: Knex.QueryBuilder) => void) | null, pagination: IPaginationOptions | null,
        options: IEntityRepositoryOptions = null): Promise<IPageableResult<E>> {
        const [items, count] = await Promise.all([
            this.repository.findWhere(q, pagination, options),
            this.repository.count(q, pagination, options)
        ]);
        return { count, entries: this.wrapper.wrap(items) as E[] };
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
    public async findWhere(q: (q: Knex.QueryBuilder) => void, options: IEntityRepositoryOptions = null): Promise<E | null> {
        return this.repository.findWhere(q, null, options).then((items) => {
            if (items.length) {
                return this.wrapper.wrap(items.pop() as any);
            } else {
                return null;
            }
        });
    }

    public async findByConditions(conditions, options: IEntityRepositoryOptions = null): Promise<E[]> {
        const items = await this.repository.findByConditions(conditions, null, options);
        return (items.length ? this.wrapper.wrap(items) : []) as E[];
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

    public async save(entity: E, options?: IEntityRepositoryOptions): Promise<E>;
    public async save(entity: E[], options?: IEntityRepositoryOptions): Promise<E[]>;

    public async save(entity: E | E[], options: IEntityRepositoryOptions = null): Promise<E | E[]> {
        if (Array.isArray(entity)) {
            return Promise.all(entity.map((entity) => this.save(entity, options)));
        }

        return this.executeTransactional(async () => {
            const unwrapped: Bookshelf.Model<any> = this.wrapper.unwrap(entity);
            const item: any = await this.repository.save(unwrapped, options);
            return this.wrapper.wrap(item);
        }, options).then((entity) => {
            this.afterSave(entity[this.Mapping.identifiedBy]);
            return entity;
        });
    }

    /**
     * Hook, is called once after every successful save operation
     * @param {ID} id - Identifier of saved Entity
     */
    protected afterSave(_id: ID): void {
        // template method
    }

    /**
     * Remove one or multiple Entities from this Repository
     * @param {Entity | Array<Entity> | ID | Array<ID>} entity - Entity or Entities, Id or Ids to remove
     * @param {object} [options] - Bookshelf save options
     * @param {Transaction} [options.transacting] - Run in given transaction
     * @param {boolean} [options.transactional] - Run in a transaction, start new one if not already transacting
     * @returns {Promise<Void>} - Returns Promise resolved after removal
     */
    public async remove(entity: ID | ID[] | E | E[], options: IEntityRepositoryOptions = null): Promise<void> {
        let item: ID | object = entity;

        if (Array.isArray(entity)) {
            await Promise.all((entity as E[]).map((entity) => this.remove(entity, options)));
            return;
        }

        if (entity instanceof this.Entity) {
            item = this.wrapper.unwrap(entity as E);
        }

        await this.executeTransactional(async () => {
            await this.repository.remove(item as any, options);
        }, options);

        const id = _.isObject(entity) ? entity[this.Mapping.identifiedBy] : +entity;
        if (id) {
            this.afterRemove(id);
        }
    }

    /**
     * Hook, is called once after every successful remove operation
     * @param {ID} id - Identifier of removed Entity
     */
    protected afterRemove(_id: ID): void {
        // template method
    }

    /**
     * Execute an operation in a running or new transaction
     * @param {Function} operation - Callback to execute in a transaction
     * @param {object} options - Bookshelf options
     * @param {Transaction} [options.transacting] - Run in given transaction
     * @param {boolean} [options.transactional] - Run in a transaction, start new one if not already transacting
     * @returns {Promise<*>} - Promise resolved with result of operation. If operation fails, Promise is rejected
     */
    public async executeTransactional<R>(operation: () => R | Promise<R>, options: IEntityRepositoryOptions = null): Promise<R> {
        if (options && options.transactional && !options.transacting) {
            return this.Mapping.startTransaction(async (t) => {
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
    public addTransactionToQuery<Q extends Knex.ChainableInterface>(query: Q, options: IEntityRepositoryOptions = required("options")): Q {
        return BookshelfDeepOperation.addTransactionToQuery<Q>(query, options);
    }

    /**
     * Returns whether an Entity with the given Identifier exists.
     * @param {ID} id - Identifier
     * @param {object} [options] - Bookshelf save options
     * @param {Transaction} [options.transacting] - Run in given transaction
     * @param {boolean} [options.transactional] - Run in a transaction, start new one if not already transacting
     * @returns {Promise<boolean>} - Returns Promise resolved with flag indicating whether an Entity with the given Identifier exists
     */
    public async exists(id: ID, options: IEntityRepositoryOptions = null): Promise<boolean> {
        if (!id) {
            return Q.when(false);
        }

        options = _.extend({}, options, { exclude: ["*"] });
        return this.findOne(id, options).then((entity) => !!entity);
    }

}

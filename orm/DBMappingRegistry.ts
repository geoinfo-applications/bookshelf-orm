"use strict";

import ModelFactory from "./ModelFactory";
import BookshelfMapping from "./BookshelfMapping";

let instance;

/**
 * Holds all Mappings and converts them to Bookshelf Models
 */
export default class DBMappingRegistry {

    private readonly mappings: { [prop: string]: { dbContextName: string; mapping: BookshelfMapping; } };
    private readonly compiled: { [prop: string]: BookshelfMapping };
    private readonly ModelFactory: ModelFactory;

    public constructor(ModelFactory) {
        this.mappings = {};
        this.compiled = {};
        this.ModelFactory = ModelFactory;
    }

    public static getInstance<T extends DBMappingRegistry>(DBMappingRegistryClass: { new(ModelFactory) } = DBMappingRegistry): T {
        if (!instance) {
            instance = new DBMappingRegistryClass(ModelFactory);
        }

        return instance as T;
    }

    /**
     * Register a Mapping
     * @param {string} name - Name of the mapping
     * @param {string} dbContextName - DB context / connection name
     * @param {BookshelfMapping} mapping - Mapping description of columns, relations etc.
     */
    public register(name, dbContextName, mapping) {
        if (this.isRegistered(name)) {
            throw new Error(`A mapping with name '${name}' is already registered`);
        }

        this.mappings[name] = {
            dbContextName: dbContextName,
            mapping: mapping
        };
    }

    public get(name) {
        return this.mappings[name].mapping;
    }

    public isRegistered(name) {
        return name in this.mappings;
    }

    /**
     * Compile a BookshelfMapping for use with an EntityRepository
     * @param {string} name - Name of a registered Mapping
     * @returns {EntityRepository} compiled Mapping, ready to use
     */
    public compile(name) {
        if (!this.isCached(name)) {
            this.compileAndCache(name);
        }

        return this.compiled[name];
    }

    private compileAndCache(name: string) {
        if (!this.isRegistered(name)) {
            throw new Error(`${name} is not a registered mapping`);
        }

        const factory = this.ModelFactory.context[this.mappings[name].dbContextName];
        const mapping = Object.create(this.get(name));

        if (mapping.relations) {
            mapping.relations.forEach((relation) => {
                const getCompiled = this.compile.bind(this, relation.references.mapping);

                Object.defineProperty(relation.references, "mapping", {

                    get() {
                        return getCompiled();
                    }

                });

            });
        }

        this.compiled[name] = factory.createModel(mapping);
    }

    private isCached(name: string) {
        return name in this.compiled;
    }

}


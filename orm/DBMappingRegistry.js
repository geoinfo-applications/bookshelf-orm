"use strict";


class DBMappingRegistry {

    constructor(ModelFactory) {
        this.mappings = {};
        this.compiled = {};
        this.ModelFactory = ModelFactory;
    }

    register(name, dbContextName, mapping) {
        this.mappings[name] = {
            dbContextName: dbContextName,
            mapping: mapping
        };
    }

    get(name) {
        return this.mappings[name].mapping;
    }

    compile(name) {
        if (!this.isCached(name)) {
            this.compileAndCache(name);
        }

        return this.compiled[name];
    }

    compileAndCache(name) {
        if (!this.mappings[name]) {
            throw new Error(name + " is not a registered mapping");
        }

        var factory = this.ModelFactory.context[this.mappings[name].dbContextName];
        var mapping = Object.create(this.get(name));

        if (mapping.relations) {
            mapping.relations.forEach(relation => {
                var getCompiled = this.compile.bind(this, relation.references.mapping);

                Object.defineProperty(relation.references, "mapping", {

                    get() {
                        return getCompiled();
                    }

                });

            });
        }

        this.compiled[name] = factory.createModel(mapping);
    }

    isCached(name) {
        return name in this.compiled;
    }

}

module.exports = DBMappingRegistry;

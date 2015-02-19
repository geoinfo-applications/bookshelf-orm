"use strict";


function DBMappingRegistry(ModelFactory) {
    this.mappings = {};
    this.compiled = {};
    this.ModelFactory = ModelFactory;
}

DBMappingRegistry.prototype = {

    register: function (name, dbContextName, mapping) {
        this.mappings[name] = {
            dbContextName: dbContextName,
            mapping: mapping
        };
    },

    get: function (name) {
        return this.mappings[name].mapping;
    },

    compile: function (name) {
        if (!this.isCached(name)) {
            this.compileAndCache(name);
        }

        return this.compiled[name];
    },

    compileAndCache: function (name) {
        if (!this.mappings[name]) {
            throw new Error(name + " is not a registered mapping");
        }

        var factory = this.ModelFactory.context[this.mappings[name].dbContextName];
        var mapping = Object.create(this.get(name));

        if (mapping.relations) {
            mapping.relations.forEach(function (relation) {

                var getCompiled = this.compile.bind(this, relation.references.mapping);

                Object.defineProperty(relation.references, "mapping", {

                    get: function () {
                        return getCompiled();
                    }

                });

            }, this);
        }

        this.compiled[name] = factory.createModel(mapping);
    },

    isCached: function (name) {
        return name in this.compiled;
    }

};

module.exports = DBMappingRegistry;

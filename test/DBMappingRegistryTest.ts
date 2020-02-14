"use strict";


import { expect } from "chai";
import ModelFactory from "../orm/ModelFactory";
import DBMappingRegistry from "../orm/DBMappingRegistry";


describe("DB-Mapping Registry Test", () => {
    let registry;

    beforeEach(() => {
        registry = new DBMappingRegistry(ModelFactory);
    });

    it("should hold registered Mapping", () => {
        const testModel = {};

        registry.register("model", "dbContext", testModel);

        expect(registry.get("model")).to.be.equal(testModel);
    });

    describe("compile", () => {

        it("should link Mappings with related Models and Entityclasses", () => {
            ModelFactory.context.ctx = {
                createModel(m) {
                    return {
                        Model: m,
                        relations: m.relations
                    };
                }
            } as any;
            const fooMapping = {
                tableName: "footbl",
                relations: [{
                    name: "bar",
                    references: {
                        mapping: "BarMapping"
                    }
                }]
            };
            const barMapping = {
                tableName: "bartbl",
                relations: [{
                    name: "foo",
                    references: {
                        mapping: "FooMapping"
                    }
                }]
            };

            registry.register("FooMapping", "ctx", fooMapping);
            registry.register("BarMapping", "ctx", barMapping);

            const foo = registry.compile("FooMapping");
            const bar = registry.compile("BarMapping");

            expect(foo.relations[0].references.mapping).to.be.equal(bar);
            expect(bar.relations[0].references.mapping).to.be.equal(foo);
        });

        it("should throw an error if Mapping is not registered", () => {
            expect(registry.compile.bind(registry, "NonExistingModel")).to.throw("NonExistingModel is not a registered mapping");
        });

    });

    it("should throw if two mappings with same name are registered", () => {
        const testModel = {};

        registry.register("model", "dbContext", testModel);

        expect(registry.register.bind(registry, "model", "dbContext", testModel)).to.throw(/already registered/);
    });

});

"use strict";

var expect = require("chai").expect;
var ModelFactory = require("../orm/ModelFactory");
var DBMappingRegistry = require("../orm/DBMappingRegistry");


describe("DB-Mapping Registry Test", function () {
    var registry;

    beforeEach(function () {
        registry = new DBMappingRegistry(ModelFactory);
    });

    it("should hold registered Mapping", function () {
        var testModel = {};

        registry.register("model", "dbContext", testModel);

        expect(registry.get("model")).to.be.equal(testModel);
    });

    describe("compile", function () {

        it("should link Mappings with related Models and Entityclasses", function () {
            ModelFactory.context.ctx = {
                createModel: function (m) {
                    return {
                        Model: m,
                        relations: m.relations
                    };
                }
            };
            var fooMapping = {
                tableName: "footbl",
                relations: [{
                    name: "bar",
                    references: {
                        mapping: "BarMapping"
                    }
                }]
            };
            var barMapping = {
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

            var foo = registry.compile("FooMapping");
            var bar = registry.compile("BarMapping");

            expect(foo.relations[0].references.mapping).to.be.equal(bar);
            expect(bar.relations[0].references.mapping).to.be.equal(foo);
        });

        it("should throw an error if Mapping is not registered", function () {
            expect(registry.compile.bind(registry, "NonExistingModel")).to.throw("NonExistingModel is not a registered mapping");
        });

    });

    it("should throw if two mappings with same name are registered", () => {
        var testModel = {};

        registry.register("model", "dbContext", testModel);

        expect(registry.register.bind(registry, "model", "dbContext", testModel)).to.throw(/already registered/);
    });

});

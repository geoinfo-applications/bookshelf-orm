"use strict";

var chai = require("chai");
var expect = chai.expect;

var CarRepository = require("./db/mocks").CarRepository;
var EngineRepository = require("./db/mocks").EngineRepository;
var PartRepository = require("./db/mocks").PartRepository;

require("./db/connection");
var registry = require("./db/registry");
require("./db/mappings");

var CarDBMapping = registry.compile("CarDBMapping");
var PartDBMapping = registry.compile("PartDBMapping");
var EngineDBMapping = registry.compile("EngineDBMapping");
var OutletDBMapping = registry.compile("OutletDBMapping");
var InjectionDBMapping = registry.compile("InjectionDBMapping");


describe("Bookshelf Repository Orphan Removal Test", function () {
    this.timeout(1000);
    var carRepository;

    beforeEach(function () {
        carRepository = new CarRepository().repository;
    });

    describe("1:n relations", function () {

        it("should remove orphans", function () {
            return createCar().then(function (item) {
                var part = PartDBMapping.Model.forge({
                    car_id: item.id,
                    name: "name" + Date.now()
                });
                item.relations.relation_parts = PartDBMapping.Collection.forge(part);

                return carRepository.save(item).then(function (item) {
                    item.relations.relation_parts.models = [];
                    return carRepository.save(item).then(function () {
                        return PartDBMapping.Collection.forge().fetch().then(function (parts) {
                            expect(parts.length).to.be.eql(0);
                        });
                    });
                });
            });
        });

        it("should not remove still attached relations", function () {
            return createCar().then(function (item) {
                var part = PartDBMapping.Model.forge({
                    car_id: item.id,
                    name: "name" + Date.now()
                });
                item.relations.relation_parts = PartDBMapping.Collection.forge(part);

                return carRepository.save(item).then(function (item) {
                    return carRepository.save(item).then(function () {
                        return PartDBMapping.Collection.forge().fetch().then(function (parts) {
                            expect(parts.length).to.be.eql(1);
                        });
                    });
                });
            });
        });

    });

    describe("n:1 relations", function () {

        it("should remove orphans", function () {
            var partRepository = new PartRepository();
            var engineRepository = new EngineRepository();
            var engine = engineRepository.newEntity();
            var part = partRepository.newEntity();
            part.engine = engine;

            return partRepository.save(part).then(function () {
                part.engine = null;
                return partRepository.save(part).then(function () {
                    return EngineDBMapping.Collection.forge().fetch().then(function (parts) {
                        expect(parts.length).to.be.eql(0);
                    });
                });
            });
        });

        it("should not remove still attached relations", function () {
            var partRepository = new PartRepository();
            var engineRepository = new EngineRepository();
            var engine = engineRepository.newEntity();
            var part = partRepository.newEntity();
            part.engine = engine;

            return partRepository.save(part).then(function () {
                return partRepository.save(part).then(function () {
                    return EngineDBMapping.Collection.forge().fetch().then(function (parts) {
                        expect(parts.length).to.be.eql(1);
                    });
                });
            });
        });

        it("should remove orphans deeply", function () {
            var partRepository = new PartRepository();
            var engineRepository = new EngineRepository();
            var engine = engineRepository.newEntity();
            var part = partRepository.newEntity();
            part.engine = engine;
            engine.injection = engine.newInjection();
            engine.addOutlets(engine.newOutlets());

            return partRepository.save(part).then(function () {
                part.engine = null;
                return partRepository.save(part).then(function () {
                    return EngineDBMapping.Collection.forge().fetch().then(function (parts) {
                        return InjectionDBMapping.Collection.forge().fetch().then(function (injection) {
                            return OutletDBMapping.Collection.forge().fetch().then(function (outlets) {
                                expect(parts.length).to.be.eql(0);
                                expect(injection.length).to.be.eql(0);
                                expect(outlets.length).to.be.eql(0);
                            });
                        });
                    });
                });
            });
        });

    });


    var tableIndex = 0;

    function createCar() {
        return CarDBMapping.Model.forge({ name: "car" + tableIndex++ }).save();
    }

    beforeEach(require("./db/setup"));
    afterEach(require("./db/teardown"));

});

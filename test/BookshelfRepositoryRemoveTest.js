"use strict";

describe("Bookshelf Repository Remove Test", function () {
    /*jshint maxstatements:false*/

    var chai = require("chai");
    var expect = chai.expect;

    var CarRepository = require("./db/mocks").CarRepository;
    var EngineRepository = require("./db/mocks").EngineRepository;
    var PartRepository = require("./db/mocks").PartRepository;
    var OwnerRepository = require("./db/mocks").OwnerRepository;

    var knex = require("./db/connection").knex;
    var registry = require("./db/registry");
    var mappings = require("./db/mappings");

    var CarDBMapping = registry.compile("CarDBMapping");
    var PartDBMapping = registry.compile("PartDBMapping");
    var EngineDBMapping = registry.compile("EngineDBMapping");
    var OutletDBMapping = registry.compile("OutletDBMapping");
    var InjectionDBMapping = registry.compile("InjectionDBMapping");

    this.timeout(100);
    var carRepository;

    beforeEach(function () {
        carRepository = new CarRepository().repository;
    });

    it("should drop item", function () {
        return createCar().then(function (item) {
            return carRepository.remove(item).then(function () {
                return carRepository.findAll().then(function (items) {
                    expect(items.length).to.be.eql(0);
                });
            });
        });
    });

    it("should drop item specified by id", function () {
        return createCar().then(function (item) {
            return carRepository.remove(item.id).then(function () {
                return carRepository.findAll().then(function (items) {
                    expect(items.length).to.be.eql(0);
                });
            });
        });
    });

    it("should drop array of item", function () {
        var item1 = CarDBMapping.Model.forge({ name: "item1" });
        var item2 = CarDBMapping.Model.forge({ name: "item2" });

        return carRepository.save([item1, item2]).then(function () {
            return carRepository.remove([item1, item2]).then(function () {
                return carRepository.findAll().then(function (items) {
                    expect(items.length).to.be.eql(0);
                });
            });
        });
    });

    it("should drop array of items specified by id", function () {
        var item1 = CarDBMapping.Model.forge({ name: "item1" });
        var item2 = CarDBMapping.Model.forge({ name: "item2" });

        return carRepository.save([item1, item2]).then(function () {
            return carRepository.remove([item1.id, item2.id]).then(function () {
                return carRepository.findAll().then(function (items) {
                    expect(items.length).to.be.eql(0);
                });
            });
        });
    });

    it("should drop Collection of item", function () {
        var item1 = CarDBMapping.Model.forge({ name: "item1" });
        var item2 = CarDBMapping.Model.forge({ name: "item2" });
        var collection = CarDBMapping.Collection.forge([item1, item2]);

        return carRepository.save(collection).then(function () {
            return carRepository.remove(collection).then(function () {
                return carRepository.findAll().then(function (items) {
                    expect(items.length).to.be.eql(0);
                });
            });
        });
    });

    it("should drop related items if cascade is set", function () {
        return createCar().then(function (item) {
            var part = PartDBMapping.Model.forge({
                car_id: item.id,
                name: "name" + Date.now()
            });
            item.relations.relation_parts = PartDBMapping.Collection.forge(part);

            return carRepository.save(item).then(function () {
                return carRepository.findOne(item.id).then(function (item) {
                    return carRepository.remove(item).then(function () {
                        return PartDBMapping.Collection.forge().fetch().then(function (attrs) {
                            expect(attrs.length).to.be.eql(0);
                        });
                    });
                });
            });
        });
    });

    it("should cascade drop deeply", function () {
        carRepository = new CarRepository();
        var engineRepository = new EngineRepository();
        var serialNumber = "SN" + Date.now();
        var car = carRepository.newEntity({ parts: [{ wheels: [{ index: 1 }], engine: { serialNumber: serialNumber } }] });

        return carRepository.save(car).then(function (car) {
            return engineRepository.findAll().then(function (engines) {
                expect(engines.length).to.be.eql(1);

                return carRepository.remove(car).then(function () {
                    return engineRepository.findAll().then(function (engines) {
                        expect(engines.length).to.be.eql(0);
                    });
                });
            });
        });
    });

    it("should not drop non-cascaded entities", function () {
        var ownerRepository = new OwnerRepository();
        var owner = ownerRepository.newEntity();

        return ownerRepository.save(owner).then(function (owner) {
            createCar().then(function (car) {
                car.set("owner_id", owner.id);
                return carRepository.save(car).then(function (car) {
                    return carRepository.remove(car).then(function () {
                        return ownerRepository.findAll().then(function (owners) {
                            expect(owners.length).to.be.eql(1);
                        });
                    });
                });
            });
        });
    });

    describe("orphanRemoval", function () {

        it("should remove orphans if orphanRemoval = true in 1:n relations", function () {
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

        it("should not remove still attached relations in 1:n relations", function () {
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

        it("should remove orphans if orphanRemoval = true in n:1 relations", function () {
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

        it("should not remove still attached relations in n:1 relations", function () {
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

        it("should remove orphans deeply if orphanRemoval = true in n:1 relations", function () {
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

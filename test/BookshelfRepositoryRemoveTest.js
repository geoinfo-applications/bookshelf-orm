"use strict";

var chai = require("chai");
var expect = chai.expect;

var CarRepository = require("./db/mocks").CarRepository;
var EngineRepository = require("./db/mocks").EngineRepository;
var OwnerRepository = require("./db/mocks").OwnerRepository;

require("./db/connection");
var registry = require("./db/registry");
require("./db/mappings");

var CarDBMapping = registry.compile("CarDBMapping");
var PartDBMapping = registry.compile("PartDBMapping");
var ParkingSpaceDBMapping = registry.compile("ParkingSpaceDBMapping");


describe("Bookshelf Repository Remove Test", function () {
    this.timeout(1000);
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

    it("should drop unsaved item", function () {
        var item =  CarDBMapping.Model.forge({ name: "car" + tableIndex++ });

        return carRepository.remove(item).then(function () {
            return carRepository.findAll().then(function (items) {
                expect(items.length).to.be.eql(0);
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

    it("should drop related hasOne items", function () {
        return createCar().then(function (item) {
            var parkingSpace = ParkingSpaceDBMapping.Model.forge({
                car_id: item.id,
                name: "name" + Date.now()
            });
            item.relations.relation_parkingSpace = parkingSpace;

            return carRepository.save(item).then(function (item) {
                return carRepository.remove(item).then(function () {
                    return ParkingSpaceDBMapping.Collection.forge().fetch().then(function (parkingSpaces) {
                        expect(parkingSpaces.length).to.be.eql(0);
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

    it("should cascade drop nodes in graph", function () {
        carRepository = new CarRepository();
        var engineRepository = new EngineRepository();
        var serialNumber = "SN" + Date.now();
        var car = carRepository.newEntity({ parts: [{ wheels: [{ index: 1 }], engine: { serialNumber: serialNumber } }] });

        return carRepository.save(car).then(function (car) {
            car.removeParts(car.parts);

            return carRepository.remove(car).then(function () {
                return engineRepository.findAll().then(function (engines) {
                    expect(engines.length).to.be.eql(0);
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

    var tableIndex = 0;

    function createCar() {
        return CarDBMapping.Model.forge({ name: "car" + tableIndex++ }).save();
    }

    beforeEach(require("./db/setup"));
    afterEach(require("./db/teardown"));

});

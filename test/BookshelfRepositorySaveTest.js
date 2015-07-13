"use strict";

var expect = require("chai").expect;

var CarRepository = require("./db/mocks").CarRepository;
var EngineRepository = require("./db/mocks").EngineRepository;
var PartRepository = require("./db/mocks").PartRepository;

require("./db/connection");
var registry = require("./db/registry");
require("./db/mappings");

var CarDBMapping = registry.compile("CarDBMapping");
var PartDBMapping = registry.compile("PartDBMapping");
var ParkingSpaceDBMapping = registry.compile("ParkingSpaceDBMapping");
var WheelDBMapping = registry.compile("WheelDBMapping");


describe("Bookshelf Repository Save Test", function () {
    this.timeout(1000);
    var carRepository, engineRepository;

    beforeEach(function () {
        carRepository = new CarRepository().repository;
        engineRepository = new EngineRepository();
    });

    it("should persist item", function () {
        var item = CarDBMapping.Model.forge({ name: "" });

        return carRepository.save(item).then(function () {
            carRepository.findOne(item.id).then(function (fetchedItem) {
                expect(item.id).to.be.eql(fetchedItem.id);
            });
        });
    });

    it("should persist array of item", function () {
        var car1 = CarDBMapping.Model.forge({ name: "item1" });
        var car2 = CarDBMapping.Model.forge({ name: "item2" });

        return carRepository.save([car1, car2]).then(function () {
            return carRepository.findAll([car1.id, car2.id]).then(function (cars) {
                expect(car1.id).to.be.eql(cars.at(0).id);
                expect(car2.id).to.be.eql(cars.at(1).id);
            });
        });
    });

    it("should persist Collection of item", function () {
        var item1 = CarDBMapping.Model.forge({ name: "item1" });
        var item2 = CarDBMapping.Model.forge({ name: "item2" });
        var collection = CarDBMapping.Collection.forge([item1, item2]);

        return carRepository.save(collection).then(function () {
            carRepository.findAll([item1.id, item2.id]).then(function (items) {
                expect(item1.id).to.be.eql(items.at(0).id);
                expect(item2.id).to.be.eql(items.at(1).id);
            });
        });
    });

    it("should persist related items", function () {
        return createCar().then(function (item) {
            var part = PartDBMapping.Model.forge({
                car_id: item.id,
                name: "name" + Date.now()
            });
            item.relations.relation_parts = WheelDBMapping.Collection.forge(part);

            return carRepository.save(item).then(function (item) {
                return PartDBMapping.Collection.forge().fetch().then(function (parts) {
                    expect(parts.length).to.be.eql(1);
                    expect(parts.at(0).get("car_id")).to.be.eql(item.id);
                    expect(parts.at(0).get("name")).to.be.eql(part.get("name"));
                });
            });
        });
    });

    it("should persist related hasOne items", function () {
        return createCar().then(function (item) {
            var parkingSpace = ParkingSpaceDBMapping.Model.forge({
                car_id: item.id,
                name: "name" + Date.now()
            });
            item.relations.relation_parkingSpace = parkingSpace;

            return carRepository.save(item).then(function (item) {
                return ParkingSpaceDBMapping.Collection.forge().fetch().then(function (parkingSpaces) {
                    expect(parkingSpaces.length).to.be.eql(1);
                    expect(parkingSpaces.at(0).get("car_id")).to.be.eql(item.id);
                    expect(parkingSpaces.at(0).get("name")).to.be.eql(parkingSpace.get("name"));
                });
            });
        });
    });

    it("should not persist related items if cascade is false in n:1 relation", function () {
        PartDBMapping.relations[1].references.cascade = false;
        var partRepository = new PartRepository();
        var part = partRepository.newEntity();
        part.engine = part.newEngine();

        return partRepository.save(part).then(function () {
            return partRepository.findAll().then(function (parts) {
                expect(parts.length).to.be.eql(1);
                expect(parts[0].engine).to.be.eql(null);
            });
        }).finally(function () {
            PartDBMapping.relations[1].references.cascade = true;
        });
    });

    // TODO: Related Objects do not have to be saved, but key does
    it("should not persist related items if cascade is false in 1:n relation");

    it("should persist related items where root is new", function () {
        var item = CarDBMapping.Model.forge({
            name: "itname" + Date.now()
        });
        var part = PartDBMapping.Model.forge({
            name: "aname" + Date.now()
        });
        item.relations.relation_parts = PartDBMapping.Collection.forge(part);

        return carRepository.save(item).then(function (item) {
            return carRepository.findOne(item.id).then(function (fetchedItem) {
                expect(fetchedItem.get("name")).to.be.eql(item.get("name"));

                var parts = fetchedItem.relations.relation_parts;
                expect(parts.length).to.be.eql(1);
                expect(parts.at(0).get("car_id")).to.be.eql(item.id);
                expect(parts.at(0).get("name")).to.be.eql(part.get("name"));
            });
        });
    });

    it("should persist related items where foreign key is on item", function () {
        var partRepository = new PartRepository();
        var part = partRepository.newEntity();
        var name = "part" + Date.now();
        part.name = name;
        var engine = part.newEngine();
        var serialNumber = "SN" + Date.now();
        engine.serialNumber = serialNumber;
        part.engine = engine;

        return partRepository.save(part).then(function () {
            return partRepository.findAll().then(function (parts) {
                expect(parts.length).to.be.eql(1);
                expect(parts[0].name).to.be.eql(name);
                expect(parts[0].engine.serialNumber).to.be.eql(serialNumber);
            });
        });
    });

    it("should throw if related value is not saveable", function () {
        return createCar().then(function (item) {
            item.relations.relation_parts = {};

            return carRepository.save(item).then(function () {
                throw "fail";
            }).catch(function (error) {
                expect(error.message).to.match(/can not be saved/);
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

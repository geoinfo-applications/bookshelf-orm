"use strict";


describe("Bookshelf Repository Save Test", function () {
    // jshint maxstatements:false

    const expect = require("chai").expect;

    const CarRepository = require("./db/mocks").CarRepository;
    const EngineRepository = require("./db/mocks").EngineRepository;
    const PartRepository = require("./db/mocks").PartRepository;

    require("./db/connection");
    const registry = require("./db/registry");
    require("./db/mappings");

    const CarDBMapping = registry.compile("CarDBMapping");
    const PartDBMapping = registry.compile("PartDBMapping");
    const ParkingSpaceDBMapping = registry.compile("ParkingSpaceDBMapping");
    const WheelDBMapping = registry.compile("WheelDBMapping");

    this.timeout(1000);
    var carRepository, engineRepository;

    beforeEach(() => {
        carRepository = new CarRepository().repository;
        engineRepository = new EngineRepository();
    });

    it("should persist item", () => {
        var item = CarDBMapping.Model.forge({ name: "" });

        return carRepository.save(item).then(() => {
            carRepository.findOne(item.id).then((fetchedItem) => {
                expect(item.id).to.be.eql(fetchedItem.id);
            });
        });
    });

    it("should persist array of item", () => {
        var car1 = CarDBMapping.Model.forge({ name: "item1" });
        var car2 = CarDBMapping.Model.forge({ name: "item2" });

        return carRepository.save([car1, car2]).then(() => {
            return carRepository.findAll([car1.id, car2.id]).then((cars) => {
                expect(car1.id).to.be.eql(cars.at(0).id);
                expect(car2.id).to.be.eql(cars.at(1).id);
            });
        });
    });

    it("should persist Collection of item", () => {
        var item1 = CarDBMapping.Model.forge({ name: "item1" });
        var item2 = CarDBMapping.Model.forge({ name: "item2" });
        var collection = CarDBMapping.Collection.forge([item1, item2]);

        return carRepository.save(collection).then(() => {
            carRepository.findAll([item1.id, item2.id]).then((items) => {
                expect(item1.id).to.be.eql(items.at(0).id);
                expect(item2.id).to.be.eql(items.at(1).id);
            });
        });
    });

    it("should persist related items", () => {
        return createCar().then((item) => {
            var part = PartDBMapping.Model.forge({
                car_id: item.id,
                name: "name" + Date.now()
            });
            item.relations.relation_parts = WheelDBMapping.Collection.forge(part);

            return carRepository.save(item).then((item) => {
                return PartDBMapping.Collection.forge().fetch().then((parts) => {
                    expect(parts.length).to.be.eql(1);
                    expect(parts.at(0).get("car_id")).to.be.eql(item.id);
                    expect(parts.at(0).get("name")).to.be.eql(part.get("name"));
                });
            });
        });
    });

    it("should persist related hasOne items", () => {
        return createCar().then((item) => {
            var parkingSpace = ParkingSpaceDBMapping.Model.forge({
                car_id: item.id,
                name: "name" + Date.now()
            });
            item.relations.relation_parkingSpace = parkingSpace;

            return carRepository.save(item).then((item) => {
                return ParkingSpaceDBMapping.Collection.forge().fetch().then((parkingSpaces) => {
                    expect(parkingSpaces.length).to.be.eql(1);
                    expect(parkingSpaces.at(0).get("car_id")).to.be.eql(item.id);
                    expect(parkingSpaces.at(0).get("name")).to.be.eql(parkingSpace.get("name"));
                });
            });
        });
    });

    it("should not persist related items if cascade is false in n:1 relation", () => {
        PartDBMapping.relations[1].references.cascade = false;
        var partRepository = new PartRepository();
        var part = partRepository.newEntity();
        part.engine = part.newEngine();

        return partRepository.save(part).then(() => {
            return partRepository.findAll().then((parts) => {
                expect(parts.length).to.be.eql(1);
                expect(parts[0].engine).to.be.eql(null);
            });
        }).finally(() => {
            PartDBMapping.relations[1].references.cascade = true;
        });
    });

    it("should not persist related items if cascade is false in 1:n relation", () => {
        CarDBMapping.relations[0].references.cascade = false;
        var part = PartDBMapping.Model.forge({ name: "originalName" });
        var car = CarDBMapping.Model.forge({ name: "name1" });

        return part.save().then((part) => car.save().then((car) => [car, part])).then(([part, car]) => {
            part.set("name", "notToBeSaved" + Date.now());
            car.relations.relation_parts = PartDBMapping.Collection.forge(part);

            return carRepository.save(car).then((car) => {
                return PartDBMapping.Collection.forge().fetch().then((parts) => {
                    expect(parts.at(0).get("car_id")).to.be.eql(car.id);
                    expect(parts.at(0).get("name")).to.be.eql("originalName");
                });
            });
        }).finally(() => {
            CarDBMapping.relations[0].references.cascade = true;
        });
    });

    it("should persist related items where root is new", () => {
        var item = CarDBMapping.Model.forge({
            name: "itname" + Date.now()
        });
        var part = PartDBMapping.Model.forge({
            name: "aname" + Date.now()
        });
        item.relations.relation_parts = PartDBMapping.Collection.forge(part);

        return carRepository.save(item).then((item) => {
            return carRepository.findOne(item.id).then((fetchedItem) => {
                expect(fetchedItem.get("name")).to.be.eql(item.get("name"));

                var parts = fetchedItem.relations.relation_parts;
                expect(parts.length).to.be.eql(1);
                expect(parts.at(0).get("car_id")).to.be.eql(item.id);
                expect(parts.at(0).get("name")).to.be.eql(part.get("name"));
            });
        });
    });

    it("should persist related items where foreign key is on item", () => {
        var partRepository = new PartRepository();
        var part = partRepository.newEntity();
        var name = "part" + Date.now();
        part.name = name;
        var engine = part.newEngine();
        var serialNumber = "SN" + Date.now();
        engine.serialNumber = serialNumber;
        part.engine = engine;

        return partRepository.save(part).then(() => {
            return partRepository.findAll().then((parts) => {
                expect(parts.length).to.be.eql(1);
                expect(parts[0].name).to.be.eql(name);
                expect(parts[0].engine.serialNumber).to.be.eql(serialNumber);
            });
        });
    });

    it("should throw if related value is not saveable", () => {
        return createCar().then((item) => {
            item.relations.relation_parts = {};

            return carRepository.save(item).then(() => {
                throw "fail";
            }).catch((error) => {
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

"use strict";


describe("Bookshelf Repository Raw Fields Test", function () {
    // jshint maxstatements:false

    const expect = require("chai").expect;
    const CarRepository = require("./db/mocks").CarRepository;

    require("./db/connection");
    const registry = require("./db/registry");
    require("./db/mappings");

    const CarDBMapping = registry.compile("CarDBMapping");

    this.timeout(1000);
    var carRepository;

    beforeEach(() => {
        carRepository = new CarRepository().repository;
    });

    describe("findAll", () => {

        it("should return calculated field from DB", () => {
            var name = "name" + Date.now();
            var modelName = "modelName" + Date.now();
            var car = CarDBMapping.Model.forge({ name: name, model_name: modelName });
            var promise = carRepository.save(car);

            promise = promise.then(() => {
                return carRepository.findAll();
            });

            return promise.then((cars) => {
                expect(cars.length).to.be.eql(1);
                expect(cars.at(0).get("description")).to.be.eql((name + "::" + modelName).toLowerCase());
            });
        });

        it("should not return calculated field from DB if excluded", () => {
            var name = "name" + Date.now();
            var modelName = "modelName" + Date.now();
            var car = CarDBMapping.Model.forge({ name: name, model_name: modelName });
            var promise = carRepository.save(car);

            promise = promise.then(() => {
                return carRepository.findAll({ exclude: ["description"] });
            });

            return promise.then((cars) => {
                expect(cars.length).to.be.eql(1);
                expect(cars.at(0).get("description")).to.be.eql(void 0);
            });
        });

        it("should not return calculated field from DB if all excluded", () => {
            var name = "name" + Date.now();
            var modelName = "modelName" + Date.now();
            var car = CarDBMapping.Model.forge({ name: name, model_name: modelName });
            var promise = carRepository.save(car);

            promise = promise.then(() => {
                return carRepository.findAll({ exclude: ["*"] });
            });

            return promise.then((cars) => {
                expect(cars.length).to.be.eql(1);
                expect(cars.at(0).get("description")).to.be.eql(void 0);
            });
        });

    });

    describe("findOne", () => {

        it("should restore calculated field from DB", () => {
            var serialNumber = "sN" + Date.now();
            var car = CarDBMapping.Model.forge({ serial_number: serialNumber });
            var promise = carRepository.save(car);

            promise = promise.then((car) => {
                return carRepository.findOne(car.id);
            });

            return promise.then((car) => {
                expect(car.get("serial_number")).to.be.eql(serialNumber.toUpperCase());
            });
        });

        it("should not restore calculated field from DB if excluded", () => {
            var serialNumber = "sN" + Date.now();
            var car = CarDBMapping.Model.forge({ serial_number: serialNumber });
            var promise = carRepository.save(car);

            promise = promise.then((car) => {
                return carRepository.findOne(car.id, { exclude: ["serialNumber"] });
            });

            return promise.then((car) => {
                expect(car.get("serial_number")).to.be.eql(void 0);
            });
        });

        it("should not restore calculated field from DB if all excluded", () => {
            var serialNumber = "sN" + Date.now();
            var car = CarDBMapping.Model.forge({ serial_number: serialNumber });
            var promise = carRepository.save(car);

            promise = promise.then((car) => {
                return carRepository.findOne(car.id, { exclude: ["*"] });
            });

            return promise.then((car) => {
                expect(car.get("serial_number")).to.be.eql(void 0);
            });
        });

    });

    describe("save", () => {

        it("should not fail on non-writable column", () => {
            var car = CarDBMapping.Model.forge({ description: "asdf" });

            var promise = carRepository.save(car);

            return promise.then((car) => {
                expect(car.get("description")).to.be.eql("asdf");
            });
        });

        it("should save calculated field to DB", () => {
            var serialNumber = "sN" + Date.now();
            var car = CarDBMapping.Model.forge({ serial_number: serialNumber });

            var promise = carRepository.save(car);

            return promise.then(() => {
                return CarDBMapping.Collection.forge().query().select();
            }).then((cars) => {
                expect(cars.length).to.be.eql(1);
                expect(cars[0].serial_number).to.be.eql(serialNumber.toLowerCase());
            });
        });

    });

    describe("transactional", () => {

        // TODO

    });

    beforeEach(require("./db/setup"));
    afterEach(require("./db/teardown"));

});

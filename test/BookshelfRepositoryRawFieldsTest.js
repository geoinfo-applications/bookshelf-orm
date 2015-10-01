"use strict";

var expect = require("chai").expect;
var CarRepository = require("./db/mocks").CarRepository;

require("./db/connection");
var registry = require("./db/registry");
require("./db/mappings");

var CarDBMapping = registry.compile("CarDBMapping");

describe("Bookshelf Repository Raw Fields Test", function () {
    this.timeout(1000);
    var carRepository;

    beforeEach(function () {
        carRepository = new CarRepository().repository;
    });

    describe("findAll", function () {

        it("should return calculated field from DB", function () {
            var name = "name" + Date.now();
            var modelName = "modelName" + Date.now();
            var car = CarDBMapping.Model.forge({ name: name, model_name: modelName });
            var promise = carRepository.save(car);

            promise = promise.then(function () {
                return carRepository.findAll();
            });

            return promise.then(function (cars) {
                expect(cars.length).to.be.eql(1);
                expect(cars.at(0).get("description")).to.be.eql(name + "::" + modelName);
            });
        });

    });

    describe("findOne", function () {

        it("should restore calculated field from DB", function () {
            var serialNumber = "sN" + Date.now();
            var car = CarDBMapping.Model.forge({ serial_number: serialNumber });
            var promise = carRepository.save(car);

            promise = promise.then(function (car) {
                return carRepository.findOne(car.id);
            });

            return promise.then(function (car) {
                expect(car.get("serial_number")).to.be.eql(serialNumber.toUpperCase());
            });
        });

    });

    describe("save", function () {

        it("should save calculated field to DB", function () {
            var serialNumber = "sN" + Date.now();
            var car = CarDBMapping.Model.forge({ serial_number: serialNumber });

            var promise = carRepository.save(car);

            return promise.then(function () {
                return CarDBMapping.Collection.forge().query().select();
            }).then(function (cars) {
                expect(cars.length).to.be.eql(1);
                expect(cars[0].serial_number).to.be.eql(serialNumber.toLowerCase());
            });
        });

    });

    describe("transactional", function () {

        // TODO

    });

    beforeEach(require("./db/setup"));
    afterEach(require("./db/teardown"));

});

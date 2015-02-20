"use strict";

var expect = require("chai").expect;
var CarRepository = require("./db/mocks").CarRepository;
var EngineRepository = require("./db/mocks").EngineRepository;
var VeyronEngineRepository = require("./db/mocks").VeyronEngineRepository;

require("./db/connection");
var registry = require("./db/registry");
require("./db/mappings");

var CarDBMapping = registry.compile("CarDBMapping");
var PartDBMapping = registry.compile("PartDBMapping");


describe("Bookshelf Repository Test", function () {
    this.timeout(1000);
    var carRepository;

    beforeEach(function () {
        carRepository = new CarRepository().repository;
    });

    it("should be defined", function () {
        expect(CarRepository).to.be.a("function");
    });

    describe("findAll", function () {

        it("should return Collection of Cars", function () {
            return carRepository.findAll().then(function (tables) {
                expect(tables).to.be.instanceof(CarDBMapping.Collection);
            });
        });

        it("should return Collection of Cars with specified ids", function () {
            return createCar().then(function (model) {
                return carRepository.findAll([model.id]).then(function (tables) {
                    expect(tables.length).to.be.eql(1);
                    expect(tables.at(0).id).to.be.eql(model.id);
                    model.destroy();
                });
            });
        });

        it("should return all Cars", function () {
            return createCar().then(function (model1) {
                return createCar().then(function (model2) {
                    return carRepository.findAll().then(function (tables) {
                        expect(tables.length).to.be.eql(2);
                        expect(tables.at(0).id).to.be.eql(model1.id);
                        expect(tables.at(1).id).to.be.eql(model2.id);
                    });
                });
            });
        });

        it("should return instance with related data", function () {
            return createCar().then(function (model1) {
                return PartDBMapping.Model.forge({
                    car_id: model1.id,
                    name: ""
                }).save().then(function (attribute1) {
                    createCar().then(function (model2) {
                        return PartDBMapping.Model.forge({
                            car_id: model2.id,
                            name: "",
                            label: ""
                        }).save().then(function (attribute2) {
                            return carRepository.findAll().then(function (models) {
                                expect(models.at(0).related("relation_parts").length).to.be.eql(1);
                                expect(models.at(1).related("relation_parts").length).to.be.eql(1);
                                expect(models.at(0).related("relation_parts").at(0).id).to.be.eql(attribute1.id);
                                expect(models.at(1).related("relation_parts").at(0).id).to.be.eql(attribute2.id);
                            });
                        });
                    });
                });
            });
        });

        it("should return empty list if no importtables exist", function () {
            return carRepository.findAll().then(function (tables) {
                expect(tables.length).to.be.eql(0);
            });
        });

        it("should return empty list if no importtables with given ids exist", function () {
            return createCar().then(function () {
                return createCar().then(function () {
                    return carRepository.findAll([-1, -2, -3]).then(function (tables) {
                        expect(tables.length).to.be.eql(0);
                    });
                });
            });
        });

    });

    describe("findOne", function () {

        it("should return instance of Car with specified id", function () {
            return createCar().then(function (model) {
                return carRepository.findOne(model.id).then(function (fetchedModel) {
                    expect(fetchedModel).to.be.instanceof(CarDBMapping.Model);
                    expect(fetchedModel.id).to.be.eql(model.id);
                });
            });
        });

        it("should return instance with related data", function () {
            return createCar().then(function (model) {
                return PartDBMapping.Model.forge({
                    car_id: model.id,
                    name: ""
                }).save().then(function (attribute) {
                    return carRepository.findOne(model.id).then(function (model) {
                        expect(model.related("relation_parts").length).to.be.eql(1);
                        expect(model.related("relation_parts").at(0).id).to.be.eql(attribute.id);
                    });
                });
            });
        });

        it("should return null if item with given id doesn't exist", function () {
            return carRepository.findOne(-1).then(function (fetchedModel) {
                expect(fetchedModel).to.be.eql(null);
            });
        });

    });

    describe("discriminator", function () {
        var engineRepository, veyronEngineRepository, engine1, engine2;

        beforeEach(function (done) {
            engineRepository = new EngineRepository();
            veyronEngineRepository = new VeyronEngineRepository();

            engine1 = engineRepository.newEntity({ ps: 100 });
            engine2 = engineRepository.newEntity({ ps: 1000 });

            return engineRepository.save([engine1, engine2]).then(function () {
                done();
            });
        });

        it("findAll should return items which are matched by discriminator", function () {
            return veyronEngineRepository.findAll().then(function (engines) {
                expect(engines.length).to.be.eql(1);
            });
        });

        it("findOne should return item which is matched by discriminator", function () {
            return veyronEngineRepository.findOne(engine2.id).then(function (engine) {
                expect(engine.id).to.be.eql(engine2.id);
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

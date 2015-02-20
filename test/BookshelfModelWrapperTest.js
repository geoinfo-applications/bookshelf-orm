"use strict";

var Q = require("q");
var chai = require("chai");
var expect = chai.expect;
var sinon = require("sinon");
var sinonChai = require("sinon-chai");
chai.use(sinonChai);

var BookshelfModelWrapper = require("../orm/BookshelfModelWrapper");

var Car = require("./db/mocks").Car;
var Part = require("./db/mocks").Part;
var Engine = require("./db/mocks").Engine;
var CarRepository = require("./db/mocks").CarRepository;
var PartRepository = require("./db/mocks").PartRepository;

require("./db/connection");
var registry = require("./db/registry");
require("./db/mappings");

var CarDBMapping = registry.compile("CarDBMapping");
var PartDBMapping = registry.compile("PartDBMapping");


describe("Bookshelf Model Wrapper Test", function () {
    var carRepository, carWrapper, partRepository, partWrapper;
    this.timeout(1000);

    beforeEach(function () {
        carRepository = new CarRepository();
        partRepository = new PartRepository();
        carWrapper = carRepository.wrapper;
        partWrapper = partRepository.wrapper;
    });

    describe("wrap", function () {

        it("should return null if item is null", function () {
            var entity = carWrapper.wrap(null);

            expect(entity).to.be.eql(null);
        });

        describe("properties", function () {

            it("should wrap Model in Car", function () {
                var item = CarDBMapping.Model.forge({ name: "", label: "" });
                item.set("name", "testName " + Date.now());
                item.set("model_name", Date.now());

                var entity = carWrapper.wrap(item);

                expect(entity).to.be.instanceof(Car);
                expect(entity.name).to.be.eql(item.get("name"));
                expect(entity.modelName).to.be.eql(item.get("model_name"));
            });

            it("should add setters through Car to Model", function () {
                var item = CarDBMapping.Model.forge({
                    name: "",
                    model_name: ""
                });
                var entity = carWrapper.wrap(item);

                entity.name = "testName " + Date.now();
                entity.modelName = Date.now();

                expect(entity.name).to.be.eql(item.get("name"));
                expect(entity.modelName).to.be.eql(item.get("model_name"));
            });

            it("should convert underscore_space to lowerCamelCase for column names", function () {
                var entity = createCar();

                expect("modelName" in entity).to.be.eql(true);
            });

            it("should stringify JSON fileds through setter", function () {
                var thing = { date: Date.now() };
                var mapping = {
                    columns: [{
                        name: "thing",
                        type: "json"
                    }],
                    Collection: sinon.stub()
                };
                var wrapper = new BookshelfModelWrapper(mapping, sinon.stub().returnsThis());
                var item = {
                    get: sinon.stub(),
                    set: sinon.stub()
                };
                var entity = wrapper.wrap(item);

                entity.thing = thing;

                expect(item.set).to.have.been.calledWith("thing", JSON.stringify(thing));
            });

            it("should parse JSON fileds through getter", function () {
                var thing = { date: Date.now() };
                var mapping = {
                    columns: [{
                        name: "thing",
                        type: "json"
                    }],
                    Collection: sinon.stub()
                };
                var wrapper = new BookshelfModelWrapper(mapping, sinon.stub().returnsThis());
                var item = {
                    get: sinon.stub().returns(JSON.stringify(thing)),
                    set: sinon.stub()
                };
                var entity = wrapper.wrap(item);

                var thingFromEntity = entity.thing;

                expect(thingFromEntity).to.be.eql(thing);
            });

            it("should only parse JSON if value is a string", function () {
                var thing = { date: Date.now() };
                var mapping = {
                    columns: [{
                        name: "thing",
                        type: "json"
                    }],
                    Collection: sinon.stub()
                };
                var wrapper = new BookshelfModelWrapper(mapping, sinon.stub().returnsThis());
                var item = {
                    get: sinon.stub().returns(thing),
                    set: sinon.stub()
                };
                var entity = wrapper.wrap(item);

                var thingFromEntity = entity.thing;

                expect(thingFromEntity).to.be.eql(thing);
            });

        });

        describe("relations", function () {

            it("should add properties for relations", function () {
                var item = CarDBMapping.Model.forge({ name: "", label: "" });
                var entity = carWrapper.wrap(item);

                expect("parts" in entity).to.be.eql(true);
            });

            it("should add getter for related list", function () {
                return carRepository.save(createCar()).then(function (item) {
                    return PartDBMapping.Model.forge({ car_id: item.id }).save().then(function (part) {
                        return carRepository.findOne(item.id).then(function (item) {
                            expect(item.parts).to.be.an("array");
                            expect(item.parts.length).to.be.eql(1);
                            expect(item.parts[0].id).to.be.eql(part.id);
                        });
                    });
                });
            });

            it("should wrap items in related list", function () {
                return carRepository.save(createCar()).then(function (item) {
                    return PartDBMapping.Model.forge({ car_id: item.id }).save().then(function () {
                        return carRepository.findOne(item.id).then(function (item) {
                            expect(item.parts[0]).to.be.instanceof(Part);
                            expect(carWrapper.unwrap(item.parts[0])).to.be.instanceof(PartDBMapping.Model);
                        });
                    });
                });
            });

            it("changes on returned related list should not reflect in inner entity state", function () {
                return carRepository.save(createCar()).then(function (item) {
                    return carRepository.findOne(item.id).then(function (item) {
                        item.parts.push("foo");
                        expect(item.parts.length).to.be.eql(0);
                    });
                });
            });

            it("should provide modifier methods for related list", function () {
                var item = carRepository.newEntity();

                expect(item.addParts).to.be.a("function");
                expect(item.removeParts).to.be.a("function");
            });

            it("should return empty array for empty related list", function () {
                var item = carRepository.newEntity();

                expect(item.parts).to.be.an("array");
                expect(item.parts.length).to.be.eql(0);
            });

            it("should remove removed item from related list", function () {
                return carRepository.save(createCar()).then(function (item) {
                    return PartDBMapping.Model.forge({ car_id: item.id }).save().then(function () {
                        return carRepository.findOne(item.id).then(function (item) {
                            item.removeParts(item.parts[0]);
                            expect(item.parts.length).to.be.eql(0);
                        });
                    });
                });
            });

            it("should remove array of removed item from related list", function () {
                return carRepository.save(createCar()).then(function (item) {
                    return PartDBMapping.Model.forge({ car_id: item.id }).save().then(function () {
                        return carRepository.findOne(item.id).then(function (item) {
                            item.removeParts(item.parts);
                            expect(item.parts.length).to.be.eql(0);
                        });
                    });
                });
            });

            it("should add added item to related list", function () {
                return carRepository.save(createCar()).then(function (item) {
                    return PartDBMapping.Model.forge({ car_id: item.id }).save().then(function () {
                        return carRepository.findOne(item.id).then(function (item) {
                            var part = item.parts[0];
                            item.removeParts(part);
                            item.addParts(part);
                            expect(item.parts.length).to.be.eql(1);
                        });
                    });
                });
            });

            it("should link added item to this", function () {
                return carRepository.save(createCar()).then(function (item) {
                    var part = item.newParts({ name: "", label: "" });
                    item.addParts(part);

                    expect(part.item.get("car_id")).to.be.eql(item.id);
                });
            });

            it("should unlink removed item", function () {
                return carRepository.save(createCar()).then(function (item) {
                    var part = item.newParts({ name: "", label: "" });
                    item.addParts(part);

                    item.removeParts(part);

                    expect(part.item.get("car_id")).to.be.eql(null);
                });
            });

            it("should add array of added item to related list", function () {
                return carRepository.save(createCar()).then(function (item) {
                    return PartDBMapping.Model.forge({ car_id: item.id }).save().then(function () {
                        return carRepository.findOne(item.id).then(function (item) {
                            var parts = item.parts;
                            item.removeParts(parts);
                            item.addParts(parts);
                            expect(item.parts.length).to.be.eql(1);
                        });
                    });
                });
            });

            it("should add getter for related Entity", function () {
                var part = partRepository.newEntity();
                var engine = { id: Date.now() };
                partRepository.unwrap(part).relations.relation_engine = engine;

                expect(part.engine.item).to.be.equal(engine);
            });

            it("should return null from getter if related Entity is not set", function () {
                var part = partRepository.newEntity();

                var engine = part.engine;

                expect(engine).to.be.equal(null);
            });

            it("should add setter for related Entity", function () {
                var part = partRepository.newEntity();
                var engine = part.newEngine({ id: Date.now() });
                part.engine = engine;

                var item = partRepository.unwrap(part);

                expect(item.get("engine_id")).to.be.eql(engine.id);
                expect(item.related("relation_engine")).to.be.eql(engine.item);
            });

            it("should allow to set null via setter for related Entity", function () {
                var part = partRepository.newEntity();
                part.engine = null;

                var item = partRepository.unwrap(part);

                expect(item.get("engine_id")).to.be.eql(null);
                expect(item.relations.relation_engine).to.be.eql(null);
            });

            it("should throw error if relation type is not supported", function () {
                try {
                    carWrapper.Mapping.relations.push({ type: "unsupported", references: {}, name: "unsupportedRelation" });
                    createCar();
                    carWrapper.Mapping.relations.pop();
                    return Q.reject();
                } catch (error) {
                    expect(error.message).to.be.eql("Relation of type 'unsupported' not implemented");
                    carWrapper.Mapping.relations.pop();
                }
            });

        });

        describe("toJSON", function () {

            it("should create nice JSON", function () {
                return carRepository.save(createCar()).then(function (car) {
                    return PartDBMapping.Model.forge({
                        car_id: car.id,
                        name: "attrName"
                    }).save().then(function () {
                        return carRepository.findOne(car.id).then(function (importTable) {
                            importTable.name = "theName";
                            importTable.model_name = "aLabel";

                            var json = JSON.parse(JSON.stringify(importTable));

                            expect(json.name).to.be.eql("theName");
                            expect(json.model_name).to.be.eql("aLabel");
                            expect("parts" in json).to.be.eql(true);
                            expect(json.parts).to.be.an("array");
                            expect(json.parts[0].name).to.be.eql("attrName");
                        });
                    });
                });
            });

            it("should not include 'item' in JSON", function (done) {
                carRepository.save(createCar()).then(function (importTable) {
                    var json = JSON.parse(JSON.stringify(importTable));

                    expect("item" in json).to.be.eql(false);

                    done();
                }, done);
            });

        });

    });

    describe("unwrap", function () {

        it("should return Model for Car", function () {
            var item = CarDBMapping.Model.forge({ name: "", label: "", srid: 1 });
            var entity = carWrapper.wrap(item);

            var unwrappedItem = carWrapper.unwrap(entity);

            expect(item).to.be.equal(unwrappedItem);
        });

        it("should return array of Models for array of EntityClasses", function () {
            var item = CarDBMapping.Model.forge({ name: "", label: "", srid: 1 });
            var entity = carWrapper.wrap(item);

            var unwrappedItem = carWrapper.unwrap([entity]);

            expect(item).to.be.equal(unwrappedItem[0]);
        });

        it("should stringify json fields", function () {
            var thing = { date: Date.now() };
            var mapping = {
                columns: [{
                    name: "thing",
                    type: "json"
                }],
                Collection: sinon.stub()
            };
            var wrapper = new BookshelfModelWrapper(mapping, sinon.stub().returnsThis());
            var item = {
                get: sinon.stub().returns(thing),
                set: sinon.stub()
            };
            var unrwapped = wrapper.unwrap(wrapper.wrap(item));

            expect(unrwapped.set).to.have.been.calledWith("thing", JSON.stringify(thing));
        });

    });

    describe("createNew", function () {

        it("should return instanceof Entity", function () {
            var item = carWrapper.createNew();
            expect(item).to.be.instanceof(Car);
        });

        it("should set given properties on Entity", function () {
            var flatModel = {
                name: "name" + Date.now()
            };

            var item = carWrapper.createNew(flatModel);

            expect(item.name).to.be.eql(flatModel.name);
        });

        it("should set given related list of data on Entity", function () {
            var flatModel = {
                parts: [{
                    name: "name" + Date.now()
                }]
            };

            var item = carWrapper.createNew(flatModel);

            expect(item.parts[0].name).to.be.eql(flatModel.parts[0].name);
        });

        it("should set given related single item of data on list in Entity", function () {
            var flatModel = {
                engine: {
                    name: "label" + Date.now()
                }
            };

            var item = partWrapper.createNew(flatModel);

            expect(item.engine).to.be.instanceof(Engine);
            expect(item.engine.label).to.be.eql(flatModel.engine.label);
        });

    });

    function createCar() {
        return carWrapper.wrap(CarDBMapping.Model.forge({ name: "", model_name: "" }));
    }

    beforeEach(require("./db/setup"));
    afterEach(require("./db/teardown"));

});

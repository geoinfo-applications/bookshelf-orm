"use strict";


describe("Bookshelf Model Wrapper Test", function () {
    // jshint maxstatements:false

    const Q = require("q");
    const chai = require("chai");
    const expect = chai.expect;
    const sinon = require("sinon");
    const sinonChai = require("sinon-chai");
    chai.use(sinonChai);

    const BookshelfModelWrapper = require("../orm/BookshelfModelWrapper");

    const Car = require("./db/mocks").Car;
    const Part = require("./db/mocks").Part;
    const Engine = require("./db/mocks").Engine;
    const CarRepository = require("./db/mocks").CarRepository;
    const PartRepository = require("./db/mocks").PartRepository;

    require("./db/connection");
    const registry = require("./db/registry");
    require("./db/mappings");

    const CarDBMapping = registry.compile("CarDBMapping");
    const PartDBMapping = registry.compile("PartDBMapping");

    var carRepository, carWrapper, partRepository, partWrapper;
    this.timeout(1000);

    beforeEach(() => {
        carRepository = new CarRepository();
        partRepository = new PartRepository();
        carWrapper = carRepository.wrapper;
        partWrapper = partRepository.wrapper;
    });

    describe("wrap", () => {

        it("should return null if item is null", () => {
            var entity = carWrapper.wrap(null);

            expect(entity).to.be.eql(null);
        });

        describe("properties", () => {

            it("should wrap Model in Car", () => {
                var item = CarDBMapping.Model.forge({ name: "", label: "" });
                item.set("name", "testName " + Date.now());
                item.set("model_name", Date.now());

                var entity = carWrapper.wrap(item);

                expect(entity).to.be.instanceof(Car);
                expect(entity.name).to.be.eql(item.get("name"));
                expect(entity.modelName).to.be.eql(item.get("model_name"));
            });

            it("should add setters through Car to Model", () => {
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

            it("should convert underscore_space to lowerCamelCase for column names", () => {
                var entity = createCar();

                expect("modelName" in entity).to.be.eql(true);
            });

            it("should stringify JSON fileds through setter", () => {
                var thing = { date: Date.now() };
                var mapping = {
                    columnMappings: [{
                        name: "thing",
                        type: "json"
                    }],
                    relations: [],
                    Collection: sinon.stub(),
                    identifiedBy: "id"
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

            it("should parse JSON fileds through getter", () => {
                var thing = { date: Date.now() };
                var mapping = {
                    columnMappings: [{
                        name: "thing",
                        type: "json"
                    }],
                    relations: [],
                    Collection: sinon.stub(),
                    identifiedBy: "id"
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

            it("should only parse JSON if value is a string", () => {
                var thing = { date: Date.now() };
                var mapping = {
                    columnMappings: [{
                        name: "thing",
                        type: "json"
                    }],
                    relations: [],
                    Collection: sinon.stub(),
                    identifiedBy: "id"
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

        describe("relations", () => {

            it("should add properties for relations", () => {
                var item = CarDBMapping.Model.forge({ name: "", label: "" });
                var entity = carWrapper.wrap(item);

                expect("parts" in entity).to.be.eql(true);
            });

            it("should add getter for related list", () => {
                return carRepository.save(createCar()).then((item) => {
                    return PartDBMapping.Model.forge({ car_id: item.id }).save().then((part) => {
                        return carRepository.findOne(item.id).then((item) => {
                            expect(item.parts).to.be.an("array");
                            expect(item.parts.length).to.be.eql(1);
                            expect(item.parts[0].id).to.be.eql(part.id);
                        });
                    });
                });
            });

            it("should wrap items in related list", () => {
                return carRepository.save(createCar()).then((item) => {
                    return PartDBMapping.Model.forge({ car_id: item.id }).save().then(() => {
                        return carRepository.findOne(item.id).then((item) => {
                            expect(item.parts[0]).to.be.instanceof(Part);
                            expect(carWrapper.unwrap(item.parts[0])).to.be.instanceof(PartDBMapping.Model);
                        });
                    });
                });
            });

            it("changes on returned related list should not reflect in inner entity state", () => {
                return carRepository.save(createCar()).then((item) => {
                    return carRepository.findOne(item.id).then((item) => {
                        item.parts.push("foo");
                        expect(item.parts.length).to.be.eql(0);
                    });
                });
            });

            it("should provide modifier methods for related list", () => {
                var item = carRepository.newEntity();

                expect(item.addParts).to.be.a("function");
                expect(item.removeParts).to.be.a("function");
            });

            it("should return empty array for empty related list", () => {
                var item = carRepository.newEntity();

                expect(item.parts).to.be.an("array");
                expect(item.parts.length).to.be.eql(0);
            });

            it("should remove removed item from related list", () => {
                return carRepository.save(createCar()).then((item) => {
                    return PartDBMapping.Model.forge({ car_id: item.id }).save().then(() => {
                        return carRepository.findOne(item.id).then((item) => {
                            item.removeParts(item.parts[0]);
                            expect(item.parts.length).to.be.eql(0);
                        });
                    });
                });
            });

            it("should remove array of removed item from related list", () => {
                return carRepository.save(createCar()).then((item) => {
                    return PartDBMapping.Model.forge({ car_id: item.id }).save().then(() => {
                        return carRepository.findOne(item.id).then((item) => {
                            item.removeParts(item.parts);
                            expect(item.parts.length).to.be.eql(0);
                        });
                    });
                });
            });

            it("should add added item to related list", () => {
                return carRepository.save(createCar()).then((item) => {
                    return PartDBMapping.Model.forge({ car_id: item.id }).save().then(() => {
                        return carRepository.findOne(item.id).then((item) => {
                            var part = item.parts[0];
                            item.removeParts(part);
                            item.addParts(part);
                            expect(item.parts.length).to.be.eql(1);
                        });
                    });
                });
            });

            it("should link added item to this", () => {
                return carRepository.save(createCar()).then((item) => {
                    var part = item.newParts({ name: "", label: "" });
                    item.addParts(part);

                    expect(part.item.get("car_id")).to.be.eql(item.id);
                });
            });

            it("should unlink removed item", () => {
                return carRepository.save(createCar()).then((item) => {
                    var part = item.newParts({ name: "", label: "" });
                    item.addParts(part);

                    item.removeParts(part);

                    expect(part.item.get("car_id")).to.be.eql(null);
                });
            });

            it("should add array of added item to related list", () => {
                return carRepository.save(createCar()).then((item) => {
                    return PartDBMapping.Model.forge({ car_id: item.id }).save().then(() => {
                        return carRepository.findOne(item.id).then((item) => {
                            var parts = item.parts;
                            item.removeParts(parts);
                            item.addParts(parts);
                            expect(item.parts.length).to.be.eql(1);
                        });
                    });
                });
            });

            it("should add getter for related Entity", () => {
                var part = partRepository.newEntity();
                var engine = { id: Date.now() };
                partWrapper.unwrap(part).relations.relation_engine = engine;

                expect(part.engine.item).to.be.equal(engine);
            });

            it("should return null from getter if related Entity is not set", () => {
                var part = partRepository.newEntity();

                var engine = part.engine;

                expect(engine).to.be.equal(null);
            });

            it("should add setter for related Entity", () => {
                var part = partRepository.newEntity();
                var engine = part.newEngine({ id: Date.now() });
                part.engine = engine;

                var item = partWrapper.unwrap(part);

                expect(item.get("engine_id")).to.be.eql(engine.id);
                expect(item.related("relation_engine")).to.be.eql(engine.item);
            });

            it("should allow to set null via setter for related Entity", () => {
                var part = partRepository.newEntity();
                part.engine = null;

                var item = partWrapper.unwrap(part);

                expect(item.get("engine_id")).to.be.eql(null);
                expect(item.relations.relation_engine).to.be.eql(null);
            });

            it("should throw error if relation type is not supported", () => {
                try {
                    carWrapper.Mapping.relations.push({ type: "unsupported", references: { mapping: {} }, name: "unsupportedRelation" });
                    createCar();
                    carWrapper.Mapping.relations.pop();
                    return Q.reject();
                } catch (error) {
                    expect(error.message).to.be.eql("Relation of type 'unsupported' not implemented");
                    carWrapper.Mapping.relations.pop();
                }
            });

        });

        describe("toJSON", () => {

            it("should create nice JSON", () => {
                return carRepository.save(createCar()).then((car) => {
                    return PartDBMapping.Model.forge({
                        car_id: car.id,
                        name: "attrName"
                    }).save().then(() => {
                        return carRepository.findOne(car.id).then((car) => {
                            car.name = "theName";
                            car.modelName = "aLabel";

                            var json = JSON.parse(JSON.stringify(car));

                            expect(json.name).to.be.eql("theName");
                            expect(json.modelName).to.be.eql("aLabel");
                            expect("parts" in json).to.be.eql(true);
                            expect(json.parts).to.be.an("array");
                            expect(json.parts[0].name).to.be.eql("attrName");
                        });
                    });
                });
            });

            it("should not include 'item' in JSON", () => {

                var promise = carRepository.save(createCar());

                return promise.then((car) => {
                    var json = JSON.parse(JSON.stringify(car));

                    expect("item" in json).to.be.eql(false);
                });
            });

        });

    });

    describe("unwrap", () => {

        it("should return Model for Car", () => {
            var item = CarDBMapping.Model.forge({ name: "", label: "", srid: 1 });
            var entity = carWrapper.wrap(item);

            var unwrappedItem = carWrapper.unwrap(entity);

            expect(item).to.be.equal(unwrappedItem);
        });

        it("should return array of Models for array of EntityClasses", () => {
            var item = CarDBMapping.Model.forge({ name: "", label: "", srid: 1 });
            var entity = carWrapper.wrap(item);

            var unwrappedItem = carWrapper.unwrap([entity]);

            expect(item).to.be.equal(unwrappedItem[0]);
        });

        it("should stringify json fields", () => {
            var thing = { date: Date.now() };
            var mapping = {
                columnMappings: [{
                    name: "thing",
                    type: "json"
                }],
                relations: [],
                Collection: sinon.stub(),
                identifiedBy: "id"
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

    describe("createNew", () => {

        it("should return instanceof Entity", () => {
            var item = carWrapper.createNew();
            expect(item).to.be.instanceof(Car);
        });

        it("should set given properties on Entity", () => {
            var flatModel = {
                name: "name" + Date.now()
            };

            var item = carWrapper.createNew(flatModel);

            expect(item.name).to.be.eql(flatModel.name);
        });

        it("should set given related list of data on Entity", () => {
            var flatModel = {
                parts: [{
                    name: "name" + Date.now()
                }]
            };

            var item = carWrapper.createNew(flatModel);

            expect(item.parts[0].name).to.be.eql(flatModel.parts[0].name);
        });

        it("should set given related single item of data on list in Entity", () => {
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

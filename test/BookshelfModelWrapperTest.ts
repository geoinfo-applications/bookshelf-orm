"use strict";

import "mocha";
import sinonChai from "sinon-chai";
import chai, { expect } from "chai";
import Q from "q";
import sinon from "sinon";
import { Car, CarRepository, Engine, Part, PartRepository } from "./db/mocks";
import BookshelfModelWrapper from "../orm/BookshelfModelWrapper";
import "./db/connection";
import "./db/mappings";
import registry from "./db/registry";
import setup from "./db/setup";
import teardown from "./db/teardown";
import Bookshelf = require("bookshelf");


describe("Bookshelf Model Wrapper Test", () => {
    /* eslint max-statements: 0, camelcase: 0 */

    chai.use(sinonChai);
    const CarDBMapping = registry.compile("CarDBMapping");
    const PartDBMapping = registry.compile("PartDBMapping");

    let carRepository, carWrapper, partRepository, partWrapper;

    beforeEach(() => {
        carRepository = new CarRepository();
        partRepository = new PartRepository();
        carWrapper = carRepository.wrapper;
        partWrapper = partRepository.wrapper;
    });

    describe("wrap", () => {

        it("should return null if item is null", () => {
            const entity = carWrapper.wrap(null);

            expect(entity).to.be.eql(null);
        });

        describe("properties", () => {

            it("should wrap Model in Car", () => {
                const item = CarDBMapping.Model.forge({ name: "", label: "" }) as Bookshelf.Model<any>;
                item.set("name", "testName " + Date.now());
                item.set("model_name", Date.now());

                const entity = carWrapper.wrap(item);

                expect(entity).to.be.instanceof(Car);
                expect(entity.name).to.be.eql(item.get("name"));
                expect(entity.modelName).to.be.eql(item.get("model_name"));
            });

            it("should add setters through Car to Model", () => {
                const item = CarDBMapping.Model.forge({
                    name: "",
                    model_name: ""
                })  as Bookshelf.Model<any>;
                const entity = carWrapper.wrap(item);

                entity.name = "testName " + Date.now();
                entity.modelName = Date.now();

                expect(entity.name).to.be.eql(item.get("name"));
                expect(entity.modelName).to.be.eql(item.get("model_name"));
            });

            it("should convert underscore_space to lowerCamelCase for column names", () => {
                const entity = createCar();

                expect("modelName" in entity).to.be.eql(true);
            });

            it("should stringify JSON fileds through setter", () => {
                const thing = { date: Date.now() };
                const mapping = {
                    columnMappings: [{
                        name: "thing",
                        type: "json"
                    }],
                    relations: [],
                    Collection: sinon.stub(),
                    identifiedBy: "id"
                };
                const wrapper = new BookshelfModelWrapper(mapping as any, sinon.stub().returnsThis());
                const item = {
                    get: sinon.stub(),
                    set: sinon.stub()
                };
                const entity = wrapper.wrap(item as any);

                entity.thing = thing;

                expect(item.set).to.have.been.calledWith("thing", JSON.stringify(thing));
            });

            it("should parse JSON fileds through getter", () => {
                const thing = { date: Date.now() };
                const mapping = {
                    columnMappings: [{
                        name: "thing",
                        type: "json"
                    }],
                    relations: [],
                    Collection: sinon.stub(),
                    identifiedBy: "id"
                };
                const wrapper = new BookshelfModelWrapper(mapping as any, sinon.stub().returnsThis());
                const item = {
                    get: sinon.stub().returns(JSON.stringify(thing)),
                    set: sinon.stub()
                };
                const entity = wrapper.wrap(item as any);

                const thingFromEntity = entity.thing;

                expect(thingFromEntity).to.be.eql(thing);
            });

            it("should only parse JSON if value is a string", () => {
                const thing = { date: Date.now() };
                const mapping = {
                    columnMappings: [{
                        name: "thing",
                        type: "json"
                    }],
                    relations: [],
                    Collection: sinon.stub(),
                    identifiedBy: "id"
                };
                const wrapper = new BookshelfModelWrapper(mapping as any, sinon.stub().returnsThis());
                const item = {
                    get: sinon.stub().returns(thing),
                    set: sinon.stub()
                };
                const entity = wrapper.wrap(item as any);

                const thingFromEntity = entity.thing;

                expect(thingFromEntity).to.be.eql(thing);
            });

        });

        describe("relations", () => {

            it("should add properties for relations", () => {
                const item = CarDBMapping.Model.forge({ name: "", label: "" });
                const entity = carWrapper.wrap(item);

                expect("parts" in entity).to.be.eql(true);
            });

            it("should add getter for related list", () => {
                return carRepository.save(createCar()).then((item) => {
                    return PartDBMapping.Model.forge<Bookshelf.Model<any>>({ car_id: item.id }).save().then((part) => {
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
                    return PartDBMapping.Model.forge<Bookshelf.Model<any>>({ car_id: item.id }).save().then(() => {
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
                const item = carRepository.newEntity();

                expect(item.addParts).to.be.a("function");
                expect(item.removeParts).to.be.a("function");
            });

            it("should return empty array for empty related list", () => {
                const item = carRepository.newEntity();

                expect(item.parts).to.be.an("array");
                expect(item.parts.length).to.be.eql(0);
            });

            it("should remove removed item from related list", () => {
                return carRepository.save(createCar()).then((item) => {
                    return PartDBMapping.Model.forge<Bookshelf.Model<any>>({ car_id: item.id }).save().then(() => {
                        return carRepository.findOne(item.id).then((item) => {
                            item.removeParts(item.parts[0]);
                            expect(item.parts.length).to.be.eql(0);
                        });
                    });
                });
            });

            it("should remove array of removed item from related list", () => {
                return carRepository.save(createCar()).then((item) => {
                    return PartDBMapping.Model.forge<Bookshelf.Model<any>>({ car_id: item.id }).save().then(() => {
                        return carRepository.findOne(item.id).then((item) => {
                            item.removeParts(item.parts);
                            expect(item.parts.length).to.be.eql(0);
                        });
                    });
                });
            });

            it("should add added item to related list", () => {
                return carRepository.save(createCar()).then((item) => {
                    return PartDBMapping.Model.forge<Bookshelf.Model<any>>({ car_id: item.id }).save().then(() => {
                        return carRepository.findOne(item.id).then((item) => {
                            const part = item.parts[0];
                            item.removeParts(part);
                            item.addParts(part);
                            expect(item.parts.length).to.be.eql(1);
                        });
                    });
                });
            });

            it("should link added item to this", () => {
                return carRepository.save(createCar()).then((item) => {
                    const part = item.newParts({ name: "", label: "" });
                    item.addParts(part);

                    expect(part.item.get("car_id")).to.be.eql(item.id);
                });
            });

            it("should unlink removed item", () => {
                return carRepository.save(createCar()).then((item) => {
                    const part = item.newParts({ name: "", label: "" });
                    item.addParts(part);

                    item.removeParts(part);

                    expect(part.item.get("car_id")).to.be.eql(null);
                });
            });

            it("should add array of added item to related list", () => {
                return carRepository.save(createCar()).then((item) => {
                    return PartDBMapping.Model.forge<Bookshelf.Model<any>>({ car_id: item.id }).save().then(() => {
                        return carRepository.findOne(item.id).then((item) => {
                            const parts = item.parts;
                            item.removeParts(parts);
                            item.addParts(parts);
                            expect(item.parts.length).to.be.eql(1);
                        });
                    });
                });
            });

            it("should add getter for related Entity", () => {
                const part = partRepository.newEntity();
                const engine = { id: Date.now() };
                partWrapper.unwrap(part).relations.relation_engine = engine;

                expect(part.engine.item).to.be.equal(engine);
            });

            it("should return null from getter if related Entity is not set", () => {
                const part = partRepository.newEntity();

                const engine = part.engine;

                expect(engine).to.be.equal(null);
            });

            it("should add setter for related Entity", () => {
                const part = partRepository.newEntity();
                const engine = part.newEngine({ id: Date.now() });
                part.engine = engine;

                const item = partWrapper.unwrap(part);

                expect(item.get("engine_id")).to.be.eql(engine.id);
                expect(item.related("relation_engine")).to.be.eql(engine.item);
            });

            it("should allow to set null via setter for related Entity", () => {
                const part = partRepository.newEntity();
                part.engine = null;

                const item = partWrapper.unwrap(part);

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
                    return PartDBMapping.Model.forge<Bookshelf.Model<any>>({
                        car_id: car.id,
                        name: "attrName"
                    }).save().then(() => {
                        return carRepository.findOne(car.id).then((car) => {
                            car.name = "theName";
                            car.modelName = "aLabel";

                            const json = JSON.parse(JSON.stringify(car));

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

                const promise = carRepository.save(createCar());

                return promise.then((car) => {
                    const json = JSON.parse(JSON.stringify(car));

                    expect("item" in json).to.be.eql(false);
                });
            });

        });

    });

    describe("unwrap", () => {

        it("should return Model for Car", () => {
            const item = CarDBMapping.Model.forge({ name: "", label: "", srid: 1 });
            const entity = carWrapper.wrap(item);

            const unwrappedItem = carWrapper.unwrap(entity);

            expect(item).to.be.equal(unwrappedItem);
        });

        it("should return array of Models for array of EntityClasses", () => {
            const item = CarDBMapping.Model.forge({ name: "", label: "", srid: 1 });
            const entity = carWrapper.wrap(item);

            const unwrappedItem = carWrapper.unwrap([entity]);

            expect(item).to.be.equal(unwrappedItem[0]);
        });

        it("should stringify json fields", () => {
            const thing = { date: Date.now() };
            const mapping = {
                columnMappings: [{
                    name: "thing",
                    type: "json"
                }],
                relations: [],
                Collection: sinon.stub(),
                identifiedBy: "id"
            };
            const wrapper = new BookshelfModelWrapper(mapping as any, sinon.stub().returnsThis());
            const item = {
                get: sinon.stub().returns(thing),
                set: sinon.stub()
            };
            const unrwapped = wrapper.unwrap(wrapper.wrap(item as any));

            expect(unrwapped.set).to.have.been.calledWith("thing", JSON.stringify(thing));
        });

    });

    describe("createNew", () => {

        it("should return instanceof Entity", () => {
            const item = carWrapper.createNew();
            expect(item).to.be.instanceof(Car);
        });

        it("should set given properties on Entity", () => {
            const flatModel = {
                name: "name" + Date.now()
            };

            const item = carWrapper.createNew(flatModel);

            expect(item.name).to.be.eql(flatModel.name);
        });

        it("should set given related list of data on Entity", () => {
            const flatModel = {
                parts: [{
                    name: "name" + Date.now()
                }]
            };

            const item = carWrapper.createNew(flatModel);

            expect(item.parts[0].name).to.be.eql(flatModel.parts[0].name);
        });

        it("should set given related single item of data on list in Entity", () => {
            const flatModel = {
                engine: {
                    serialNumber: "label" + Date.now()
                }
            };

            const item = partWrapper.createNew(flatModel);

            expect(item.engine).to.be.instanceof(Engine);
            expect(item.engine.serialNumber).to.be.eql(flatModel.engine.serialNumber);
        });

    });

    describe("defineColumnProperty", () => {

        it("shouldn't stringify null values", () => {
            const mapping = {
                columnMappings: [{
                    name: "thing",
                    type: "json"
                }],
                relations: [],
                Collection: sinon.stub(),
                identifiedBy: "id"
            };
            const wrapper = new BookshelfModelWrapper(mapping as any, sinon.stub().returnsThis());

            let privateValue = undefined;
            const item = {
                get: () => {
                    return privateValue;
                },
                set: (_name, value) => {
                    privateValue = value;
                }
            };
            const entity = wrapper.wrap(item as any);
            entity.thing = null;
            expect(item.get()).to.be.eql(null);
        });

    });

    function createCar() {
        return carWrapper.wrap(CarDBMapping.Model.forge({ name: "", model_name: "" }));
    }

    beforeEach(setup);
    afterEach(teardown);

});

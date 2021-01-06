"use strict";


/* eslint max-statements: 0 */
import chai, { expect } from "chai";
import sinon from "sinon";
import sinonChai from "sinon-chai";
import { Car, CarRepository } from "./db/mocks";
import "./db/connection";
import registry from "./db/registry";
import "./db/mappings";
import setup from "./db/setup";
import teardown from "./db/teardown";


describe("Entity Repository Test", () => {
    chai.use(sinonChai);

    const CarDBMapping = registry.compile("CarDBMapping");

    let carRepository;

    beforeEach(() => {
        carRepository = new CarRepository();
    });

    it("should be defined", () => {
        expect(CarRepository).to.be.a("function");
    });

    describe("findAll", () => {

        it("should return array of Cars with specified ids", () => {
            return carRepository.save(createCar()).then((model) => {
                return carRepository.findAll([model.id]).then((tables) => {
                    expect(tables.length).to.be.eql(1);
                    expect(tables[0].id).to.be.eql(model.id);
                });
            });
        });

        it("should return all Cars", () => {
            return carRepository.save(createCar()).then((model1) => {
                return carRepository.save(createCar()).then((model2) => {
                    return carRepository.findAll().then((tables) => {
                        expect(tables.length).to.be.eql(2);
                        expect(tables[0].id).to.be.eql(model1.id);
                        expect(tables[1].id).to.be.eql(model2.id);
                    });
                });
            });
        });

        it("should not include excluded relations", () => {
            const options = { exclude: ["parts"] };
            const car = carRepository.newEntity({ name: "", label: "" });
            car.addParts(car.newParts({ name: "", label: "" }));
            let promise = carRepository.save(car);

            promise = promise.then(() => {
                return carRepository.findAll(options);
            });

            return promise.then((cars) => {
                expect(cars[0].parts.length).to.be.eql(0);
            });
        });

        it("should not include excluded relations", () => {
            const options = { exclude: ["parts"] };
            const car = carRepository.newEntity({ name: "", label: "" });
            car.addParts(car.newParts({ name: "", label: "" }));
            let promise = carRepository.save(car);

            promise = promise.then((car) => {
                return carRepository.findAll([car.id], options);
            });

            return promise.then((cars) => {
                expect(cars[0].parts.length).to.be.eql(0);
            });
        });

    });

    describe("findOne", () => {

        it("should return instance of EntityClass with specified id", () => {
            return carRepository.save(createCar()).then((model) => {
                return carRepository.findOne(model.id).then((fetchedModel) => {
                    expect(fetchedModel).to.be.instanceof(Car);
                    expect(fetchedModel.id).to.be.eql(model.id);
                });
            });
        });

        it("should fetch relations deeply", () => {
            const car = carRepository.newEntity({
                parts: [{
                    wheels: [{ index: 0 }, { index: 1 }]
                }
                ]
            });

            return carRepository.save(car).then((car) => {
                return carRepository.findOne(car.id).then((car) => {
                    expect("parts" in car);
                    expect(car.parts.length).to.be.eql(1);
                    expect("wheels" in car.parts[0]);
                    expect(car.parts[0].wheels.length).to.be.eql(2);
                });
            });
        });

        it("should not include excluded relations", () => {
            const options = { exclude: ["parts"] };
            const car = carRepository.newEntity({ name: "", label: "" });
            car.addParts(car.newParts({ name: "", label: "" }));
            let promise = carRepository.save(car);

            promise = promise.then((car) => {
                return carRepository.findOne(car.id, options);
            });

            return promise.then((car) => {
                expect(car.parts.length).to.be.eql(0);
            });
        });

    });

    describe("exists", () => {

        it("should return instance of EntityClass with specified id", () => {
            return carRepository.save(createCar()).then((model) => {
                return carRepository.findOne(model.id).then((fetchedModel) => {
                    expect(fetchedModel).to.be.instanceof(Car);
                    expect(fetchedModel.id).to.be.eql(model.id);
                });
            });
        });

        it("should return true if item with given id exists", () => {
            return carRepository.save(createCar()).then((model) => {
                return carRepository.exists(model.id).then((exists) => {
                    expect(exists).to.be.equal(true);
                });
            });
        });

        it("should return false if item with given id doesn't exist", () => {
            return carRepository.exists(123).then((exists) => {
                expect(exists).to.be.equal(false);
            });
        });

        it("should return false if id is null", () => {
            return carRepository.exists(null).then((exists) => {
                expect(exists).to.be.equal(false);
            });
        });

    });

    describe("save", () => {

        it("should return EntityClass", () => {
            const item = createCar();

            return carRepository.save(item).then((saved) => {
                expect(saved).to.be.instanceof(Car);
            });
        });

        it("should return array of EntityClass", () => {
            const item1 = createCar();
            const item2 = createCar();

            return carRepository.save([item1, item2]).then((saved) => {
                expect(saved).to.be.an("array");
                expect(saved.length).to.eql(2);
                expect(saved[0]).to.be.instanceof(Car);
                expect(saved[1]).to.be.instanceof(Car);
            });
        });

        it("should persist item", () => {
            const item = createCar();

            return carRepository.save(item).then((item) => {
                return carRepository.findOne(item.id).then((fetchedItem) => {
                    expect(item.id).to.be.eql(fetchedItem.id);
                });
            });
        });

        it("should persist array of item", () => {
            const item1 = createCar();
            const item2 = createCar();

            return carRepository.save([item1, item2]).then((savedItems) => {
                carRepository.findAll([savedItems[0].id, savedItems[1].id]).then((items) => {
                    expect(savedItems[0].id).to.be.eql(items[0].id);
                    expect(savedItems[1].id).to.be.eql(items[1].id);
                });
            });
        });

        it("should persist related items", () => {
            const name = `partname${Date.now()}`;
            const car = carRepository.newEntity({
                parts: [{
                    name: name,
                    wheels: [{ index: 0 }, { index: 1 }]
                }
                ]
            });

            return carRepository.save(car).then((car) => {
                return carRepository.findOne(car.id).then((car) => {
                    expect(car.parts[0].name).to.be.eql(name);
                });
            });
        });

        it("should insert when id is set and isNew() returns true", async () => {
            const carWash = { id: "913d8505-2bda-4f72-b528-8f0603157ab7", name: "uniqueCarWash" };
            const item = carRepository.newEntity({ name: "car" + tableIndex++, carWash });

            const savedItem = await carRepository.save(item);
            const fetchedItem = await carRepository.findOne(savedItem.id);
            expect(savedItem.id).to.be.eql(fetchedItem.id);
        });

        it("should update when id is set and isNew() returns false", async () => {
            const carWash = { id: "95ee518b-233a-49a3-b4cc-849ed18e6196", name: "uniqueCarWash" };
            const item = carRepository.newEntity({ name: "car" + tableIndex++, carWash });

            const savedItem1 = await carRepository.save(item);
            savedItem1.name = "uniqueCarWash 2.0";
            const savedItem2 = await carRepository.save(savedItem1);

            expect(savedItem2.name).to.be.eql("uniqueCarWash 2.0");
        });

        it("should throw error when id is set but isNew() doesn't exist on mapping", async () => {
            try {
                const parkingSpace = { id: 5, name: "uniqueParkingSpace" };
                const item = carRepository.newEntity({ name: "car" + tableIndex++, parkingSpace });

                await carRepository.save(item);

                throw new Error("should fail");
            } catch (error) {
                expect(error.message).to.match(/No Rows Updated/);
            }
        });

    });

    describe("hooks", () => {

        it("should call afterSave, with saved entity id", () => {
            const car = carRepository.newEntity();
            carRepository.afterSave = sinon.stub();

            const promise = carRepository.save(car);

            return promise.then(() => {
                expect(carRepository.afterSave).to.have.been.calledWith(car.id);
            });
        });

        it("should call afterSave, with saved array of entity id", () => {
            const car1 = carRepository.newEntity();
            const car2 = carRepository.newEntity();
            carRepository.afterSave = sinon.stub();

            const promise = carRepository.save([car1, car2]);

            return promise.then(() => {
                expect(carRepository.afterSave).to.have.callCount(2);
                expect(carRepository.afterSave).to.have.been.calledWith(car1.id);
                expect(carRepository.afterSave).to.have.been.calledWith(car2.id);
            });
        });

        it("should call afterRemove, with removed entity id", () => {
            const car = carRepository.newEntity();
            carRepository.afterRemove = sinon.stub();
            let promise = carRepository.save(car);

            promise = promise.then((car) => {
                return carRepository.remove(car);
            });

            return promise.then(() => {
                expect(carRepository.afterRemove).to.have.been.calledWith(car.id);
            });
        });

        it("should call afterRemove, with removed id", () => {
            const car = carRepository.newEntity();
            carRepository.afterRemove = sinon.stub();
            let promise = carRepository.save(car);

            promise = promise.then((car) => {
                return carRepository.remove(car.id);
            });

            return promise.then(() => {
                expect(carRepository.afterRemove).to.have.been.calledWith(car.id);
            });
        });

        it("should call afterRemove, with removed array of id", () => {
            const car1 = carRepository.newEntity();
            const car2 = carRepository.newEntity();
            carRepository.afterRemove = sinon.stub();
            let promise = carRepository.save([car1, car2]);

            promise = promise.then(() => {
                return carRepository.remove([car1.id, car2.id]);
            });

            return promise.then(() => {
                expect(carRepository.afterRemove).to.have.callCount(2);
                expect(carRepository.afterRemove).to.have.been.calledWith(car1.id);
                expect(carRepository.afterRemove).to.have.been.calledWith(car2.id);
            });
        });

        it("should call afterRemove, with removed array of entity", () => {
            const car1 = carRepository.newEntity();
            const car2 = carRepository.newEntity();
            carRepository.afterRemove = sinon.stub();
            let promise = carRepository.save([car1, car2]);

            promise = promise.then(() => {
                return carRepository.remove([car1, car2]);
            });

            return promise.then(() => {
                expect(carRepository.afterRemove).to.have.callCount(2);
                expect(carRepository.afterRemove).to.have.been.calledWith(car1.id);
                expect(carRepository.afterRemove).to.have.been.calledWith(car2.id);
            });
        });

        it("should not call afterRemove, if entity was unsaved", () => {
            const car = carRepository.newEntity();
            carRepository.afterRemove = sinon.stub();

            const promise = carRepository.remove(car.id);

            return promise.then(() => {
                expect(carRepository.afterRemove).to.have.callCount(0);
            });
        });

    });

    describe("remove", () => {

        it("should drop item", () => {
            return carRepository.save(createCar()).then((item) => {
                return carRepository.remove(item).then(() => {
                    return carRepository.findAll().then((items) => {
                        expect(items.length).to.be.eql(0);
                    });
                });
            });
        });

        it("should drop item specified by id", () => {
            return carRepository.save(createCar()).then((item) => {
                return carRepository.remove(item.id).then(() => {
                    return carRepository.findAll().then((items) => {
                        expect(items.length).to.be.eql(0);
                    });
                });
            });
        });

        it("should drop array of item", () => {
            const item1 = createCar();
            const item2 = createCar();

            return carRepository.save([item1, item2]).then((items) => {
                return carRepository.remove(items).then(() => {
                    return carRepository.findAll().then((items) => {
                        expect(items.length).to.be.eql(0);
                    });
                });
            });
        });

        it("should drop array of items specified by id", () => {
            const item1 = createCar();
            const item2 = createCar();

            return carRepository.save([item1, item2]).then((items) => {
                return carRepository.remove([items[0].id, items[1].id]).then(() => {
                    return carRepository.findAll().then((items) => {
                        expect(items.length).to.be.eql(0);
                    });
                });
            });
        });

        it("should drop unsaved item", () => {
            const item = createCar();

            return carRepository.remove(item).then(() => {
                return carRepository.findAll().then((items) => {
                    expect(items.length).to.be.eql(0);
                });
            });
        });

    });

    describe("wrap", () => {

        it("should wrap Model in EntityClass", () => {
            const item = CarDBMapping.Model.forge({ name: "", label: "", srid: 1 });

            const entity = carRepository.wrapper.wrap(item);

            expect(entity).to.be.instanceof(Car);
        });

    });

    describe("unwrap", () => {

        it("should return Model for EntityClass", () => {
            const item = CarDBMapping.Model.forge({ name: "", label: "", srid: 1 });
            const entity = carRepository.wrapper.wrap(item);

            const unwrappedItem = carRepository.wrapper.unwrap(entity);

            expect(item).to.be.equal(unwrappedItem);
        });

    });

    describe("newEntity", () => {

        it("should return new Entity", () => {
            const entity = carRepository.newEntity();

            expect(entity).to.be.instanceof(Car);
        });

        it("should return wrapped and initialized Entity", () => {
            const entity = carRepository.newEntity();

            const model = carRepository.wrapper.unwrap(entity);
            model.set("name", `name ${Date.now()}`);

            expect(entity.name).to.be.eql(model.get("name"));
        });

        it("should call constructor with given arguments", () => {
            const testArgs = [{}, "a", 0];
            carRepository.Entity = function (...actualArgs) {
                expect(testArgs).to.be.eql(actualArgs);
            };

            carRepository.newEntity(...testArgs);
        });

        it("should call constructor after initialization", () => {
            carRepository.Entity = class {
                private item;
                constructor() {
                    expect(this.item).to.be.instanceof(CarDBMapping.Model);
                    expect("name" in this).to.be.eql(true);
                }
            };

            carRepository.newEntity();
        });

        it("should call model.forge with given argument", () => {
            const forgeArgument = {
                name: `thename${Date.now()}`,
                modelName: `theLabel${Date.now()}`
            };

            const entity = carRepository.newEntity(forgeArgument);

            expect(carRepository.wrapper.unwrap(entity).get("name")).to.be.eql(forgeArgument.name);
            expect(carRepository.wrapper.unwrap(entity).get("model_name")).to.be.eql(forgeArgument.modelName);
        });

        it("should reconstruct relations", () => {
            const entity = carRepository.newEntity({
                name: "tablename",
                parts: [{ name: "attr1name" }, { name: "attr2name" }]
            });

            const item = carRepository.wrapper.unwrap(entity);

            expect(item.get("parts")).to.be.eql(void 0);
            expect(item.related("relation_parts").length).to.be.eql(2);
            expect(item.related("relation_parts").at(0).get("name")).to.be.eql("attr1name");
            expect(item.related("relation_parts").at(1).get("name")).to.be.eql("attr2name");
        });

    });

    describe("findAllWhere", () => {

        it("should fetch entities matched by query", () => {
            const car1 = carRepository.newEntity({ name: "abc" });
            const car2 = carRepository.newEntity({ name: "efg" });
            let promise = carRepository.save([car1, car2]);

            promise = promise.then(() => {
                return carRepository.findAllWhere((q) => {
                    q.where("name", "abc");
                });
            });

            return promise.then((cars) => {
                expect(cars.length).to.be.eql(1);
                expect(cars[0].name).to.be.eql("abc");
            });
        });

        it("should wrap entity", () => {
            const car1 = carRepository.newEntity({ name: "abc" });
            let promise = carRepository.save(car1);

            promise = promise.then(() => {
                return carRepository.findAllWhere((q) => {
                    q.where("name", "abc");
                });
            });

            return promise.then((cars) => {
                expect(cars[0]).to.be.an.instanceof(Car);
            });
        });

        it("should return an empty array if no item was found", () => {

            const promise = carRepository.findAllWhere((q) => {
                q.where("name", "abc");
            });

            return promise.then((cars) => {
                expect(cars).to.be.an("array");
                expect(cars.length).to.be.eql(0);
            });
        });

        it("should not include excluded relations", () => {
            const options = { exclude: ["parts"] };
            const car = carRepository.newEntity({ name: "name", label: "abc" });
            car.addParts(car.newParts({ name: "", label: "" }));
            let promise = carRepository.save(car);

            promise = promise.then(() => {
                return carRepository.findAllWhere((q) => {
                    q.where("name", "name");
                }, options);
            });

            return promise.then((cars) => {
                expect(cars[0].parts.length).to.be.eql(0);
            });
        });

    });

    describe("findWhere", () => {

        it("should fetch entities matched by query", () => {
            const car1 = carRepository.newEntity({ name: "abc" });
            const car2 = carRepository.newEntity({ name: "efg" });
            let promise = carRepository.save([car1, car2]);

            promise = promise.then(() => {
                return carRepository.findWhere((q) => {
                    q.where("name", "abc");
                });
            });

            return promise.then((car) => {
                expect(car.name).to.be.eql("abc");
            });
        });

        it("should wrap entity", () => {
            const car1 = carRepository.newEntity({ name: "abc" });
            let promise = carRepository.save(car1);

            promise = promise.then(() => {
                return carRepository.findWhere((q) => {
                    q.where("name", "abc");
                });
            });

            return promise.then((car) => {
                expect(car).to.be.an.instanceof(Car);
            });
        });

        it("should return null if no item was found", () => {

            const promise = carRepository.findWhere((q) => {
                q.where("name", "abc");
            });

            return promise.then((car) => {
                expect(car).to.be.eql(null);
            });
        });

        it("should return last match if multiple items were found", () => {
            const car1 = carRepository.newEntity({ name: "abc" });
            const car2 = carRepository.newEntity({ name: "efg" });
            let promise = carRepository.save([car1, car2]);

            promise = promise.then(() => {
                return carRepository.findWhere((q) => {
                    q.whereNotNull("name");
                    q.orderBy("name");
                });
            });

            return promise.then((car) => {
                expect(car.name).to.be.eql("efg");
            });
        });

        it("should not include excluded relations", () => {
            const options = { exclude: ["parts"] };
            const car = carRepository.newEntity({ name: "name", label: "abc" });
            car.addParts(car.newParts({ name: "", label: "" }));
            let promise = carRepository.save(car);

            promise = promise.then(() => {
                return carRepository.findWhere((q) => {
                    q.where("name", "name");
                }, options);
            });

            return promise.then((cars) => {
                expect(cars.parts.length).to.be.eql(0);
            });
        });
    });

    describe("findByConditions", () => {
        let car1, car2, car3, car1Entity, car2Entity, car3Entity;

        beforeEach(() => {

            car1 = { name: "car1", modelName: "carLabel1", ownerId: 1, parts: [{ wheels: [{ index: 1 }], engine: { serialNumber: "asdf234" } }] };
            car2 = { name: "car2", modelName: "carLabel2", ownerId: 2, parts: [{ wheels: [{ index: 2 }], engine: { serialNumber: "asdf789" } }] };
            car3 = { name: "car3", modelName: "carLabel3", ownerId: 2, parts: [{ wheels: [{ index: 1 }], engine: { serialNumber: "asdf100" } }] };

            car1Entity = carRepository.newEntity(car1);
            car2Entity = carRepository.newEntity(car2);
            car3Entity = carRepository.newEntity(car3);
        });

        it("should return object with all properties", () => {
            const condition = [
                {
                    name: "name",
                    query: (q) => q.where("car.name", car1.name)
                }
            ];

            const promise = carRepository.save([car1Entity, car2Entity]).then(() => {
                return carRepository.findByConditions(condition, void 0);
            });

            return promise.then((cars) => {
                expect(cars.length).to.be.eql(1);
                expect(cars[0]).to.have.any.keys("name", "description", "modelName", "parts", "serialNumber", "ownerId");
                expect(cars[0].parts).to.be.an("array");
                expect(cars[0].parts[0]).to.have.any.keys("engine", "wheels");
                expect(cars[0].parts[0].engine).to.have.any.keys("ps", "injection", "serialNumber");
                expect(cars[0].parts[0].wheels).to.be.an("array");
                expect(cars[0].parts[0].wheels[0]).to.have.any.keys("index");
            });
        });

        it("should return item by condition name", () => {
            const condition = [
                {
                    name: "name",
                    query: (q) => q.where("car.name", car1.name)
                }
            ];

            const promise = carRepository.save([car1Entity, car2Entity]).then(() => {
                return carRepository.findByConditions(condition, void 0);
            });

            return promise.then((cars) => {
                expect(cars.length).to.be.eql(1);
                expect(cars[0].name).to.be.eql(car1.name);
            });
        });

        it("should return item by condition in mapped relation table", () => {
            const condition = [{
                name: "wheels",
                query: (q) => q.where("engine.serial_number", "asdf789")
            }];

            const promise = carRepository.save([car1Entity, car2Entity]).then(() => {
                return carRepository.findByConditions(condition, void 0);
            });

            return promise.then((cars) => {
                expect(cars.length).to.be.eql(1);
                expect(cars[0].name).to.be.eql(car2.name);
            });
        });

        it("should return items that satisfy all conditions (AND clause)", () => {
            const condition = [
                {
                    name: "wheels",
                    query: (q) => q.where("index", 1)
                },
                {
                    name: "owner",
                    query: (q) => q.where("car.model_name", "carLabel1")
                }
            ];

            const promise = carRepository.save([car1Entity, car2Entity, car3Entity]).then(() => {
                return carRepository.findByConditions(condition, void 0);
            });

            return promise.then((cars) => {
                expect(cars.length).to.be.eql(1);
                expect(cars[0].name).to.be.eql(car1.name);
            });
        });

        it("should exclude relations from options.exclude", () => {
            const condition = [
                {
                    name: "name",
                    query: (q) => q.where("car.name", car1.name)
                }
            ];

            const options = { exclude: ["parts"] };

            const promise = carRepository.save([car1Entity, car2Entity]).then(() => {
                return carRepository.findByConditions(condition, options);
            });

            return promise.then((cars) => {
                expect(cars.length).to.be.eql(1);
                expect(cars[0].name).to.be.eql(car1.name);
                expect(cars[0].parts.length).to.be.eql(0);
            });
        });
    });

    let tableIndex = 0;

    function createCar() {
        return carRepository.newEntity({ name: "car" + tableIndex++ });
    }

    beforeEach(setup);
    afterEach(teardown);

});

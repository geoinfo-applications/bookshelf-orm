"use strict";


describe("Entity Repository Test", function () {
    // jshint maxstatements:false

    const _ = require("underscore");
    const Q = require("q");
    const chai = require("chai");
    const expect = chai.expect;
    const sinon = require("sinon");
    const sinonChai = require("sinon-chai");
    chai.use(sinonChai);

    const Car = require("./db/mocks").Car;
    const CarRepository = require("./db/mocks").CarRepository;

    require("./db/connection");
    const registry = require("./db/registry");
    require("./db/mappings");

    const CarDBMapping = registry.compile("CarDBMapping");

    this.timeout(1000);
    var carRepository;

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
            var options = { exclude: ["parts"] };
            var car = carRepository.newEntity({ name: "", label: "" });
            car.addParts(car.newParts({ name: "", label: "" }));
            var promise = carRepository.save(car);

            promise = promise.then(() => {
                return carRepository.findAll(options);
            });

            return promise.then((cars) => {
                expect(cars[0].parts.length).to.be.eql(0);
            });
        });

        it("should not include excluded relations", () => {
            var options = { exclude: ["parts"] };
            var car = carRepository.newEntity({ name: "", label: "" });
            car.addParts(car.newParts({ name: "", label: "" }));
            var promise = carRepository.save(car);

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
            var car = carRepository.newEntity({
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
            var options = { exclude: ["parts"] };
            var car = carRepository.newEntity({ name: "", label: "" });
            car.addParts(car.newParts({ name: "", label: "" }));
            var promise = carRepository.save(car);

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
            var item = createCar();

            return carRepository.save(item).then((saved) => {
                expect(saved).to.be.instanceof(Car);
            });
        });

        it("should return array of EntityClass", () => {
            var item1 = createCar();
            var item2 = createCar();

            return carRepository.save([item1, item2]).then((saved) => {
                expect(saved).to.be.an("array");
                expect(saved.length).to.eql(2);
                expect(saved[0]).to.be.instanceof(Car);
                expect(saved[1]).to.be.instanceof(Car);
            });
        });

        it("should persist item", () => {
            var item = createCar();

            return carRepository.save(item).then((item) => {
                return carRepository.findOne(item.id).then((fetchedItem) => {
                    expect(item.id).to.be.eql(fetchedItem.id);
                });
            });
        });

        it("should persist array of item", () => {
            var item1 = createCar();
            var item2 = createCar();

            return carRepository.save([item1, item2]).then((savedItems) => {
                carRepository.findAll([savedItems[0].id, savedItems[1].id]).then((items) => {
                    expect(savedItems[0].id).to.be.eql(items[0].id);
                    expect(savedItems[1].id).to.be.eql(items[1].id);
                });
            });
        });

        it("should persist related items", () => {
            var name = "partname" + Date.now();
            var car = carRepository.newEntity({
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

    });

    describe("hooks", () => {

        it("should call afterSave, with saved entity id", () => {
            var car = carRepository.newEntity();
            carRepository.afterSave = sinon.stub();

            var promise = carRepository.save(car);

            return promise.then(() => {
                expect(carRepository.afterSave).to.have.been.calledWith(car.id);
            });
        });

        it("should call afterSave, with saved array of entity id", () => {
            var car1 = carRepository.newEntity();
            var car2 = carRepository.newEntity();
            carRepository.afterSave = sinon.stub();

            var promise = carRepository.save([car1, car2]);

            return promise.then(() => {
                expect(carRepository.afterSave).to.have.callCount(2);
                expect(carRepository.afterSave).to.have.been.calledWith(car1.id);
                expect(carRepository.afterSave).to.have.been.calledWith(car2.id);
            });
        });

        it("should call afterRemove, with removed entity id", () => {
            var car = carRepository.newEntity();
            carRepository.afterRemove = sinon.stub();
            var promise = carRepository.save(car);

            promise = promise.then((car) => {
                return carRepository.remove(car);
            });

            return promise.then(() => {
                expect(carRepository.afterRemove).to.have.been.calledWith(car.id);
            });
        });

        it("should call afterRemove, with removed id", () => {
            var car = carRepository.newEntity();
            carRepository.afterRemove = sinon.stub();
            var promise = carRepository.save(car);

            promise = promise.then((car) => {
                return carRepository.remove(car.id);
            });

            return promise.then(() => {
                expect(carRepository.afterRemove).to.have.been.calledWith(car.id);
            });
        });

        it("should call afterRemove, with removed array of id", () => {
            var car1 = carRepository.newEntity();
            var car2 = carRepository.newEntity();
            carRepository.afterRemove = sinon.stub();
            var promise = carRepository.save([car1, car2]);

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
            var car1 = carRepository.newEntity();
            var car2 = carRepository.newEntity();
            carRepository.afterRemove = sinon.stub();
            var promise = carRepository.save([car1, car2]);

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
            var car = carRepository.newEntity();
            carRepository.afterRemove = sinon.stub();

            var promise = carRepository.remove(car.id);

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
            var item1 = createCar();
            var item2 = createCar();

            return carRepository.save([item1, item2]).then((items) => {
                return carRepository.remove(items).then(() => {
                    return carRepository.findAll().then((items) => {
                        expect(items.length).to.be.eql(0);
                    });
                });
            });
        });

        it("should drop array of items specified by id", () => {
            var item1 = createCar();
            var item2 = createCar();

            return carRepository.save([item1, item2]).then((items) => {
                return carRepository.remove([items[0].id, items[1].id]).then(() => {
                    return carRepository.findAll().then((items) => {
                        expect(items.length).to.be.eql(0);
                    });
                });
            });
        });

        it("should drop unsaved item", () => {
            var item = createCar();

            return carRepository.remove(item).then(() => {
                return carRepository.findAll().then((items) => {
                    expect(items.length).to.be.eql(0);
                });
            });
        });

    });

    describe("wrap", () => {

        it("should wrap Model in EntityClass", () => {
            var item = CarDBMapping.Model.forge({ name: "", label: "", srid: 1 });

            var entity = carRepository.wrapper.wrap(item);

            expect(entity).to.be.instanceof(Car);
        });

    });

    describe("unwrap", () => {

        it("should return Model for EntityClass", () => {
            var item = CarDBMapping.Model.forge({ name: "", label: "", srid: 1 });
            var entity = carRepository.wrapper.wrap(item);

            var unwrappedItem = carRepository.wrapper.unwrap(entity);

            expect(item).to.be.equal(unwrappedItem);
        });

    });

    describe("newEntity", () => {

        it("should return new Entity", () => {
            var entity = carRepository.newEntity();

            expect(entity).to.be.instanceof(Car);
        });

        it("should return wrapped and initialized Entity", () => {
            var entity = carRepository.newEntity();

            var model = carRepository.wrapper.unwrap(entity);
            model.set("name", "name " + Date.now());

            expect(entity.name).to.be.eql(model.get("name"));
        });

        it("should call constructor with given arguments", () => {
            var args = [{}, "a", 0];
            carRepository.Entity = function () {
                expect(args).to.be.eql([].slice.call(arguments));
            };

            carRepository.newEntity.apply(carRepository, args);
        });

        it("should call constructor after initialization", () => {
            carRepository.Entity = function () {
                expect(this.item).to.be.instanceof(CarDBMapping.Model);
                expect("name" in this).to.be.eql(true);
            };

            carRepository.newEntity.apply(carRepository);
        });

        it("should call model.forge with given argument", () => {
            var forgeArgument = {
                name: "thename" + Date.now(),
                modelName: "theLabel" + Date.now()
            };

            var entity = carRepository.newEntity(forgeArgument);

            expect(carRepository.wrapper.unwrap(entity).get("name")).to.be.eql(forgeArgument.name);
            expect(carRepository.wrapper.unwrap(entity).get("model_name")).to.be.eql(forgeArgument.modelName);
        });

        it("should reconstruct relations", () => {
            var entity = carRepository.newEntity({
                name: "tablename",
                parts: [{ name: "attr1name" }, { name: "attr2name" }]
            });

            var item = carRepository.wrapper.unwrap(entity);

            expect(item.get("parts")).to.be.eql(void 0);
            expect(item.related("relation_parts").length).to.be.eql(2);
            expect(item.related("relation_parts").at(0).get("name")).to.be.eql("attr1name");
            expect(item.related("relation_parts").at(1).get("name")).to.be.eql("attr2name");
        });

    });

    describe("findAllWhere", () => {

        it("should fetch entities matched by query", () => {
            var car1 = carRepository.newEntity({ name: "abc" });
            var car2 = carRepository.newEntity({ name: "efg" });
            var promise = carRepository.save([car1, car2]);

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
            var car1 = carRepository.newEntity({ name: "abc" });
            var promise = carRepository.save(car1);

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

            var promise = carRepository.findAllWhere((q) => {
                q.where("name", "abc");
            });

            return promise.then((cars) => {
                expect(cars).to.be.an("array");
                expect(cars.length).to.be.eql(0);
            });
        });

        it("should not include excluded relations", () => {
            var options = { exclude: ["parts"] };
            var car = carRepository.newEntity({ name: "name", label: "abc" });
            car.addParts(car.newParts({ name: "", label: "" }));
            var promise = carRepository.save(car);

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
            var car1 = carRepository.newEntity({ name: "abc" });
            var car2 = carRepository.newEntity({ name: "efg" });
            var promise = carRepository.save([car1, car2]);

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
            var car1 = carRepository.newEntity({ name: "abc" });
            var promise = carRepository.save(car1);

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

            var promise = carRepository.findWhere((q) => {
                q.where("name", "abc");
            });

            return promise.then((car) => {
                expect(car).to.be.eql(null);
            });
        });

        it("should return last match if multiple items were found", () => {
            var car1 = carRepository.newEntity({ name: "abc" });
            var car2 = carRepository.newEntity({ name: "efg" });
            var promise = carRepository.save([car1, car2]);

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
            var options = { exclude: ["parts"] };
            var car = carRepository.newEntity({ name: "name", label: "abc" });
            car.addParts(car.newParts({ name: "", label: "" }));
            var promise = carRepository.save(car);

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

    describe("test sql columns mapping", () => {
        let car, serialNumber;

        beforeEach(() => {
            serialNumber = "serial555";
            car = carRepository.newEntity({ name: "name", modelName: "abc", serialNumber: serialNumber });
            car.addParts(car.newParts({ name: "partName" }));
        });

        it("should have undefined options", () => {
            let options = {
                exclude: ["*"]
            };

            let definedKeys = ["id", "name", "modelName", "parts"];
            let undefinedKeys = ["description", "serialNumber", "owner", "parkingSpace"];
            let allKeys = _.union(definedKeys, undefinedKeys);

            let promise = carRepository.save(car);

            promise = promise.then(() => {
                return carRepository.findWhere((q) => {
                    q.where("name", "name");
                }, options);
            });

            return promise.then((car) => {
                expect(car).to.contain.all.keys.apply(expect(car).to.contain, allKeys);
                expect(car.description).to.be.eql(void 0);
                expect(car.serialNumber).to.be.eql(void 0);
                definedKeys.forEach((key) => {
                    expect(_.isUndefined(car[key])).to.be.eql(false);
                });
            });
        });

        it("should have fetch related sql column", () => {
            let options = {};
            let promise = carRepository.save(car);

            promise = promise.then(() => {
                return carRepository.findWhere((q) => {
                    q.where("name", "name");
                }, options);
            });

            return promise.then((car) => {
                expect(car.parts[0].upperName).to.be.eql("PARTNAME");
            });
        });

        it("should exclude all sql columns", () => {
            let options = void 0;

            let definedKeys = ["id", "name", "modelName", "parts", "description", "serialNumber"];
            let undefinedKeys = ["owner", "parkingSpace"];
            let allKeys = _.union(definedKeys, undefinedKeys);

            let promise = carRepository.save(car);

            promise = promise.then(() => {
                return carRepository.findWhere((q) => {
                    q.where("name", "name");
                }, options);
            });

            return promise.then((cars) => {
                expect(cars).to.contain.all.keys.apply(expect(cars).to.contain, allKeys);
                expect(cars.description).to.be.eql("name::abc");
                expect(cars.serialNumber).to.be.eql("SERIAL555");
                definedKeys.forEach((key) => {
                    expect(_.isUndefined(cars[key])).to.be.eql(false);
                });
            });
        });

        it("should not include excluded column description", () => {
            let options = {
                exclude: ["description"]
            };

            let definedKeys = ["id", "name", "modelName", "parts", "serialNumber"];
            let undefinedKeys = ["description", "owner", "parkingSpace"];
            let allKeys = _.union(definedKeys, undefinedKeys);

            let promise = carRepository.save(car);

            promise = promise.then(() => {
                return carRepository.findWhere((q) => {
                    q.where("name", "name");
                }, options);
            });

            return promise.then((cars) => {
                expect(cars).to.contain.all.keys.apply(expect(cars).to.contain, allKeys);
                expect(cars.description).to.be.eql(void 0);
                expect(cars.serialNumber).to.be.eql("SERIAL555");
                definedKeys.forEach((key) => {
                    expect(_.isUndefined(cars[key])).to.be.eql(false);
                });
            });
        });

        it("should not include excluded column serialNumber", () => {
            let options = {
                exclude: ["serialNumber"]
            };

            let definedKeys = ["id", "name", "modelName", "description", "parts"];
            let undefinedKeys = ["serialNumber", "owner", "parkingSpace"];
            let allKeys = _.union(definedKeys, undefinedKeys);

            let promise = carRepository.save(car);

            promise = promise.then(() => {
                return carRepository.findWhere((q) => {
                    q.where("name", "name");
                }, options);
            });

            return promise.then((cars) => {
                expect(cars).to.contain.all.keys.apply(expect(cars).to.contain, allKeys);
                expect(cars.description).to.be.eql("name::abc");
                expect(cars.serialNumber).to.be.eql(void 0);
                definedKeys.forEach((key) => {
                    expect(_.isUndefined(cars[key])).to.be.eql(false);
                });
            });
        });

        it("should include included columns", () => {
            var options = {
                columns: ["name", "description"]
            };

            let definedKeys = ["id", "name", "description", "parts"];
            let undefinedKeys = ["modelName", "serialNumber", "owner", "parkingSpace"];
            let allKeys = _.union(definedKeys, undefinedKeys);

            var promise = carRepository.save(car);

            promise = promise.then(() => {
                return carRepository.findWhere((q) => {
                    q.where("name", "name");
                }, options);
            });

            return promise.then((cars) => {
                expect(cars).to.contain.all.keys.apply(expect(cars).to.contain, allKeys);
                expect(cars.name).to.be.eql("name");
                expect(cars.description).to.be.eql("name::abc");
                expect(cars.modelName).to.be.eql(void 0);
                undefinedKeys.forEach((key) => {
                    expect(_.isUndefined(cars[key]) || _.isNull(cars[key])).to.be.eql(true);
                });
            });
        });
    });

    describe("findByConditions", () => {
        var car1, car2, car3, car1Entity, car2Entity, car3Entity;


        beforeEach(() => {

            car1 = { name: "car1", modelName: "carLabel1", ownerId: 1, parts: [{ wheels: [{ index: 1 }], engine: { serialNumber: "asdf234" } }] };
            car2 = { name: "car2", modelName: "carLabel2", ownerId: 2, parts: [{ wheels: [{ index: 2 }], engine: { serialNumber: "asdf789" } }] };
            car3 = { name: "car3", modelName: "carLabel3", ownerId: 2, parts: [{ wheels: [{ index: 1 }], engine: { serialNumber: "asdf100" } }] };

            car1Entity = carRepository.newEntity(car1);
            car2Entity = carRepository.newEntity(car2);
            car3Entity = carRepository.newEntity(car3);
        });

        it("should return object with all properties", () => {
            var condition = [
                {
                    name: "name",
                    query: (q) => q.where("car.name", car1.name)
                }
            ];

            var promise = carRepository.save([car1Entity, car2Entity]).then(() => {
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
            var condition = [
                {
                    name: "name",
                    query: (q) => q.where("car.name", car1.name)
                }
            ];

            var promise = carRepository.save([car1Entity, car2Entity]).then(() => {
                return carRepository.findByConditions(condition, void 0);
            });

            return promise.then((cars) => {
                expect(cars.length).to.be.eql(1);
                expect(cars[0].name).to.be.eql(car1.name);
            });
        });

        it("should return item by condition in mapped relation table", () => {
            var condition = [{
                name: "wheels",
                query: (q) => q.where("engine.serial_number", "asdf789")
            }];

            var promise = carRepository.save([car1Entity, car2Entity]).then(() => {
                return carRepository.findByConditions(condition, void 0);
            });

            return promise.then((cars) => {
                expect(cars.length).to.be.eql(1);
                expect(cars[0].name).to.be.eql(car2.name);
            });
        });

        it("should return items that satisfy all conditions (AND clause)", () => {
            var condition = [
                {
                    name: "wheels",
                    query: (q) => q.where("index", 1)
                },
                {
                    name: "owner",
                    query: (q) => q.where("car.model_name", "carLabel1")
                }
            ];

            var promise = carRepository.save([car1Entity, car2Entity, car3Entity]).then(() => {
                return carRepository.findByConditions(condition, void 0);
            });

            return promise.then((cars) => {
                expect(cars.length).to.be.eql(1);
                expect(cars[0].name).to.be.eql(car1.name);
            });
        });

        it("should exclude relations from options.exclude", () => {
            var condition = [
                {
                    name: "name",
                    query: (q) => q.where("car.name", car1.name)
                }
            ];

            var options = { exclude: ["parts"] };

            var promise = carRepository.save([car1Entity, car2Entity]).then(() => {
                return carRepository.findByConditions(condition, options);
            });

            return promise.then((cars) => {
                expect(cars.length).to.be.eql(1);
                expect(cars[0].name).to.be.eql(car1.name);
                expect(cars[0].parts.length).to.be.eql(0);
            });
        });
    });

    describe("transactions", () => {

        beforeEach(() => {
            sinon.spy(CarDBMapping, "startTransaction");
            sinon.spy(carRepository.repository, "save");
            sinon.spy(carRepository.repository, "remove");
        });

        afterEach(() => {
            CarDBMapping.startTransaction.restore();
        });

        it("should save in transaction", () => {
            var car = carRepository.newEntity();
            var options = { transactional: true };

            var promise = carRepository.save(car, options);

            return promise.then(() => {
                expect("transacting" in options).to.be.eql(true);
                expect(options.transacting).to.be.a("function");
                expect(carRepository.repository.save).to.have.been.calledWithExactly(car.item, options);
            });
        });

        it("should save in given transaction", () => {
            var car = carRepository.newEntity();

            return CarDBMapping.startTransaction((transaction) => {
                var options = { transacting: transaction };

                var promise = carRepository.save(car, options);

                return promise.then(() => {
                    expect(options.transacting).to.be.equal(transaction);
                    expect(carRepository.repository.save).to.have.been.calledWithExactly(car.item, options);
                });
            });
        });

        it("should remove in transaction", () => {
            var car = carRepository.newEntity();
            var promise = carRepository.save(car);
            var options = { transactional: true };

            promise = promise.then(() => {
                return carRepository.remove(car, options);
            });

            return promise.then(() => {
                expect("transacting" in options).to.be.eql(true);
                expect(options.transacting).to.be.a("function");
                expect(carRepository.repository.remove).to.have.been.calledWithExactly(car.item, options);
            });
        });

        it("should remove in given transaction", () => {
            var car = carRepository.newEntity();

            return carRepository.save(car).then(() => {
                return CarDBMapping.startTransaction((transaction) => {
                    var options = { transactional: transaction };

                    var promise = carRepository.remove(car, options);

                    return promise.then(() => {
                        expect("transacting" in options).to.be.eql(true);
                        expect(options.transacting).to.be.a("function");
                        expect(carRepository.repository.remove).to.have.been.calledWithExactly(car.item, options);
                    });
                });
            });
        });

        it("should not start new transaction if transaction object is provided", () => {
            var car = carRepository.newEntity();

            return CarDBMapping.startTransaction((transaction) => {
                var options = { transacting: transaction };

                var promise = carRepository.save(car, options);

                return promise.then(() => {
                    expect(CarDBMapping.startTransaction).to.have.callCount(1);
                    expect(CarDBMapping.startTransaction).to.have.been.calledBefore(carRepository.repository.save);
                });
            });
        });

        it("should not commit transaction if transaction object is provided", () => {
            var car = carRepository.newEntity();

            return CarDBMapping.startTransaction((transaction) => {
                sinon.spy(transaction, "commit");
                var options = { transacting: transaction };

                var promise = carRepository.save(car, options);

                return promise.then(() => {
                    expect(transaction.commit).to.not.have.been.callCount(1);
                });
            });
        });

        it("should rollback if save failed", () => {
            var transaction;
            var car = carRepository.newEntity();

            var promise = CarDBMapping.startTransaction((t) => {
                transaction = t;
                sinon.spy(transaction, "commit");
                sinon.spy(transaction, "rollback");
                var options = { transactional: transaction };
                carRepository.repository.save = sinon.stub().returns(Q.reject(new Error()));

                return carRepository.save(car, options);
            });

            return promise.then(() => {
                expect(promise.isRejected()).to.be.eql(true);
            }).catch(() => {
                expect(transaction.commit).to.have.callCount(0);
                expect(transaction.rollback).to.have.callCount(1);
            });
        });

        it("should rollback if remove failed", () => {
            var transaction;
            var car = carRepository.newEntity();

            var promise = CarDBMapping.startTransaction((t) => {
                transaction = t;
                sinon.spy(transaction, "commit");
                sinon.spy(transaction, "rollback");
                var options = { transactional: transaction };
                carRepository.repository.remove = sinon.stub().returns(Q.reject(new Error()));

                return carRepository.remove(car, options);
            });

            return promise.then(() => {
                expect(promise.isRejected()).to.be.eql(true);
            }).catch(() => {
                expect(transaction.commit).to.have.callCount(0);
                expect(transaction.rollback).to.have.callCount(1);
            });
        });

        it("should not rollback if save failed and transaction was passed in", () => {
            var transaction;
            var car = carRepository.newEntity();

            return CarDBMapping.startTransaction((t) => {
                transaction = t;
                sinon.spy(transaction, "commit");
                sinon.spy(transaction, "rollback");
                var options = { transactional: transaction };
                carRepository.repository.save = sinon.stub().returns(Q.reject(new Error()));

                var promise = carRepository.save(car, options);

                return promise.then(() => {
                    expect(promise.isRejected()).to.be.eql(true);
                }).catch(() => {
                    expect(transaction.commit).to.have.callCount(0);
                    expect(transaction.rollback).to.have.callCount(0);
                });
            });
        });

        it("should not rollback if remove failed and transaction was passed in", () => {
            var transaction;
            var car = carRepository.newEntity();

            return CarDBMapping.startTransaction((t) => {
                transaction = t;
                sinon.spy(transaction, "commit");
                sinon.spy(transaction, "rollback");
                var options = { transactional: transaction };
                carRepository.repository.remove = sinon.stub().returns(Q.reject(new Error()));

                var promise = carRepository.remove(car, options);

                return promise.then(() => {
                    expect(promise.isRejected()).to.be.eql(true);
                }).catch(() => {
                    expect(transaction.commit).to.have.callCount(0);
                    expect(transaction.rollback).to.have.callCount(0);
                });
            });

        });

        it("should commit transaction when save succeeded", () => {
            var transaction;
            var car = carRepository.newEntity();

            return CarDBMapping.startTransaction((t) => {
                transaction = t;
                sinon.spy(transaction, "commit");
                var options = { transacting: transaction };

                return carRepository.save(car, options);
            }).then(() => {
                expect(transaction.commit).to.have.been.callCount(1);
            });
        });

        it("should commit transaction when remove succeeded", () => {
            var transaction;
            var car = carRepository.newEntity();

            return carRepository.save(car).then(() => {
                return CarDBMapping.startTransaction((t) => {
                    transaction = t;
                    sinon.spy(transaction, "commit");
                    var options = { transactional: transaction };

                    var promise = carRepository.remove(car, options);

                    return promise.then(() => {
                        expect("transacting" in options).to.be.eql(true);
                        expect(options.transacting).to.be.a("function");
                        expect(carRepository.repository.remove).to.have.been.calledWithExactly(car.item, options);
                    });
                });
            }).then(() => {
                expect(transaction.commit).to.have.callCount(1);
            });
        });

    });

    var tableIndex = 0;

    function createCar() {
        return carRepository.newEntity({ name: "car" + tableIndex++ });
    }

    beforeEach(require("./db/setup"));
    afterEach(require("./db/teardown"));

});

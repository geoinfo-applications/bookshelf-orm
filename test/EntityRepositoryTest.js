"use strict";

var expect = require("chai").expect;

var Car = require("./db/mocks").Car;
var CarRepository = require("./db/mocks").CarRepository;

require("./db/connection");
var registry = require("./db/registry");
require("./db/mappings");

var CarDBMapping = registry.compile("CarDBMapping");


describe("Entity Repository Test", function () {
    this.timeout(1000);
    var carRepository;

    beforeEach(function () {
        carRepository = new CarRepository();
    });

    it("should be defined", function () {
        expect(CarRepository).to.be.a("function");
    });

    describe("findAll", function () {

        it("should return array of ImportTables with specified ids", function () {
            return carRepository.save(createCar()).then(function (model) {
                return carRepository.findAll([model.id]).then(function (tables) {
                    expect(tables.length).to.be.eql(1);
                    expect(tables[0].id).to.be.eql(model.id);
                });
            });
        });

        it("should return all ImportTables", function () {
            return carRepository.save(createCar()).then(function (model1) {
                return carRepository.save(createCar()).then(function (model2) {
                    return carRepository.findAll().then(function (tables) {
                        expect(tables.length).to.be.eql(2);
                        expect(tables[0].id).to.be.eql(model1.id);
                        expect(tables[1].id).to.be.eql(model2.id);
                    });
                });
            });
        });

        it("should not include excluded relations", function () {
            var options = { exclude: ["parts"] };
            var car = carRepository.newEntity({ name: "", label: "" });
            car.addParts(car.newParts({ name: "", label: "" }));
            var promise = carRepository.save(car);

            promise = promise.then(function () {
                return carRepository.findAll(options);
            });

            return promise.then(function (cars) {
                expect(cars[0].parts.length).to.be.eql(0);
            });
        });

        it("should not include excluded relations", function () {
            var options = { exclude: ["parts"] };
            var car = carRepository.newEntity({ name: "", label: "" });
            car.addParts(car.newParts({ name: "", label: "" }));
            var promise = carRepository.save(car);

            promise = promise.then(function (car) {
                return carRepository.findAll([car.id], options);
            });

            return promise.then(function (cars) {
                expect(cars[0].parts.length).to.be.eql(0);
            });
        });

    });

    describe("findOne", function () {

        it("should return instance of EntityClass with specified id", function () {
            return carRepository.save(createCar()).then(function (model) {
                return carRepository.findOne(model.id).then(function (fetchedModel) {
                    expect(fetchedModel).to.be.instanceof(Car);
                    expect(fetchedModel.id).to.be.eql(model.id);
                });
            });
        });

        it("should fetch relations deeply", function () {
            var car = carRepository.newEntity({
                parts: [{
                    wheels: [{ index: 0 }, { index: 1 }]
                }]
            });

            return carRepository.save(car).then(function (car) {
                return carRepository.findOne(car.id).then(function (car) {
                    expect("parts" in car);
                    expect(car.parts.length).to.be.eql(1);
                    expect("wheels" in car.parts[0]);
                    expect(car.parts[0].wheels.length).to.be.eql(2);
                });
            });
        });

        it("should not include excluded relations", function () {
            var options = { exclude: ["parts"] };
            var car = carRepository.newEntity({ name: "", label: "" });
            car.addParts(car.newParts({ name: "", label: "" }));
            var promise = carRepository.save(car);

            promise = promise.then(function (car) {
                return carRepository.findOne(car.id, options);
            });

            return promise.then(function (car) {
                expect(car.parts.length).to.be.eql(0);
            });
        });

    });

    describe("save", function () {

        it("should return EntityClass", function () {
            var item = createCar();

            return carRepository.save(item).then(function (saved) {
                expect(saved).to.be.instanceof(Car);
            });
        });

        it("should return array of EntityClass", function () {
            var item1 = createCar();
            var item2 = createCar();

            return carRepository.save([item1, item2]).then(function (saved) {
                expect(saved).to.be.an("array");
                expect(saved.length).to.eql(2);
                expect(saved[0]).to.be.instanceof(Car);
                expect(saved[1]).to.be.instanceof(Car);
            });
        });

        it("should persist item", function () {
            var item = createCar();

            return carRepository.save(item).then(function (item) {
                return carRepository.findOne(item.id).then(function (fetchedItem) {
                    expect(item.id).to.be.eql(fetchedItem.id);
                });
            });
        });

        it("should persist array of item", function () {
            var item1 = createCar();
            var item2 = createCar();

            return carRepository.save([item1, item2]).then(function (savedItems) {
                carRepository.findAll([savedItems[0].id, savedItems[1].id]).then(function (items) {
                    expect(savedItems[0].id).to.be.eql(items[0].id);
                    expect(savedItems[1].id).to.be.eql(items[1].id);
                });
            });
        });

        it("should persist related items", function () {
            var name = "partname" + Date.now();
            var car = carRepository.newEntity({
                parts: [{
                    name: name,
                    wheels: [{ index: 0 }, { index: 1 }]
                }]
            });

            return carRepository.save(car).then(function (car) {
                return carRepository.findOne(car.id).then(function (car) {
                    expect(car.parts[0].name).to.be.eql(name);
                });
            });
        });

    });

    describe("remove", function () {

        it("should drop item", function () {
            return carRepository.save(createCar()).then(function (item) {
                return carRepository.remove(item).then(function () {
                    return carRepository.findAll().then(function (items) {
                        expect(items.length).to.be.eql(0);
                    });
                });
            });
        });

        it("should drop item specified by id", function () {
            return carRepository.save(createCar()).then(function (item) {
                return carRepository.remove(item.id).then(function () {
                    return carRepository.findAll().then(function (items) {
                        expect(items.length).to.be.eql(0);
                    });
                });
            });
        });

        it("should drop array of item", function () {
            var item1 = createCar();
            var item2 = createCar();

            return carRepository.save([item1, item2]).then(function (items) {
                return carRepository.remove(items).then(function () {
                    return carRepository.findAll().then(function (items) {
                        expect(items.length).to.be.eql(0);
                    });
                });
            });
        });

        it("should drop array of items specified by id", function () {
            var item1 = createCar();
            var item2 = createCar();

            return carRepository.save([item1, item2]).then(function (items) {
                return carRepository.remove([items[0].id, items[1].id]).then(function () {
                    return carRepository.findAll().then(function (items) {
                        expect(items.length).to.be.eql(0);
                    });
                });
            });
        });

    });

    describe("wrap", function () {

        it("should wrap Model in EntityClass", function () {
            var item = CarDBMapping.Model.forge({ name: "", label: "", srid: 1 });

            var entity = carRepository.wrap(item);

            expect(entity).to.be.instanceof(Car);
        });

    });

    describe("unwrap", function () {

        it("should return Model for EntityClass", function () {
            var item = CarDBMapping.Model.forge({ name: "", label: "", srid: 1 });
            var entity = carRepository.wrap(item);

            var unwrappedItem = carRepository.unwrap(entity);

            expect(item).to.be.equal(unwrappedItem);
        });

    });

    describe("newEntity", function () {

        it("should return new Entity", function () {
            var entity = carRepository.newEntity();

            expect(entity).to.be.instanceof(Car);
        });

        it("should return wrapped and initialized Entity", function () {
            var entity = carRepository.newEntity();

            var model = carRepository.unwrap(entity);
            model.set("name", "name " + Date.now());

            expect(entity.name).to.be.eql(model.get("name"));
        });

        it("should call constructor with given arguments", function () {
            var args = [{}, "a", 0];
            carRepository.Entity = function () {
                expect(args).to.be.eql([].slice.call(arguments));
            };

            carRepository.newEntity.apply(carRepository, args);
        });

        it("should call constructor after initialization", function () {
            carRepository.Entity = function () {
                expect(this.item).to.be.instanceof(CarDBMapping.Model);
                expect("name" in this).to.be.eql(true);
            };

            carRepository.newEntity.apply(carRepository);
        });

        it("should call model.forge with given argument", function () {
            var forgeArgument = {
                name: "thename" + Date.now(),
                modelName: "theLabel" + Date.now()
            };

            var entity = carRepository.newEntity(forgeArgument);

            expect(carRepository.unwrap(entity).get("name")).to.be.eql(forgeArgument.name);
            expect(carRepository.unwrap(entity).get("model_name")).to.be.eql(forgeArgument.modelName);
        });

        it("should reconstruct relations", function () {
            var entity = carRepository.newEntity({
                name: "tablename",
                parts: [{ name: "attr1name" }, { name: "attr2name" }]
            });

            var item = carRepository.unwrap(entity);

            expect(item.get("parts")).to.be.eql(void 0);
            expect(item.related("relation_parts").length).to.be.eql(2);
            expect(item.related("relation_parts").at(0).get("name")).to.be.eql("attr1name");
            expect(item.related("relation_parts").at(1).get("name")).to.be.eql("attr2name");
        });

    });

    describe("findAllWhere", function () {

        it("should fetch entities matched by query", function () {
            var car1 = carRepository.newEntity({ name: "abc" });
            var car2 = carRepository.newEntity({ name: "efg" });
            var promise = carRepository.save([car1, car2]);

            promise = promise.then(function () {
                return carRepository.findAllWhere(function (q) {
                    q.where("name", "abc");
                });
            });

            return promise.then(function (cars) {
                expect(cars.length).to.be.eql(1);
                expect(cars[0].name).to.be.eql("abc");
            });
        });

        it("should wrap entity", function () {
            var car1 = carRepository.newEntity({ name: "abc" });
            var promise = carRepository.save(car1);

            promise = promise.then(function () {
                return carRepository.findAllWhere(function (q) {
                    q.where("name", "abc");
                });
            });

            return promise.then(function (cars) {
                expect(cars[0]).to.be.an.instanceof(Car);
            });
        });

        it("should return an empty array if no item was found", function () {

            var promise = carRepository.findAllWhere(function (q) {
                q.where("name", "abc");
            });

            return promise.then(function (cars) {
                expect(cars).to.be.an("array");
                expect(cars.length).to.be.eql(0);
            });
        });

    });

    describe("findWhere", function () {

        it("should fetch entities matched by query", function () {
            var car1 = carRepository.newEntity({ name: "abc" });
            var car2 = carRepository.newEntity({ name: "efg" });
            var promise = carRepository.save([car1, car2]);

            promise = promise.then(function () {
                return carRepository.findWhere(function (q) {
                    q.where("name", "abc");
                });
            });

            return promise.then(function (car) {
                expect(car.name).to.be.eql("abc");
            });
        });

        it("should wrap entity", function () {
            var car1 = carRepository.newEntity({ name: "abc" });
            var promise = carRepository.save(car1);

            promise = promise.then(function () {
                return carRepository.findWhere(function (q) {
                    q.where("name", "abc");
                });
            });

            return promise.then(function (car) {
                expect(car).to.be.an.instanceof(Car);
            });
        });

        it("should return null if no item was found", function () {

            var promise = carRepository.findWhere(function (q) {
                q.where("name", "abc");
            });

            return promise.then(function (car) {
                expect(car).to.be.eql(null);
            });
        });

        it("should return last match if multiple items were found", function () {
            var car1 = carRepository.newEntity({ name: "abc" });
            var car2 = carRepository.newEntity({ name: "efg" });
            var promise = carRepository.save([car1, car2]);

            promise = promise.then(function () {
                return carRepository.findWhere(function (q) {
                    q.whereNotNull("name");
                    q.orderBy("name");
                });
            });

            return promise.then(function (car) {
                expect(car.name).to.be.eql("efg");
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

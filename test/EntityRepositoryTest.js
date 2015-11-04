"use strict";

var Q = require("q");
var chai = require("chai");
var expect = chai.expect;
var sinon = require("sinon");
var sinonChai = require("sinon-chai");
chai.use(sinonChai);

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

        it("should return array of Cars with specified ids", function () {
            return carRepository.save(createCar()).then(function (model) {
                return carRepository.findAll([model.id]).then(function (tables) {
                    expect(tables.length).to.be.eql(1);
                    expect(tables[0].id).to.be.eql(model.id);
                });
            });
        });

        it("should return all Cars", function () {
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

    describe("hooks", function () {

        it("should call afterSave, with saved entity id", function () {
            var car = carRepository.newEntity();
            carRepository.afterSave = sinon.stub();

            var promise = carRepository.save(car);

            return promise.then(function () {
                expect(carRepository.afterSave).to.have.been.calledWith(car.id);
            });
        });

        it("should call afterSave, with saved array of entity id", function () {
            var car1 = carRepository.newEntity();
            var car2 = carRepository.newEntity();
            carRepository.afterSave = sinon.stub();

            var promise = carRepository.save([car1, car2]);

            return promise.then(function () {
                expect(carRepository.afterSave).to.have.callCount(2);
                expect(carRepository.afterSave).to.have.been.calledWith(car1.id);
                expect(carRepository.afterSave).to.have.been.calledWith(car2.id);
            });
        });

        it("should call afterRemove, with removed entity id", function () {
            var car = carRepository.newEntity();
            carRepository.afterRemove = sinon.stub();
            var promise = carRepository.save(car);

            promise = promise.then(function (car) {
                return carRepository.remove(car);
            });

            return promise.then(function () {
                expect(carRepository.afterRemove).to.have.been.calledWith(car.id);
            });
        });

        it("should call afterRemove, with removed id", function () {
            var car = carRepository.newEntity();
            carRepository.afterRemove = sinon.stub();
            var promise = carRepository.save(car);

            promise = promise.then(function (car) {
                return carRepository.remove(car.id);
            });

            return promise.then(function () {
                expect(carRepository.afterRemove).to.have.been.calledWith(car.id);
            });
        });

        it("should call afterRemove, with removed array of id", function () {
            var car1 = carRepository.newEntity();
            var car2 = carRepository.newEntity();
            carRepository.afterRemove = sinon.stub();
            var promise = carRepository.save([car1, car2]);

            promise = promise.then(function () {
                return carRepository.remove([car1.id, car2.id]);
            });

            return promise.then(function () {
                expect(carRepository.afterRemove).to.have.callCount(2);
                expect(carRepository.afterRemove).to.have.been.calledWith(car1.id);
                expect(carRepository.afterRemove).to.have.been.calledWith(car2.id);
            });
        });

        it("should call afterRemove, with removed array of entity", function () {
            var car1 = carRepository.newEntity();
            var car2 = carRepository.newEntity();
            carRepository.afterRemove = sinon.stub();
            var promise = carRepository.save([car1, car2]);

            promise = promise.then(function () {
                return carRepository.remove([car1, car2]);
            });

            return promise.then(function () {
                expect(carRepository.afterRemove).to.have.callCount(2);
                expect(carRepository.afterRemove).to.have.been.calledWith(car1.id);
                expect(carRepository.afterRemove).to.have.been.calledWith(car2.id);
            });
        });

        it("should not call afterRemove, if entity was unsaved", function () {
            var car = carRepository.newEntity();
            carRepository.afterRemove = sinon.stub();

            var promise = carRepository.remove(car.id);

            return promise.then(function () {
                expect(carRepository.afterRemove).to.have.callCount(0);
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

        it("should drop unsaved item", function () {
            var item = createCar();

            return carRepository.remove(item).then(function () {
                return carRepository.findAll().then(function (items) {
                    expect(items.length).to.be.eql(0);
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

        it("should not include excluded relations", function () {
            var options = { exclude: ["parts"] };
            var car = carRepository.newEntity({ name: "name", label: "abc" });
            car.addParts(car.newParts({ name: "", label: "" }));
            var promise = carRepository.save(car);

            promise = promise.then(function () {
                return carRepository.findAllWhere(function (q) {
                    q.where("name", "name");
                }, options);
            });

            return promise.then(function (cars) {
                expect(cars[0].parts.length).to.be.eql(0);
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

        it("should not include excluded relations", function () {
            var options = { exclude: ["parts"] };
            var car = carRepository.newEntity({ name: "name", label: "abc" });
            car.addParts(car.newParts({ name: "", label: "" }));
            var promise = carRepository.save(car);

            promise = promise.then(function () {
                return carRepository.findWhere(function (q) {
                    q.where("name", "name");
                }, options);
            });

            return promise.then(function (cars) {
                expect(cars.parts.length).to.be.eql(0);
            });
        });

    });

    describe("transactions", function () {

        beforeEach(function () {
            sinon.spy(CarDBMapping, "startTransaction");
            sinon.spy(carRepository.repository, "save");
            sinon.spy(carRepository.repository, "remove");
        });

        afterEach(function () {
            CarDBMapping.startTransaction.restore();
        });

        it("should save in transaction", function () {
            var car = carRepository.newEntity();
            var options = { transactional: true };

            var promise = carRepository.save(car, options);

            return promise.then(function () {
                expect("transacting" in options).to.be.eql(true);
                expect(options.transacting).to.be.a("function");
                expect(carRepository.repository.save).to.have.been.calledWithExactly(car.item, options);
            });
        });

        it("should save in given transaction", function () {
            var car = carRepository.newEntity();

            return CarDBMapping.startTransaction(function (transaction) {
                var options = { transacting: transaction };

                var promise = carRepository.save(car, options);

                return promise.then(function () {
                    expect(options.transacting).to.be.equal(transaction);
                    expect(carRepository.repository.save).to.have.been.calledWithExactly(car.item, options);
                });
            });
        });

        it("should remove in transaction", function () {
            var car = carRepository.newEntity();
            var promise = carRepository.save(car);
            var options = { transactional: true };

            promise = promise.then(function () {
                return carRepository.remove(car, options);
            });

            return promise.then(function () {
                expect("transacting" in options).to.be.eql(true);
                expect(options.transacting).to.be.a("function");
                expect(carRepository.repository.remove).to.have.been.calledWithExactly(car.item, options);
            });
        });

        it("should remove in given transaction", function () {
            var car = carRepository.newEntity();

            return carRepository.save(car).then(function () {
                return CarDBMapping.startTransaction(function (transaction) {
                    var options = { transactional: transaction };

                    var promise = carRepository.remove(car, options);

                    return promise.then(function () {
                        expect("transacting" in options).to.be.eql(true);
                        expect(options.transacting).to.be.a("function");
                        expect(carRepository.repository.remove).to.have.been.calledWithExactly(car.item, options);
                    });
                });
            });
        });

        it("should not start new transaction if transaction object is provided", function () {
            var car = carRepository.newEntity();

            return CarDBMapping.startTransaction(function (transaction) {
                var options = { transacting: transaction };

                var promise = carRepository.save(car, options);

                return promise.then(function () {
                    expect(CarDBMapping.startTransaction).to.have.callCount(1);
                    expect(CarDBMapping.startTransaction).to.have.been.calledBefore(carRepository.repository.save);
                });
            });
        });

        it("should not commit transaction if transaction object is provided", function () {
            var car = carRepository.newEntity();

            return CarDBMapping.startTransaction(function (transaction) {
                sinon.spy(transaction, "commit");
                var options = { transacting: transaction };

                var promise = carRepository.save(car, options);

                return promise.then(function () {
                    expect(transaction.commit).to.not.have.been.callCount(1);
                });
            });
        });

        it("should rollback if save failed", function () {
            var transaction;
            var car = carRepository.newEntity();

            var promise = CarDBMapping.startTransaction(function (t) {
                transaction = t;
                sinon.spy(transaction, "commit");
                sinon.spy(transaction, "rollback");
                var options = { transactional: transaction };
                carRepository.repository.save = sinon.stub().returns(Q.reject(new Error()));

                return carRepository.save(car, options);
            });

            return promise.then(function () {
                expect(promise.isRejected()).to.be.eql(true);
            }).catch(function () {
                expect(transaction.commit).to.have.callCount(0);
                expect(transaction.rollback).to.have.callCount(1);
            });
        });

        it("should rollback if remove failed", function () {
            var transaction;
            var car = carRepository.newEntity();

            var promise = CarDBMapping.startTransaction(function (t) {
                transaction = t;
                sinon.spy(transaction, "commit");
                sinon.spy(transaction, "rollback");
                var options = { transactional: transaction };
                carRepository.repository.remove = sinon.stub().returns(Q.reject(new Error()));

                return carRepository.remove(car, options);
            });

            return promise.then(function () {
                expect(promise.isRejected()).to.be.eql(true);
            }).catch(function () {
                expect(transaction.commit).to.have.callCount(0);
                expect(transaction.rollback).to.have.callCount(1);
            });
        });

        it("should not rollback if save failed and transaction was passed in", function () {
            var transaction;
            var car = carRepository.newEntity();

            return CarDBMapping.startTransaction(function (t) {
                transaction = t;
                sinon.spy(transaction, "commit");
                sinon.spy(transaction, "rollback");
                var options = { transactional: transaction };
                carRepository.repository.save = sinon.stub().returns(Q.reject(new Error()));

                var promise = carRepository.save(car, options);

                return promise.then(function () {
                    expect(promise.isRejected()).to.be.eql(true);
                }).catch(function () {
                    expect(transaction.commit).to.have.callCount(0);
                    expect(transaction.rollback).to.have.callCount(0);
                });
            });
        });

        it("should not rollback if remove failed and transaction was passed in", function () {
            var transaction;
            var car = carRepository.newEntity();

            return CarDBMapping.startTransaction(function (t) {
                transaction = t;
                sinon.spy(transaction, "commit");
                sinon.spy(transaction, "rollback");
                var options = { transactional: transaction };
                carRepository.repository.remove = sinon.stub().returns(Q.reject(new Error()));

                var promise = carRepository.remove(car, options);

                return promise.then(function () {
                    expect(promise.isRejected()).to.be.eql(true);
                }).catch(function () {
                    expect(transaction.commit).to.have.callCount(0);
                    expect(transaction.rollback).to.have.callCount(0);
                });
            });

        });

        it("should commit transaction when save succeeded", function () {
            var transaction;
            var car = carRepository.newEntity();

            return CarDBMapping.startTransaction(function (t) {
                transaction = t;
                sinon.spy(transaction, "commit");
                var options = { transacting: transaction };

                return carRepository.save(car, options);
            }).then(function () {
                expect(transaction.commit).to.have.been.callCount(1);
            });
        });

        it("should commit transaction when remove succeeded", function () {
            var transaction;
            var car = carRepository.newEntity();

            return carRepository.save(car).then(function () {
                return CarDBMapping.startTransaction(function (t) {
                    transaction = t;
                    sinon.spy(transaction, "commit");
                    var options = { transactional: transaction };

                    var promise = carRepository.remove(car, options);

                    return promise.then(function () {
                        expect("transacting" in options).to.be.eql(true);
                        expect(options.transacting).to.be.a("function");
                        expect(carRepository.repository.remove).to.have.been.calledWithExactly(car.item, options);
                    });
                });
            }).then(function () {
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

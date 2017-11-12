"use strict";


describe("Entity Repository Transactions Test", function () {
    // jshint maxstatements:false

    const Q = require("q");
    const chai = require("chai");
    const expect = chai.expect;
    const sinon = require("sinon");
    const sinonChai = require("sinon-chai");
    chai.use(sinonChai);

    const CarRepository = require("./db/mocks").CarRepository;

    require("./db/connection");
    const registry = require("./db/registry");
    require("./db/mappings");

    const CarDBMapping = registry.compile("CarDBMapping");

    this.timeout(1000);
    var carRepository;

    beforeEach(() => {
        carRepository = new CarRepository();
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

    it("should not fail on orphan removal", () => {
        const car = carRepository.newEntity({ parts: [{ name: "p1" }, { name: "p2" }] });
        let promise = carRepository.save(car);

        promise = promise.then((car) => carRepository.newEntity(JSON.parse(JSON.stringify(car)))).then((car) => {
            car.removeParts(car.parts.pop());
            return carRepository.save(car, { transactional: true });
        });

        return promise.then(() => carRepository.findAll()).then((cars) => {
            expect(cars.length).to.be.eql(1);
            expect(cars[0].parts.length).to.be.eql(1);
            expect(cars[0].parts[0].name).to.be.eql("p1");
        });
    });

    beforeEach(require("./db/setup"));
    afterEach(require("./db/teardown"));

});

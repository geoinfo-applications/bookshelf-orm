"use strict";

import Q from "q";
import chai, { expect } from "chai";
import sinon from "sinon";
import sinonChai from "sinon-chai";
import { CarRepository } from "./db/mocks";
import "./db/connection";
import registry from "./db/registry";
import "./db/mappings";
import IOptionalEntityRepositoryOptions from "../orm/IEntityRepositoryOptions";
import setup from "./db/setup";
import teardown from "./db/teardown";


describe("Entity Repository Transactions Test", function () {
    chai.use(sinonChai);
    const CarDBMapping = registry.compile("CarDBMapping");

    let carRepository;

    beforeEach(() => {
        carRepository = new CarRepository();
        sinon.spy(CarDBMapping, "startTransaction");
        sinon.spy(carRepository.repository, "save");
        sinon.spy(carRepository.repository, "remove");
    });

    afterEach(() => {
        (CarDBMapping.startTransaction as sinon.spy).restore();
    });

    it("should save in transaction", () => {
        const car = carRepository.newEntity();
        const options: IOptionalEntityRepositoryOptions = { transactional: true };

        const promise = carRepository.save(car, options);

        return promise.then(() => {
            expect("transacting" in options).to.be.eql(true);
            expect(options.transacting).to.be.a("function");
            expect(carRepository.repository.save).to.have.been.calledWithExactly(car.item, options);
        });
    });

    it("should save in given transaction", () => {
        const car = carRepository.newEntity();

        return CarDBMapping.startTransaction((transaction) => {
            const options = { transacting: transaction };

            const promise = carRepository.save(car, options);

            return promise.then(() => {
                expect(options.transacting).to.be.equal(transaction);
                expect(carRepository.repository.save).to.have.been.calledWithExactly(car.item, options);
            });
        });
    });

    it("should remove in transaction", () => {
        const car = carRepository.newEntity();
        const options: IOptionalEntityRepositoryOptions = { transactional: true };
        let promise = carRepository.save(car);

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
        const car = carRepository.newEntity();

        return carRepository.save(car).then(() => {
            return CarDBMapping.startTransaction((transaction) => {
                const options: IOptionalEntityRepositoryOptions = { transacting: transaction };

                const promise = carRepository.remove(car, options);

                return promise.then(() => {
                    expect("transacting" in options).to.be.eql(true);
                    expect(options.transacting).to.be.a("function");
                    expect(carRepository.repository.remove).to.have.been.calledWithExactly(car.item, options);
                });
            });
        });
    });

    it("should not start new transaction if transaction object is provided", () => {
        const car = carRepository.newEntity();

        return CarDBMapping.startTransaction((transaction) => {
            const options = { transacting: transaction };

            const promise = carRepository.save(car, options);

            return promise.then(() => {
                expect(CarDBMapping.startTransaction).to.have.callCount(1);
                expect(CarDBMapping.startTransaction).to.have.been.calledBefore(carRepository.repository.save);
            });
        });
    });

    it("should not commit transaction if transaction object is provided", () => {
        const car = carRepository.newEntity();

        return CarDBMapping.startTransaction((transaction) => {
            sinon.spy(transaction, "commit");
            const options = { transacting: transaction };

            const promise = carRepository.save(car, options);

            return promise.then(() => {
                expect(transaction.commit).to.not.have.been.callCount(1);
            });
        });
    });

    it("should rollback if save failed", () => {
        let transaction;
        const car = carRepository.newEntity();

        const promise = CarDBMapping.startTransaction((t) => {
            transaction = t;
            sinon.spy(transaction, "commit");
            sinon.spy(transaction, "rollback");
            const options = { transactional: transaction };
            carRepository.repository.save = sinon.stub().returns(Q.reject(new Error()));

            return carRepository.save(car, options);
        });

        return promise.then(() => {
            throw new Error("should fail");
        }).catch(() => {
            expect(transaction.commit).to.have.callCount(0);
            expect(transaction.rollback).to.have.callCount(1);
        });
    });

    it("should rollback if remove failed", () => {
        let transaction;
        const car = carRepository.newEntity();

        const promise = CarDBMapping.startTransaction((t) => {
            transaction = t;
            sinon.spy(transaction, "commit");
            sinon.spy(transaction, "rollback");
            const options = { transactional: transaction };
            carRepository.repository.remove = sinon.stub().returns(Q.reject(new Error()));

            return carRepository.remove(car, options);
        });

        return promise.then(() => {
            throw new Error("should fail");
        }).catch(() => {
            expect(transaction.commit).to.have.callCount(0);
            expect(transaction.rollback).to.have.callCount(1);
        });
    });

    it("should not rollback if save failed and transaction was passed in", () => {
        let transaction;
        const car = carRepository.newEntity();

        return CarDBMapping.startTransaction((t) => {
            transaction = t;
            sinon.spy(transaction, "commit");
            sinon.spy(transaction, "rollback");
            const options = { transactional: transaction };
            carRepository.repository.save = sinon.stub().returns(Q.reject(new Error()));

            const promise = carRepository.save(car, options);

            return promise.then(() => {
                throw new Error("should fail");
            }).catch(() => {
                expect(transaction.commit).to.have.callCount(0);
                expect(transaction.rollback).to.have.callCount(0);
            });
        });
    });

    it("should not rollback if remove failed and transaction was passed in", () => {
        let transaction;
        const car = carRepository.newEntity();

        return CarDBMapping.startTransaction((t) => {
            transaction = t;
            sinon.spy(transaction, "commit");
            sinon.spy(transaction, "rollback");
            const options = { transactional: transaction };
            carRepository.repository.remove = sinon.stub().returns(Q.reject(new Error()));

            const promise = carRepository.remove(car, options);

            return promise.then(() => {
                throw new Error("should fail");
            }).catch(() => {
                expect(transaction.commit).to.have.callCount(0);
                expect(transaction.rollback).to.have.callCount(0);
            });
        });

    });

    it("should commit transaction when save succeeded", () => {
        let transaction;
        const car = carRepository.newEntity();

        return CarDBMapping.startTransaction((t) => {
            transaction = t;
            sinon.spy(transaction, "commit");
            const options = { transacting: transaction };

            return carRepository.save(car, options);
        }).then(() => {
            expect(transaction.commit).to.have.been.callCount(1);
        });
    });

    it("should commit transaction when remove succeeded", () => {
        let transaction;
        const car = carRepository.newEntity();

        return carRepository.save(car).then(() => {
            return CarDBMapping.startTransaction((t) => {
                transaction = t;
                sinon.spy(transaction, "commit");
                const options = { transacting: transaction };

                const promise = carRepository.remove(car, options);

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

    beforeEach(setup);
    afterEach(teardown);

});

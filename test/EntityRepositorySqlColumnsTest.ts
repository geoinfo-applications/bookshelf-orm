"use strict";


import _ from "underscore";
import "./db/connection";
import "./db/mappings";
import { expect } from "chai";
import { CarRepository } from "./db/mocks";
import setup from "./db/setup";
import teardown from "./db/teardown";


describe("Entity Repository SQL Columns Test", () => {
    let carRepository, car, serialNumber;

    beforeEach(() => {
        carRepository = new CarRepository();
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
            expect(car).to.contain.all.keys(allKeys);
            expect(car.description).to.be.eql(undefined);
            expect(car.serialNumber).to.be.eql(undefined);
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
        let options = undefined;

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
            expect(cars).to.contain.all.keys(allKeys);
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
            expect(cars).to.contain.all.keys(allKeys);
            expect(cars.description).to.be.eql(undefined);
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
            expect(cars).to.contain.all.keys(allKeys);
            expect(cars.description).to.be.eql("name::abc");
            expect(cars.serialNumber).to.be.eql(undefined);
            definedKeys.forEach((key) => {
                expect(_.isUndefined(cars[key])).to.be.eql(false);
            });
        });
    });

    it("should include included columns", () => {
        const options = {
            columns: ["name", "description"]
        };

        let definedKeys = ["id", "name", "description", "parts"];
        let undefinedKeys = ["modelName", "serialNumber", "owner", "parkingSpace"];
        let allKeys = _.union(definedKeys, undefinedKeys);

        let promise = carRepository.save(car);

        promise = promise.then(() => {
            return carRepository.findWhere((q) => {
                q.where("name", "name");
            }, options);
        });

        return promise.then((cars) => {
            expect(cars).to.contain.all.keys(allKeys);
            expect(cars.name).to.be.eql("name");
            expect(cars.description).to.be.eql("name::abc");
            expect(cars.modelName).to.be.eql(undefined);
            undefinedKeys.forEach((key) => {
                expect(_.isUndefined(cars[key]) || _.isNull(cars[key])).to.be.eql(true);
            });
        });
    });

    beforeEach(setup);
    afterEach(teardown);

});

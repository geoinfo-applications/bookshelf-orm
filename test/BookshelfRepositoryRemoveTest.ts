"use strict";

import { expect } from "chai";
import { CarRepository, EngineRepository, OwnerRepository } from "./db/mocks";
import "./db/connection";
import "./db/mappings";
import registry from "./db/registry";
import { BookshelfRepository } from "../index";
import setup from "./db/setup";
import teardown from "./db/teardown";
import Bookshelf = require("bookshelf");


describe("Bookshelf Repository Remove Test", () => {
    /* eslint-disable camelcase */

    const CarDBMapping = registry.compile("CarDBMapping");
    const PartDBMapping = registry.compile("PartDBMapping");
    const ParkingSpaceDBMapping = registry.compile("ParkingSpaceDBMapping");

    let carRepository: BookshelfRepository<any>;

    beforeEach(() => {
        carRepository = (new CarRepository() as any).repository as BookshelfRepository<any>;
    });

    it("should drop item", () => {
        return createCar().then((item) => {
            return carRepository.remove(item, {}).then(() => {
                return carRepository.findAll(null, {}).then((items) => {
                    expect(items.length).to.be.eql(0);
                });
            });
        });
    });

    it("should drop unsaved item", () => {
        const item =  CarDBMapping.Model.forge({ name: "car" + tableIndex++ });

        return carRepository.remove(item, {}).then(() => {
            return carRepository.findAll(null, {}).then((items) => {
                expect(items.length).to.be.eql(0);
            });
        });
    });

    it("should drop item specified by id", () => {
        return createCar().then((item) => {
            return carRepository.remove(item.id, {}).then(() => {
                return carRepository.findAll(null, {}).then((items) => {
                    expect(items.length).to.be.eql(0);
                });
            });
        });
    });

    it("should drop array of item", () => {
        const item1 = CarDBMapping.Model.forge({ name: "item1" });
        const item2 = CarDBMapping.Model.forge({ name: "item2" });

        return carRepository.save([item1, item2], {}).then(() => {
            return carRepository.remove([item1, item2], {}).then(() => {
                return carRepository.findAll(null, {}).then((items) => {
                    expect(items.length).to.be.eql(0);
                });
            });
        });
    });

    it("should drop array of items specified by id", () => {
        const item1 = CarDBMapping.Model.forge<Bookshelf.Model<any>>({ name: "item1" });
        const item2 = CarDBMapping.Model.forge<Bookshelf.Model<any>>({ name: "item2" });

        return carRepository.save([item1, item2], {}).then(() => {
            return carRepository.remove([item1.id, item2.id], {}).then(() => {
                return carRepository.findAll(null, {}).then((items) => {
                    expect(items.length).to.be.eql(0);
                });
            });
        });
    });

    it("should drop Collection of item", () => {
        const item1 = CarDBMapping.Model.forge({ name: "item1" });
        const item2 = CarDBMapping.Model.forge({ name: "item2" });
        const collection = CarDBMapping.Collection.forge([item1, item2]);

        return carRepository.save(collection, {}).then(() => {
            return carRepository.remove(collection, {}).then(() => {
                return carRepository.findAll(null, {}).then((items) => {
                    expect(items.length).to.be.eql(0);
                });
            });
        });
    });

    it("should drop related items if cascade is set", () => {
        return createCar().then((item) => {
            const part = PartDBMapping.Model.forge({
                car_id: item.id,
                name: "name" + Date.now()
            });
            item.relations.relation_parts = PartDBMapping.Collection.forge(part);

            return carRepository.save(item, {}).then(() => {
                return carRepository.findOne(item.id, {}).then((item) => {
                    return carRepository.remove(item, {}).then(() => {
                        return PartDBMapping.Collection.forge<Bookshelf.Collection<any>>().fetch().then((attrs) => {
                            expect(attrs.length).to.be.eql(0);
                        });
                    });
                });
            });
        });
    });

    it("should drop related hasOne items", () => {
        return createCar().then((item) => {
            const parkingSpace = ParkingSpaceDBMapping.Model.forge({
                car_id: item.id,
                name: "name" + Date.now()
            });
            item.relations.relation_parkingSpace = parkingSpace;

            return carRepository.save(item, {}).then((item) => {
                return carRepository.remove(item, {}).then(() => {
                    return ParkingSpaceDBMapping.Collection.forge<Bookshelf.Collection<any>>().fetch().then((parkingSpaces) => {
                        expect(parkingSpaces.length).to.be.eql(0);
                    });
                });
            });
        });
    });

    it("should cascade drop deeply", () => {
        const carRepository = new CarRepository();
        const engineRepository = new EngineRepository();
        const serialNumber = "SN" + Date.now();
        const car = carRepository.newEntity({ parts: [{ wheels: [{ index: 1 }], engine: { serialNumber: serialNumber } }] });

        return carRepository.save(car).then((car) => {
            return engineRepository.findAll(null, {}).then((engines) => {
                expect(engines.length).to.be.eql(1);

                return carRepository.remove(car).then(() => {
                    return engineRepository.findAll(null, {}).then((engines) => {
                        expect(engines.length).to.be.eql(0);
                    });
                });
            });
        });
    });

    it("should cascade drop nodes in graph", () => {
        const carRepository = new CarRepository();
        const engineRepository = new EngineRepository();
        const serialNumber = "SN" + Date.now();
        const car = carRepository.newEntity({ parts: [{ wheels: [{ index: 1 }], engine: { serialNumber: serialNumber } }] });

        return carRepository.save(car).then((car) => {
            car.removeParts(car.parts);

            return carRepository.remove(car).then(() => {
                return engineRepository.findAll(null, {}).then((engines) => {
                    expect(engines.length).to.be.eql(0);
                });
            });
        });
    });

    it("should not drop non-cascaded entities", () => {
        const ownerRepository = new OwnerRepository();
        const owner = ownerRepository.newEntity();

        return ownerRepository.save(owner).then((owner) => {
            createCar().then((car) => {
                car.set("owner_id", owner.id);
                return carRepository.save(car).then((car) => {
                    return carRepository.remove(car).then(() => {
                        return ownerRepository.findAll(null, {}).then((owners) => {
                            expect(owners.length).to.be.eql(1);
                        });
                    });
                });
            });
        });
    });

    let tableIndex = 0;

    function createCar() {
        return CarDBMapping.Model.forge<Bookshelf.Model<any>>({ name: "car" + tableIndex++ }).save();
    }

    beforeEach(setup);
    afterEach(teardown);

});

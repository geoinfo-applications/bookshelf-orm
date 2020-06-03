"use strict";

import { expect } from "chai";
import { CarRepository, PartRepository } from "./db/mocks";
import "./db/connection";
import "./db/mappings";
import registry from "./db/registry";
import { BookshelfRepository } from "../index";
import setup from "./db/setup";
import teardown from "./db/teardown";
import Bookshelf = require("bookshelf");


describe("Bookshelf Repository Save Test", function () {
    /* eslint-disable camelcase */

    const CarDBMapping = registry.compile("CarDBMapping");
    const PartDBMapping = registry.compile("PartDBMapping");
    const ParkingSpaceDBMapping = registry.compile("ParkingSpaceDBMapping");
    const WheelDBMapping = registry.compile("WheelDBMapping");

    let carRepository: BookshelfRepository<any>;

    beforeEach(() => {
        carRepository = (new CarRepository() as any).repository as BookshelfRepository<any>;
    });


    it("should persist item", () => {
        const item = CarDBMapping.Model.forge<Bookshelf.Model<any>>({ name: "" });

        return carRepository.save(item, {}).then(() => {
            carRepository.findOne(item.id, {}).then((fetchedItem) => {
                expect(item.id).to.be.eql(fetchedItem.id);
            });
        });
    });

    it("should persist array of item", () => {
        const car1 = CarDBMapping.Model.forge<Bookshelf.Model<any>>({ name: "item1" });
        const car2 = CarDBMapping.Model.forge<Bookshelf.Model<any>>({ name: "item2" });

        return carRepository.save([car1, car2], {}).then(() => {
            return carRepository.findAll([car1.id, car2.id], {}).then((cars) => {
                expect(car1.id).to.be.eql(cars.at(0).id);
                expect(car2.id).to.be.eql(cars.at(1).id);
            });
        });
    });

    it("should persist Collection of item", () => {
        const item1 = CarDBMapping.Model.forge<Bookshelf.Model<any>>({ name: "item1" });
        const item2 = CarDBMapping.Model.forge<Bookshelf.Model<any>>({ name: "item2" });
        const collection = CarDBMapping.Collection.forge<Bookshelf.Collection<any>>([item1, item2]);

        return carRepository.save(collection, {}).then(() => {
            carRepository.findAll([item1.id, item2.id], {}).then((items) => {
                expect(item1.id).to.be.eql(items.at(0).id);
                expect(item2.id).to.be.eql(items.at(1).id);
            });
        });
    });

    it("should persist related items", () => {
        return createCar().then((item) => {
            const part = PartDBMapping.Model.forge<Bookshelf.Model<any>>({
                car_id: item.id,
                name: "name" + Date.now()
            });
            item.relations.relation_parts = WheelDBMapping.Collection.forge<Bookshelf.Collection<any>>(part);

            return carRepository.save(item, {}).then((item) => {
                return PartDBMapping.Collection.forge<Bookshelf.Collection<any>>().fetch().then((parts) => {
                    expect(parts.length).to.be.eql(1);
                    expect(parts.at(0).get("car_id")).to.be.eql(item.id);
                    expect(parts.at(0).get("name")).to.be.eql(part.get("name"));
                });
            });
        });
    });

    it("should persist related hasOne items", () => {
        return createCar().then((item) => {
            const parkingSpace = ParkingSpaceDBMapping.Model.forge<Bookshelf.Model<any>>({
                car_id: item.id,
                name: "name" + Date.now()
            });
            item.relations.relation_parkingSpace = parkingSpace;

            return carRepository.save(item, {}).then((item) => {
                return ParkingSpaceDBMapping.Collection.forge<Bookshelf.Collection<any>>().fetch().then((parkingSpaces) => {
                    expect(parkingSpaces.length).to.be.eql(1);
                    expect(parkingSpaces.at(0).get("car_id")).to.be.eql(item.id);
                    expect(parkingSpaces.at(0).get("name")).to.be.eql(parkingSpace.get("name"));
                });
            });
        });
    });

    it("should not persist related items if cascade is false in n:1 relation", () => {
        PartDBMapping.relations[1].references.cascade = false;
        const partRepository = new PartRepository();
        const part = partRepository.newEntity();
        part.engine = part.newEngine();

        return partRepository.save(part).then(() => {
            return partRepository.findAll().then((parts) => {
                expect(parts.length).to.be.eql(1);
                expect(parts[0].engine).to.be.eql(null);
            });
        }).finally(() => {
            PartDBMapping.relations[1].references.cascade = true;
        });
    });

    it("should not persist related items if cascade is false in 1:n relation", () => {
        CarDBMapping.relations[0].references.cascade = false;
        const part = PartDBMapping.Model.forge<Bookshelf.Model<any>>({ name: "originalName" });
        const car = CarDBMapping.Model.forge<Bookshelf.Model<any>>({ name: "name1" });

        return part.save().then((part) => car.save().then((car) => [car, part])).then(([part, car]) => {
            part.set("name", "notToBeSaved" + Date.now());
            car.relations.relation_parts = PartDBMapping.Collection.forge<Bookshelf.Collection<any>>(part);

            return carRepository.save(car, {}).then((car) => {
                return PartDBMapping.Collection.forge<Bookshelf.Collection<any>>().fetch().then((parts) => {
                    expect(parts.at(0).get("car_id")).to.be.eql(car.id);
                    expect(parts.at(0).get("name")).to.be.eql("originalName");
                });
            });
        }).finally(() => {
            CarDBMapping.relations[0].references.cascade = true;
        });
    });

    it("should persist related items where root is new", () => {
        const item = CarDBMapping.Model.forge<Bookshelf.Model<any>>({
            name: "itname" + Date.now()
        });
        const part = PartDBMapping.Model.forge<Bookshelf.Model<any>>({
            name: "aname" + Date.now()
        });
        (item as any).relations.relation_parts = PartDBMapping.Collection.forge<Bookshelf.Collection<any>>(part);

        return carRepository.save(item, {}).then((item) => {
            return carRepository.findOne(item.id, {}).then((fetchedItem) => {
                expect(fetchedItem.get("name")).to.be.eql(item.get("name"));

                const parts = fetchedItem.relations.relation_parts;
                expect(parts.length).to.be.eql(1);
                expect(parts.at(0).get("car_id")).to.be.eql(item.id);
                expect(parts.at(0).get("name")).to.be.eql(part.get("name"));
            });
        });
    });

    it("should persist related items where foreign key is on item", () => {
        const partRepository = new PartRepository();
        const part = partRepository.newEntity();
        const name = "part" + Date.now();
        part.name = name;
        const engine = part.newEngine();
        const serialNumber = "SN" + Date.now();
        engine.serialNumber = serialNumber;
        part.engine = engine;

        return partRepository.save(part).then(() => {
            return partRepository.findAll().then((parts) => {
                expect(parts.length).to.be.eql(1);
                expect(parts[0].name).to.be.eql(name);
                expect(parts[0].engine!.serialNumber).to.be.eql(serialNumber);
            });
        });
    });

    it("should throw if related value is not saveable", () => {
        return createCar().then((item) => {
            item.relations.relation_parts = {};

            return carRepository.save(item, {}).then(() => {
                throw new Error("should fail");
            }).catch((error) => {
                expect(error.message).to.match(/can not be saved/);
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

"use strict";

import { expect } from "chai";
import { CarRepository, EngineRepository, PartRepository } from "./db/mocks";
import "./db/connection";
import registry from "./db/registry";
import "./db/mappings";
import { BookshelfRepository } from "../index";
import setup from "./db/setup";
import teardown from "./db/teardown";
import Bookshelf = require("bookshelf");


describe("Bookshelf Repository Orphan Removal Test", () => {
    /* eslint-disable camelcase */

    const CarDBMapping = registry.compile("CarDBMapping");
    const PartDBMapping = registry.compile("PartDBMapping");
    const EngineDBMapping = registry.compile("EngineDBMapping");
    const WheelDBMapping = registry.compile("WheelDBMapping");
    const MakeDBMapping = registry.compile("MakeDBMapping");
    const OutletDBMapping = registry.compile("OutletDBMapping");
    const InjectionDBMapping = registry.compile("InjectionDBMapping");

    let carRepository: BookshelfRepository<any>;

    beforeEach(() => {
        carRepository = (new CarRepository() as any).repository as BookshelfRepository<any>;
    });

    describe("1:n relations", () => {

        it("should remove orphans", () => {
            return createCar().then((item) => {
                const part = PartDBMapping.Model.forge({
                    car_id: item.id,
                    name: "name" + Date.now()
                });
                item.relations.relation_parts = PartDBMapping.Collection.forge(part);

                return carRepository.save(item, {}).then((item) => {
                    item.relations.relation_parts.models = [];
                    return carRepository.save(item, {}).then(() => {
                        return PartDBMapping.Collection.forge<Bookshelf.Collection<any>>().fetch().then((parts) => {
                            expect(parts.length).to.be.eql(0);
                        });
                    });
                });
            });
        });

        it("should not remove still attached relations", () => {
            return createCar().then((item) => {
                const part = PartDBMapping.Model.forge({
                    car_id: item.id,
                    name: "name" + Date.now()
                });
                item.relations.relation_parts = PartDBMapping.Collection.forge(part);

                return carRepository.save(item, {}).then((item) => {
                    return carRepository.save(item, {}).then(() => {
                        return PartDBMapping.Collection.forge<Bookshelf.Collection<any>>().fetch().then((parts) => {
                            expect(parts.length).to.be.eql(1);
                        });
                    });
                });
            });
        });

    });

    describe("n:1 relations", () => {

        it("should remove orphans", () => {
            const partRepository = new PartRepository();
            const engineRepository = new EngineRepository();
            const engine = engineRepository.newEntity();
            const part = partRepository.newEntity();
            part.engine = engine;

            return partRepository.save(part).then(() => {
                part.engine = null;
                return partRepository.save(part).then(() => {
                    return EngineDBMapping.Collection.forge<Bookshelf.Collection<any>>().fetch().then((parts) => {
                        expect(parts.length).to.be.eql(0);
                    });
                });
            });
        });

        it("should not remove still attached relations", () => {
            const partRepository = new PartRepository();
            const engineRepository = new EngineRepository();
            const engine = engineRepository.newEntity();
            const part = partRepository.newEntity();
            part.engine = engine;

            return partRepository.save(part).then(() => {
                return partRepository.save(part).then(() => {
                    return EngineDBMapping.Collection.forge<Bookshelf.Collection<any>>().fetch().then((parts) => {
                        expect(parts.length).to.be.eql(1);
                    });
                });
            });
        });

        it("should remove orphans deeply", () => {
            const partRepository = new PartRepository();
            const engineRepository = new EngineRepository();
            const engine = engineRepository.newEntity();
            const part = partRepository.newEntity();
            part.engine = engine;
            engine.injection = engine.newInjection();
            engine.addOutlets(engine.newOutlets());

            return partRepository.save(part).then(() => {
                part.engine = null;
                return partRepository.save(part).then(() => {
                    return EngineDBMapping.Collection.forge<Bookshelf.Collection<any>>().fetch().then((parts) => {
                        return InjectionDBMapping.Collection.forge<Bookshelf.Collection<any>>().fetch().then((injection) => {
                            return OutletDBMapping.Collection.forge<Bookshelf.Collection<any>>().fetch().then((outlets) => {
                                expect(parts.length).to.be.eql(0);
                                expect(injection.length).to.be.eql(0);
                                expect(outlets.length).to.be.eql(0);
                            });
                        });
                    });
                });
            });
        });

    });

    it("should save convoluted relations in transaction", async () => {
        let car = await CarDBMapping.Model.forge<Bookshelf.Model<any>>().save();
        let make = await MakeDBMapping.Model.forge<Bookshelf.Model<any>>().save();
        let part = await PartDBMapping.Model.forge<Bookshelf.Model<any>>({ car_id: car.id, name: "part1" }).save();
        const wheel1 = WheelDBMapping.Model.forge<Bookshelf.Model<any>>({ part_id: part.id, make_id: make.id, index: 1 });
        const wheel2 = WheelDBMapping.Model.forge<Bookshelf.Model<any>>({ part_id: part.id, make_id: make.id, index: 2 });
        await Promise.all([wheel1.save(), wheel2.save()]);
        car = await carRepository.findOne(car.id, {});

        let parts = car.relations.relation_parts;
        expect(parts.models.length).to.be.eql(1);
        let wheels = parts.at(0).relations.relation_wheels;
        expect(wheels.models.length).to.be.eql(2);
        expect(wheels.at(0).relations.relation_make.id).to.be.eql(wheels.at(1).relations.relation_make.id);
        wheels.remove(wheels.at(0));
        car.set("description", "foo");

        car = await Promise.resolve().then(() => {
            return CarDBMapping.startTransaction((t) => {
                return carRepository.save(car, { transacting: t }).then(t.commit).catch(t.rollback);
            }).then(carRepository.findOne(car.id, {}) as any);
        });

        parts = car.relations.relation_parts;
        expect(parts.models.length).to.be.eql(1);
        wheels = parts.at(0).relations.relation_wheels;
        expect(wheels.models.length).to.be.eql(1);
        expect(wheels.at(0).relations.relation_make.id).to.be.gt(0);
    });


    let tableIndex = 0;

    function createCar() {
        return CarDBMapping.Model.forge<Bookshelf.Model<any>>({ name: "car" + tableIndex++ }).save();
    }

    beforeEach(setup);
    afterEach(teardown);

});

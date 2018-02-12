"use strict";


describe("Bookshelf Repository Orphan Removal Test", function () {
    // jshint maxstatements:false

    const chai = require("chai");
    const expect = chai.expect;

    const CarRepository = require("./db/mocks").CarRepository;
    const EngineRepository = require("./db/mocks").EngineRepository;
    const PartRepository = require("./db/mocks").PartRepository;

    require("./db/connection");
    const registry = require("./db/registry");
    require("./db/mappings");

    const CarDBMapping = registry.compile("CarDBMapping");
    const PartDBMapping = registry.compile("PartDBMapping");
    const EngineDBMapping = registry.compile("EngineDBMapping");
    const WheelDBMapping = registry.compile("WheelDBMapping");
    const MakeDBMapping = registry.compile("MakeDBMapping");
    const OutletDBMapping = registry.compile("OutletDBMapping");
    const InjectionDBMapping = registry.compile("InjectionDBMapping");

    this.timeout(1000);
    var carRepository;

    beforeEach(() => {
        carRepository = new CarRepository().repository;
    });

    describe("1:n relations", () => {

        it("should remove orphans", () => {
            return createCar().then((item) => {
                var part = PartDBMapping.Model.forge({
                    car_id: item.id,
                    name: "name" + Date.now()
                });
                item.relations.relation_parts = PartDBMapping.Collection.forge(part);

                return carRepository.save(item, {}).then((item) => {
                    item.relations.relation_parts.models = [];
                    return carRepository.save(item, {}).then(() => {
                        return PartDBMapping.Collection.forge().fetch().then((parts) => {
                            expect(parts.length).to.be.eql(0);
                        });
                    });
                });
            });
        });

        it("should not remove still attached relations", () => {
            return createCar().then((item) => {
                var part = PartDBMapping.Model.forge({
                    car_id: item.id,
                    name: "name" + Date.now()
                });
                item.relations.relation_parts = PartDBMapping.Collection.forge(part);

                return carRepository.save(item, {}).then((item) => {
                    return carRepository.save(item, {}).then(() => {
                        return PartDBMapping.Collection.forge().fetch().then((parts) => {
                            expect(parts.length).to.be.eql(1);
                        });
                    });
                });
            });
        });

    });

    describe("n:1 relations", () => {

        it("should remove orphans", () => {
            var partRepository = new PartRepository();
            var engineRepository = new EngineRepository();
            var engine = engineRepository.newEntity();
            var part = partRepository.newEntity();
            part.engine = engine;

            return partRepository.save(part).then(() => {
                part.engine = null;
                return partRepository.save(part).then(() => {
                    return EngineDBMapping.Collection.forge().fetch().then((parts) => {
                        expect(parts.length).to.be.eql(0);
                    });
                });
            });
        });

        it("should not remove still attached relations", () => {
            var partRepository = new PartRepository();
            var engineRepository = new EngineRepository();
            var engine = engineRepository.newEntity();
            var part = partRepository.newEntity();
            part.engine = engine;

            return partRepository.save(part).then(() => {
                return partRepository.save(part).then(() => {
                    return EngineDBMapping.Collection.forge().fetch().then((parts) => {
                        expect(parts.length).to.be.eql(1);
                    });
                });
            });
        });

        it("should remove orphans deeply", () => {
            var partRepository = new PartRepository();
            var engineRepository = new EngineRepository();
            var engine = engineRepository.newEntity();
            var part = partRepository.newEntity();
            part.engine = engine;
            engine.injection = engine.newInjection();
            engine.addOutlets(engine.newOutlets());

            return partRepository.save(part).then(() => {
                part.engine = null;
                return partRepository.save(part).then(() => {
                    return EngineDBMapping.Collection.forge().fetch().then((parts) => {
                        return InjectionDBMapping.Collection.forge().fetch().then((injection) => {
                            return OutletDBMapping.Collection.forge().fetch().then((outlets) => {
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

    it("should save convoluted relations in transaction", () => {
        return Promise.all([
            CarDBMapping.Model.forge().save(),
            MakeDBMapping.Model.forge().save()
        ]).then(([car, make]) => {
            return PartDBMapping.Model.forge({ car_id: car.id, name: "part1" }).save().then((part) => {
                const wheel1 = WheelDBMapping.Model.forge({ part_id: part.id, make_id: make.id, index: 1 });
                const wheel2 = WheelDBMapping.Model.forge({ part_id: part.id, make_id: make.id, index: 2 });
                return Promise.all([wheel1.save(), wheel2.save()]);
            }).then(() => carRepository.findOne(car.id, {}));
        }).then((car) => {
            const parts = car.relations.relation_parts;
            expect(parts.models.length).to.be.eql(1);
            const wheels = parts.at(0).relations.relation_wheels;
            expect(wheels.models.length).to.be.eql(2);
            expect(wheels.at(0).relations.relation_make.id).to.be.eql(wheels.at(1).relations.relation_make.id);

            wheels.remove(wheels.at(0));
            car.set("description", "foo");

            return CarDBMapping.startTransaction((t) => {
                return carRepository.save(car, { transacting: t }).then(t.commit).catch(t.rollback);
            }).then(carRepository.findOne(car.id, {}));
        }).then((car) => {
            const parts = car.relations.relation_parts;
            expect(parts.models.length).to.be.eql(1);
            const wheels = parts.at(0).relations.relation_wheels;
            expect(wheels.models.length).to.be.eql(1);
            expect(wheels.at(0).relations.relation_make.id).to.be.gt(0);
        });
    });


    var tableIndex = 0;

    function createCar() {
        return CarDBMapping.Model.forge({ name: "car" + tableIndex++ }).save();
    }

    beforeEach(require("./db/setup"));
    afterEach(require("./db/teardown"));

});

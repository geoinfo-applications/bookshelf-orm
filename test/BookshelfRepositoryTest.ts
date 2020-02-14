"use strict";


describe("Bookshelf Repository Test", function () {
    /* eslint max-statements: 0, camelcase: 0 */

    const expect = require("chai").expect;
    const CarRepository = require("./db/mocks").CarRepository;
    const EngineRepository = require("./db/mocks").EngineRepository;
    const VeyronEngineRepository = require("./db/mocks").VeyronEngineRepository;
    const VeyronPartRepository = require("./db/mocks").VeyronPartRepository;
    const OwnerRepository = require("./db/mocks").OwnerRepository;
    const NamelessOwnerRepository = require("./db/mocks").NamelessOwnerRepository;
    const PersonRepository = require("./db/mocks").PersonRepository;
    const HalflingRepository = require("./db/mocks").HalflingRepository;

    require("./db/connection");
    const registry = require("./db/registry");
    require("./db/mappings");

    const CarDBMapping = registry.compile("CarDBMapping");
    const PartDBMapping = registry.compile("PartDBMapping");
    const PersonDBMapping = registry.compile("PersonDBMapping");
    const HalflingDBMapping = registry.compile("HalflingDBMapping");

    this.timeout(1000);
    let carRepository;

    beforeEach(() => {
        carRepository = new CarRepository().repository;
    });

    it("should be defined", () => {
        expect(CarRepository).to.be.a("function");
    });

    describe("findAll", () => {

        it("should return Collection of Cars", () => {
            return carRepository.findAll(null, {}).then((cars) => {
                expect(cars).to.be.instanceof(CarDBMapping.Collection);
            });
        });

        it("should return Collection of Cars with specified ids", () => {
            return createCar().then((model) => {
                return carRepository.findAll([model.id], {}).then((cars) => {
                    expect(cars.length).to.be.eql(1);
                    expect(cars.at(0).id).to.be.eql(model.id);
                });
            });
        });

        it("should return empty Collection of Car if ids is an empty array", () => {
            return carRepository.findAll([], {}).then((cars) => {
                expect(cars).to.be.instanceof(CarDBMapping.Collection);
                expect(cars.length).to.be.eql(0);
            });
        });

        it("should return all Cars", () => {
            return createCar().then((model1) => {
                return createCar().then((model2) => {
                    return carRepository.findAll(null, {}).then((cars) => {
                        expect(cars.length).to.be.eql(2);
                        expect(cars.at(0).id).to.be.eql(model1.id);
                        expect(cars.at(1).id).to.be.eql(model2.id);
                    });
                });
            });
        });

        it("should return instance with related data", () => {
            return createCar().then((model1) => {
                return PartDBMapping.Model.forge({
                    car_id: model1.id,
                    name: ""
                }).save().then((attribute1) => {
                    createCar().then((model2) => {
                        return PartDBMapping.Model.forge({
                            car_id: model2.id,
                            name: "",
                            label: ""
                        }).save().then((attribute2) => {
                            return carRepository.findAll().then((models) => {
                                expect(models.at(0).related("relation_parts").length).to.be.eql(1);
                                expect(models.at(1).related("relation_parts").length).to.be.eql(1);
                                expect(models.at(0).related("relation_parts").at(0).id).to.be.eql(attribute1.id);
                                expect(models.at(1).related("relation_parts").at(0).id).to.be.eql(attribute2.id);
                            });
                        });
                    });
                });
            });
        });

        it("should return empty list if no importcars exist", () => {
            return carRepository.findAll(null, {}).then((cars) => {
                expect(cars.length).to.be.eql(0);
            });
        });

        it("should return empty list if no importcars with given ids exist", () => {
            return createCar().then(() => {
                return createCar().then(() => {
                    return carRepository.findAll([-1, -2, -3], {}).then((cars) => {
                        expect(cars.length).to.be.eql(0);
                    });
                });
            });
        });

        it("should order ids[] correctly", async () => {
            await createCar();
            await createCar();

            const cars = await carRepository.findAll([2, 1], {});

            expect(cars.length).to.be.eql(2);
            expect(cars.models[0].id).to.be.eql(2);
            expect(cars.models[1].id).to.be.eql(1);
        });

        it("should escape correctly for ids[] as uuid[] and order them", async () => {
            const halflingRepository = new HalflingRepository().repository;
            await createHalfling();
            await createHalfling();
            await createHalfling();
            const allHalflings = await halflingRepository.findAll(null, {});
            const uuid1 = allHalflings.models[2].id;
            const uuid2 = allHalflings.models[1].id;

            const halflings = await halflingRepository.findAll([uuid1, uuid2], {});

            expect(halflings.length).to.be.eql(2);
            expect(halflings.models[0].id).to.be.eql(uuid1);
            expect(halflings.models[1].id).to.be.eql(uuid2);
        });

    });

    describe("findOne", () => {

        it("should return instance of Car with specified id", () => {
            return createCar().then((model) => {
                return carRepository.findOne(model.id, {}).then((fetchedModel) => {
                    expect(fetchedModel).to.be.instanceof(CarDBMapping.Model);
                    expect(fetchedModel.id).to.be.eql(model.id);
                });
            });
        });

        it("should return instance with related data", () => {
            return createCar().then((model) => {
                return PartDBMapping.Model.forge({
                    car_id: model.id,
                    name: ""
                }).save().then((attribute) => {
                    return carRepository.findOne(model.id, {}).then((model) => {
                        expect(model.related("relation_parts").length).to.be.eql(1);
                        expect(model.related("relation_parts").at(0).id).to.be.eql(attribute.id);
                    });
                });
            });
        });

        it("should return null if item with given id doesn't exist", () => {
            return carRepository.findOne(-1, {}).then((fetchedModel) => {
                expect(fetchedModel).to.be.eql(null);
            });
        });

    });

    describe("remove", () => {

        let personRepository;

        beforeEach(() => {
            personRepository = new PersonRepository().repository;
        });

        it("should drop item which is identified by a column other than id", () => {
            return PersonDBMapping.Model.forge({ name: "Gandalf" }).save(null, { method: "insert" }).then((item) => {
                return personRepository.remove(item, {}).then(() => {
                    return personRepository.findOne("Gandalf", {}).then((item) => {
                        expect(item).to.be.eql(null);
                    });
                });
            });
        });

    });

    describe("stringifyJson", () => {
        let personRepository;
        let personRepositoryBookshelf;

        beforeEach(() => {
            personRepository = new PersonRepository();
            personRepositoryBookshelf = new PersonRepository().repository;
        });

        it("shouldn't stringify null values", () => {
            const entity = personRepository.newEntity({ name: "Gandalf", things: null });
            const unwrapedEntity = personRepository.wrapper.unwrap(entity);
            personRepositoryBookshelf.stringifyJson(unwrapedEntity);

            expect(unwrapedEntity.attributes.things).to.be.eql(null);
        });

    });

    describe("discriminator", () => {
        let engineRepository, veyronEngineRepository, engine1, engine2;

        beforeEach(() => {
            engineRepository = new EngineRepository();
            veyronEngineRepository = new VeyronEngineRepository();

            engine1 = engineRepository.newEntity({ ps: 100 });
            engine2 = engineRepository.newEntity({ ps: 1000 });

            return engineRepository.save([engine1, engine2]);
        });

        it("findAll should return items which are matched by discriminator", () => {
            return veyronEngineRepository.findAll().then((engines) => {
                expect(engines.length).to.be.eql(1);
                expect(engines[0].id).to.be.eql(engine2.id);
            });
        });

        it("findOne should return item which is matched by discriminator", () => {
            return veyronEngineRepository.findOne(engine2.id).then((engine) => {
                expect(engine.id).to.be.eql(engine2.id);
            });
        });

        it("findOne should return null if id doesn't find one matched by discriminator", () => {
            return veyronEngineRepository.findOne(engine1.id).then((engine) => {
                expect(engine).to.be.eql(null);
            });
        });

    });

    describe("null discriminator", () => {
        let ownerRepository, namelessOwnerRepository, owner, namelessOwner;

        beforeEach(() => {
            ownerRepository = new OwnerRepository();
            namelessOwnerRepository = new NamelessOwnerRepository();

            owner = ownerRepository.newEntity({ name: "blubi" });
            namelessOwner = ownerRepository.newEntity({ name: null });

            return ownerRepository.save([owner, namelessOwner]);
        });

        it("findAll should return items which are matched by null discriminator", () => {
            return namelessOwnerRepository.findAll().then((owners) => {
                expect(owners.length).to.be.eql(1);
                expect(owners[0].id).to.be.eql(namelessOwner.id);
            });
        });

        it("findOne should return item which is matched by null discriminator", () => {
            return namelessOwnerRepository.findOne(namelessOwner.id).then((owner) => {
                expect(owner.id).to.be.eql(namelessOwner.id);
            });
        });

        it("findOne should return null if id doesn't find one matched by null discriminator", () => {
            return namelessOwnerRepository.findOne(owner.id).then((owner) => {
                expect(owner).to.be.eql(null);
            });
        });

    });

    describe("related discriminator", () => {
        let veyronPartRepository, engineRepository;
        let engine, veyronEngine, veyronPart;

        beforeEach(() => {
            veyronPartRepository = new VeyronPartRepository();
            veyronPart = veyronPartRepository.newEntity();

            engineRepository = new EngineRepository();
            engine = engineRepository.newEntity({ ps: 100 });
            veyronEngine = engineRepository.newEntity({ ps: 1000 });

            return engineRepository.save([engine, veyronEngine]).then(() => {
                return veyronPartRepository.save(veyronPart);
            });
        });

        it("should findOne related item if discriminator matches", () => {
            veyronPart.engine = veyronEngine;
            let promise = veyronPartRepository.save(veyronPart);

            promise = promise.then(() => veyronPartRepository.findOne(veyronPart.id));

            return promise.then((part) => {
                expect(part.engine.id).to.be.eql(veyronEngine.id);
            });
        });

        it("should not findOne related item if discriminator does not match", () => {
            veyronPart.engine = engine;
            let promise = veyronPartRepository.save(veyronPart);

            promise = promise.then(() => veyronPartRepository.findOne(veyronPart.id));

            return promise.then((part) => {
                expect(part.engine).to.be.eql(null);
            });
        });

        it("should findAll related item if discriminator matches", () => {
            veyronPart.engine = veyronEngine;
            let promise = veyronPartRepository.save(veyronPart);

            promise = promise.then(() => veyronPartRepository.findAll());

            return promise.then((parts) => {
                expect(parts[0].engine.id).to.be.eql(veyronEngine.id);
            });
        });

        it("should not findAll related item if discriminator does not match", () => {
            veyronPart.engine = engine;
            let promise = veyronPartRepository.save(veyronPart);

            promise = promise.then(() => veyronPartRepository.findAll());

            return promise.then((parts) => {
                expect(parts[0].engine).to.be.eql(null);
            });
        });

        // TODO: cascade and orphanRemoval

    });

    let tableIndex = 0;

    function createCar() {
        return CarDBMapping.Model.forge({ name: "car" + tableIndex++ }).save();
    }

    function createHalfling() {
        return HalflingDBMapping.Model.forge({ name: "halfling" + tableIndex++ }).save();
    }

    beforeEach(require("./db/setup"));
    afterEach(require("./db/teardown"));

});

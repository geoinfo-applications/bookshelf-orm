"use strict";

import { expect } from "chai";
import { CarRepository, PartRepository, DungeonRepository } from "./db/mocks";
import "./db/connection";
import "./db/mappings";
import registry from "./db/registry";
import { BookshelfRepository } from "../index";
import setup from "./db/setup";
import teardown from "./db/teardown";
import Bookshelf = require("bookshelf");


/* eslint-disable-next-line max-statements */
describe("Bookshelf Repository Save Test", () => {
    /* eslint-disable camelcase */

    const CarDBMapping = registry.compile("CarDBMapping");
    const PartDBMapping = registry.compile("PartDBMapping");
    const ParkingSpaceDBMapping = registry.compile("ParkingSpaceDBMapping");
    const WheelDBMapping = registry.compile("WheelDBMapping");

    let carRepository: BookshelfRepository<any>;

    beforeEach(() => {
        carRepository = (new CarRepository() as any).repository as BookshelfRepository<any>;
    });


    it("should persist item", async () => {
        const item = CarDBMapping.Model.forge<Bookshelf.Model<any>>({ name: "" });

        await carRepository.save(item, {});
        const fetchedItem = await carRepository.findOne(item.id, {});

        expect(item.id).to.be.eql(fetchedItem.id);
    });

    it("should persist array of item", async () => {
        const car1 = CarDBMapping.Model.forge<Bookshelf.Model<any>>({ name: "item1" });
        const car2 = CarDBMapping.Model.forge<Bookshelf.Model<any>>({ name: "item2" });

        await carRepository.save([car1, car2], {});
        const cars = await carRepository.findAll([car1.id, car2.id], {});

        expect(car1.id).to.be.eql(cars.at(0).id);
        expect(car2.id).to.be.eql(cars.at(1).id);
    });

    it("should persist Collection of item", async () => {
        const item1 = CarDBMapping.Model.forge<Bookshelf.Model<any>>({ name: "item1" });
        const item2 = CarDBMapping.Model.forge<Bookshelf.Model<any>>({ name: "item2" });
        const collection = CarDBMapping.Collection.forge<Bookshelf.Collection<any>>([item1, item2]);

        await carRepository.save(collection, {});
        const items = await carRepository.findAll([item1.id, item2.id], {});

        expect(item1.id).to.be.eql(items.at(0).id);
        expect(item2.id).to.be.eql(items.at(1).id);
    });

    it("should persist related items", async () => {
        const item = await createCar();
        const part = PartDBMapping.Model.forge<Bookshelf.Model<any>>({
            car_id: item.id,
            name: `name${Date.now()}`
        });
        item.relations.relation_parts = WheelDBMapping.Collection.forge<Bookshelf.Collection<any>>(part);

        const savedItem = await carRepository.save(item, {});
        const parts = await PartDBMapping.Collection.forge<Bookshelf.Collection<any>>().fetch();

        expect(parts.length).to.be.eql(1);
        expect(parts.at(0).get("car_id")).to.be.eql(savedItem.id);
        expect(parts.at(0).get("name")).to.be.eql(part.get("name"));
    });

    it("should persist related hasOne items", async () => {
        const item = await createCar();
        const parkingSpace = ParkingSpaceDBMapping.Model.forge<Bookshelf.Model<any>>({
            car_id: item.id,
            name: `name${Date.now()}`
        });
        item.relations.relation_parkingSpace = parkingSpace;

        const savedItem = await carRepository.save(item, {});
        const parkingSpaces = await ParkingSpaceDBMapping.Collection.forge<Bookshelf.Collection<any>>().fetch();

        expect(parkingSpaces.length).to.be.eql(1);
        expect(parkingSpaces.at(0).get("car_id")).to.be.eql(savedItem.id);
        expect(parkingSpaces.at(0).get("name")).to.be.eql(parkingSpace.get("name"));
    });

    it("should not persist related items if cascade is false in n:1 relation", async () => {
        try {
            PartDBMapping.relations[1].references.cascade = false;
            const partRepository = new PartRepository();
            const part = partRepository.newEntity();
            part.engine = part.newEngine();

            await partRepository.save(part);
            const parts = await partRepository.findAll();

            expect(parts.length).to.be.eql(1);
            expect(parts[0].engine).to.be.eql(null);
        } finally {
            PartDBMapping.relations[1].references.cascade = true;
        }
    });

    it("should not persist related items if cascade is false in 1:n relation", async () => {
        try {
            CarDBMapping.relations[0].references.cascade = false;
            const part = PartDBMapping.Model.forge<Bookshelf.Model<any>>({ name: "originalName" });
            const car = CarDBMapping.Model.forge<Bookshelf.Model<any>>({ name: "name1" });

            const [savedPart, savedCar] = await Promise.all([part.save(), car.save()]);
            savedPart.set("name", `notToBeSaved${Date.now()}`);
            savedCar.relations.relation_parts = PartDBMapping.Collection.forge<Bookshelf.Collection<any>>(savedPart);

            const savedCar2 = await carRepository.save(savedCar, {});
            const parts = await PartDBMapping.Collection.forge<Bookshelf.Collection<any>>().fetch();
            expect(parts.at(0).get("car_id")).to.be.eql(savedCar2.id);
            expect(parts.at(0).get("name")).to.be.eql("originalName");
        } finally {
            CarDBMapping.relations[0].references.cascade = true;
        }
    });

    it("should persist related items where root is new", async () => {
        const item = CarDBMapping.Model.forge<Bookshelf.Model<any>>({
            name: `itname${Date.now()}`
        });
        const part = PartDBMapping.Model.forge<Bookshelf.Model<any>>({
            name: `aname${Date.now()}`
        });
        (item as any).relations.relation_parts = PartDBMapping.Collection.forge<Bookshelf.Collection<any>>(part);

        const savedItem = await carRepository.save(item, {});
        const fetchedItem = await carRepository.findOne(savedItem.id, {});
        expect(fetchedItem.get("name")).to.be.eql(savedItem.get("name"));

        const parts = fetchedItem.relations.relation_parts;
        expect(parts.length).to.be.eql(1);
        expect(parts.at(0).get("car_id")).to.be.eql(savedItem.id);
        expect(parts.at(0).get("name")).to.be.eql(part.get("name"));
    });

    it("should persist related items where foreign key is on item", async () => {
        const partRepository = new PartRepository();
        const part = partRepository.newEntity();
        const name = `part${Date.now()}`;
        part.name = name;
        const engine = part.newEngine();
        const serialNumber = `SN${Date.now()}`;
        engine.serialNumber = serialNumber;
        part.engine = engine;

        await partRepository.save(part);
        const parts = await partRepository.findAll();

        expect(parts.length).to.be.eql(1);
        expect(parts[0].name).to.be.eql(name);
        expect(parts[0].engine!.serialNumber).to.be.eql(serialNumber);
    });

    it("should throw if related value is not saveable", async () => {
        try {
            const item = await createCar();
            item.relations.relation_parts = {};

            await carRepository.save(item, {});
            throw new Error("should fail");
        } catch (error) {
            expect(error.message).to.match(/can not be saved/);
        }
    });

    describe("keepHistory with historyChangeCheck", () => {
        let dungeonRepository;
        let dungeonId: number;

        beforeEach(async () => {
            dungeonRepository = new DungeonRepository();

            const kobold = {
                name: "Arnold Schwarzenegger",
                age: 73,
                hp: 133,
                dungeon_id: dungeonId,
                kobold_number: `kb-${Date.now()}`,
                jobs: {
                    bodybuilder: true,
                    gouverneur: false
                }
            };
            const dungeon = dungeonRepository.newEntity({
                name: "Vault of the Rejected Raven",
                coordinates: "2743287, 1254501",
                kobolds: [kobold]
            });


            const savedDungeon = await dungeonRepository.save(dungeon, {});
            dungeonId = savedDungeon.id;
        });

        it("should create new state on save when child item with history changed", async () => {
            const name = "Vault of the Rejected Kobolds";
            const dungeon = await dungeonRepository.findOne(dungeonId, {});
            const kobold = dungeon.kobolds[0];
            const id = kobold.id;
            const revisionId = kobold.revisionId;
            dungeon.name = name;
            kobold.hp = 128;
            kobold.kobold_number = `kb-${Date.now()}`;
            kobold.jobs = {
                bodybuilder: false,
                gouverneur: true
            };

            const savedDungeon = await dungeonRepository.save(dungeon, {});

            const savedKobold = savedDungeon.kobolds[0];
            expect(savedKobold.id).to.be.eql(id);
            expect(savedKobold.revisionId).to.not.be.eql(revisionId);
            expect(savedKobold.parentId).to.be.eql(revisionId);
            expect(savedKobold.hp).to.be.eql(128);
            expect(savedDungeon.name).to.be.eql(name);
        });

        it("should not create new state on save when child item with history didn't change", async () => {
            const name = "Vault of the Rejected Dragons";
            const dungeon = await dungeonRepository.findOne(dungeonId, {});
            const { id, revisionId } = dungeon.kobolds[0];
            dungeon.name = name;
            dungeon.kobolds[0].jobs = {
                bodybuilder: true,
                gouverneur: false
            };

            const savedDungeon = await dungeonRepository.save(dungeon, {});

            const savedKobold = savedDungeon.kobolds[0];
            expect(savedKobold.id).to.be.eql(id);
            expect(savedKobold.revisionId).to.be.eql(revisionId);
            expect(savedKobold.parentId).to.be.eql(null);
            expect(savedDungeon.name).to.be.eql(name);
        });

    });

    let tableIndex = 0;

    function createCar() {
        return CarDBMapping.Model.forge<Bookshelf.Model<any>>({ name: "car" + tableIndex++ }).save();
    }


    beforeEach(setup);
    afterEach(teardown);

});

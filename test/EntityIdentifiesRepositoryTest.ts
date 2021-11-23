"use strict";

import chai, { expect } from "chai";
import sinonChai from "sinon-chai";
import {
    AlbumRepository,
    AlbumInstrumentRepository,
    CatRepository,
    HornRepository,
    InstrumentRepository,
    KittenRepository,
    SampleCatRepository,
    SampleKittenRepository,
    UnicornRepository
} from "./db/mocks";
import "./db/connection";
import "./db/mappings";
import setup from "./db/setup";
import teardown from "./db/teardown";
import sinon, { SinonStub } from "sinon";


describe("Entity Repository Test with identifies option", () => {
    chai.use(sinonChai);

    let hornRepository, unicornRepository, albumRepository, instrumentRepository, catRepository, kittenRepository, sampleCatRepository,
        sampleKittenRepository, albumInstrumentRepository;

    beforeEach(() => {
        hornRepository = new HornRepository();
        unicornRepository = new UnicornRepository();
        albumRepository = new AlbumRepository();
        albumInstrumentRepository = new AlbumInstrumentRepository();
        instrumentRepository = new InstrumentRepository();
        catRepository = new CatRepository();
        kittenRepository = new KittenRepository();
        sampleCatRepository = new SampleCatRepository();
        sampleKittenRepository = new SampleKittenRepository();
    });

    it("should be defined", () => {
        expect(HornRepository).to.be.a("function");
        expect(UnicornRepository).to.be.a("function");
        expect(AlbumRepository).to.be.a("function");
        expect(AlbumInstrumentRepository).to.be.a("function");
        expect(InstrumentRepository).to.be.a("function");
        expect(CatRepository).to.be.a("function");
        expect(KittenRepository).to.be.a("function");
        expect(SampleCatRepository).to.be.a("function");
        expect(SampleKittenRepository).to.be.a("function");
    });

    describe("belongsTo with simple model", () => {

        it("unicorn was born with a horn which cannot be changed", async () => {
            const spiralHornType = await hornRepository.save(hornRepository.newEntity({ type: "spiral horn" }));
            const unicornBornWithSpiralHorn = await unicornRepository.save(unicornRepository.newEntity({
                name: "Powerslave",
                hornType: spiralHornType
            }));

            const hornTypeUpgrade = await hornRepository.save(hornRepository.newEntity({ ...spiralHornType, type: "flat horn" }));
            const existingUnicorn = await unicornRepository.findOne(unicornBornWithSpiralHorn.id);
            expect(existingUnicorn.hornType.type).to.be.eql("spiral horn");
            expect(hornTypeUpgrade.type).to.be.eql("flat horn");

            const lastRevisionHorn = await hornRepository.findOne(hornTypeUpgrade.id);
            expect(lastRevisionHorn.type).to.be.eql(hornTypeUpgrade.type);
        });

    });

    describe("hasMany relation with complex model", () => {
        let singer, guitar1, guitar2, bass, drums;
        let firstAlbum;
        beforeEach(async () => {
            [singer, guitar1, guitar2, bass, drums] = await Promise.all([
                instrumentRepository.save(instrumentRepository.newEntity({ player: "Paul Di'Anno", instrument: "vocals" })),
                instrumentRepository.save(instrumentRepository.newEntity({ player: "Dave Murray", instrument: "guitar1" })),
                instrumentRepository.save(instrumentRepository.newEntity({ player: "Dennis Stratton", instrument: "guitar2" })),
                instrumentRepository.save(instrumentRepository.newEntity({ player: "Steve Harris", instrument: "bass" })),
                instrumentRepository.save(instrumentRepository.newEntity({ player: "Clive Burr", instrument: "drums" }))
            ]);
            firstAlbum = await albumRepository.save(albumRepository.newEntity({
                name: "Iron maiden",
                instruments: [
                    { instrument: singer }, { instrument: guitar1 }, { instrument: guitar2 }, { instrument: bass }, { instrument: drums }
                ]
            }));
        });

        it("should keep Dennis Stratton as guitarist on the first Iron maiden album", async () => {
            guitar2 = await instrumentRepository.save(instrumentRepository.newEntity({ ...guitar2, player: "Adrian Smith" }));
            const ironMaidenAlbum = await albumRepository.findOne(firstAlbum.id);
            const secondGuitaristOnAlbum = ironMaidenAlbum.instruments.find((instrument) => instrument.instrument.instrument === "guitar2");
            const nextGuitarist = await instrumentRepository.findOne(secondGuitaristOnAlbum.instrument.id);

            expect(secondGuitaristOnAlbum.instrument.player).to.be.eql("Dennis Stratton");
            expect(nextGuitarist.player).to.be.eql("Adrian Smith");
        });

        it("should remove the albumInstruments when the timeline got changed and the album doesn't exist anymore", async () => {
            const instrumentIds = firstAlbum.instruments.map(({ id }) => id);
            const instruments = await albumInstrumentRepository.findAll(instrumentIds);

            await albumRepository.remove(firstAlbum.id);
            const orphans = await albumInstrumentRepository.findAll(instrumentIds);

            expect(instruments.length).to.be.eql(5);
            expect(orphans.length).to.be.eql(0);
        });
    });

    describe("hasMany relation on simple model", () => {
        let meowCat;
        beforeEach(async () => {
            meowCat = await catRepository.save(catRepository.newEntity({ name: "meow", kittens: [{ name: "meow" }] }));
            await kittenRepository.findWhere((q) => q.where("name", "meow"));
        });

        it("if the cat changes the name it should have no impact on kittens and they should have reference to mother", async () => {
            const mauCat = await catRepository.save(catRepository.newEntity({ ...meowCat, name: "mau" }));
            expect(mauCat.kittens.length).to.be.eql(1);
        });

        it("if the cat dies the kittens should get removed too", async () => {
            const kittenIds = meowCat.kittens.map(({ id }) => id);
            const kittens = await kittenRepository.findAll(kittenIds);

            await catRepository.remove(meowCat.id);
            const orphans = await kittenRepository.findAll(kittenIds);

            expect(kittens.length).to.be.eql(1);
            expect(orphans.length).to.be.eql(0);
        });
    });

    describe("hasOne relation on simple model", () => {
        it("should remember the cats kitten", async () => {
            const cat = await sampleCatRepository.save(sampleCatRepository.newEntity({ name: "meow", kitten: { name: "meow" } }));
            await sampleKittenRepository.remove(cat.kitten.id);
            const fetchedCat = await sampleCatRepository.findOne(cat.id);
            const fetchedKitten = await sampleKittenRepository.findOne(cat.kitten.id);

            expect(fetchedCat.kitten.id).to.be.eql(cat.kitten.revisionId);
            expect(fetchedKitten).to.be.eql(null);
        });
    });

    describe("discriminator in query", () => {
        let consoleLog: (message?: any, ...optionalParams: any[]) => void, consoleStub: SinonStub;
        beforeEach(async () => {
            const savedCat = await sampleCatRepository.save(sampleCatRepository.newEntity({ name: "meow" }));
            await sampleCatRepository.save(savedCat);
            await sampleCatRepository.save(savedCat);
            await sampleCatRepository.save(savedCat);
            await sampleCatRepository.save(savedCat);
            await sampleCatRepository.save(sampleCatRepository.newEntity({ ...savedCat, name: "bark" }));
            consoleLog = console.log;
            consoleStub = sinon.stub();
            console.log = consoleStub;
        });

        afterEach(() => {
            console.log = consoleLog;
        });

        it("should test discriminator in query", async () => {
            await sampleCatRepository
                .findAllWhere((q) => q.where("name", "bark"), { discriminator: (q) => q.where("name", "bark"), debug: true });
            expect(consoleStub.firstCall.args[0]).to.contain(`select ` +
                `"datadictionary"."cat"."id", ` +
                `"datadictionary"."cat"."name", ` +
                `"datadictionary"."cat"."revision_id", ` +
                `"datadictionary"."cat"."parent_id", ` +
                `"datadictionary"."cat"."death" ` +
                `from "datadictionary"."cat" ` +
                `where "name" = ? and ` +
                `("revision_id" not in (select "parent_id" from "datadictionary"."cat" where "parent_id" is not null and ("name" = ?))`);
        });
    });

    beforeEach(setup);
    afterEach(teardown);

});

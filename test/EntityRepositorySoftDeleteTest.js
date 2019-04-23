"use strict";


describe("Entity Repository Soft Delete Test", function () {
    /* eslint max-statements: 0 */

    const chai = require("chai");
    const expect = chai.expect;

    beforeEach(require("./db/setup"));
    afterEach(require("./db/teardown"));

    const PlanetRepository = require("./db/mocks").PlanetRepository;

    const { knex } = require("./db/connection");
    const registry = require("./db/registry");
    require("./db/mappings");

    const PlanetDBMapping = registry.compile("PlanetDBMapping");
    const MoonDBMapping = registry.compile("MoonDBMapping");
    const AtmosphereDBMapping = registry.compile("AtmosphereDBMapping");
    const CompositionDBMapping = registry.compile("CompositionDBMapping");

    this.timeout(1000);
    let planetRepository, jupiter, io, europa, ganymed, kallisto;

    beforeEach(() => {
        planetRepository = new PlanetRepository();
        jupiter = planetRepository.newEntity({
            name: "Jupiter",
            atmosphere: {
                description: "Red and stormy",
                composition: { description: "80% hydrogen, 10% helium, 0.3% methane, 0.026% ammonia" }
            },
            composition: { description: "Gas Planet" }
        });

        io = jupiter.newMoons({ name: "Io", composition: { description: "Rocky, Yellow, very active vulcanism" } });
        europa = jupiter.newMoons({ name: "Europa", composition: { description: "Icemoon, Ocean under crust" } });
        ganymed = jupiter.newMoons({ name: "Ganymed", composition: { description: "Biggest, Icemoon, Magnetic Field" } });
        kallisto = jupiter.newMoons({ name: "Kallisto", composition: { description: "Icemoon, most craters in solar system" } });

        jupiter.addMoons([io, europa, ganymed, kallisto]);

        return planetRepository.save(jupiter);
    });

    describe("soft delete", () => {

        it("should not find removed entity again", () => {

            const promise = planetRepository.remove(jupiter);

            return promise.then(() => planetRepository.findAll()).then((planets) => {
                expect(planets).to.be.eql([]);
            });
        });

        it("should not find removed 'hasMany' entity again", () => {
            jupiter.removeMoons(europa);

            const promise = planetRepository.save(jupiter);

            return promise.then(() => planetRepository.findOne(jupiter.id)).then((jupiter) => {
                expect(jupiter.moons).to.have.length(3);
                expect(jupiter.moons.map(({ name }) => name).sort()).to.be.eql(["Ganymed", "Io", "Kallisto"]);
            });
        });

        it("should not find removed 'hasOne' entity again", () => {
            jupiter.atmosphere = null;

            const promise = planetRepository.save(jupiter);

            return promise.then(() => planetRepository.findOne(jupiter.id)).then((jupiter) => {
                expect(jupiter.atmosphere).to.be.equal(null);
            });
        });

        it("should not find removed 'belongsTo' entity again", () => {
            jupiter.composition = null;

            const promise = planetRepository.save(jupiter);

            return promise.then(() => planetRepository.findOne(jupiter.id)).then((jupiter) => {
                expect(jupiter.composition).to.be.equal(null);
            });
        });

        it("should keep removed entity in table", () => {

            const promise = planetRepository.remove(jupiter);

            return promise.then(() => knex.select().from(PlanetDBMapping.tableName)).then((rows) => {
                expect(rows.length).to.be.eql(1);
                expect(rows[0].is_deleted).to.be.eql(true);
            });
        });

        it("should keep removed 'hasMany' entity in table", () => {
            jupiter.removeMoons(europa);

            const promise = planetRepository.save(jupiter);

            return promise.then(() => knex.select().from(MoonDBMapping.tableName)).then((rows) => {
                expect(rows.length).to.be.eql(7);
                expect(rows.filter((r) => r.name === europa.name)[0].is_deleted).to.be.eql(true);
                expect(rows.filter((r) => r.name !== europa.name).map((r) => r.is_deleted)).to.be.eql(new Array(6).fill(false));
            });
        });

        it("should keep removed 'hasOne' entity in table", () => {
            jupiter.atmosphere = null;

            const promise = planetRepository.save(jupiter);

            return promise.then(() => knex.select().from(AtmosphereDBMapping.tableName)).then((rows) => {
                expect(rows.length).to.be.eql(1);
                expect(rows[0].is_deleted).to.be.eql(true);
            });
        });

        it("should keep removed 'belongsTo' entity in table", () => {
            const jupitersCompositionId = jupiter.composition.id;
            jupiter.composition = null;

            const promise = planetRepository.save(jupiter);

            return promise.then(() => knex.select().from(CompositionDBMapping.tableName)).then((rows) => {
                expect(rows.length).to.be.eql(11);
                expect(rows.filter((r) => r.id === jupitersCompositionId)[0].is_deleted).to.be.eql(true);
                expect(rows.filter((r) => r.id !== jupitersCompositionId).map((r) => r.is_deleted)).to.be.eql(new Array(10).fill(false));
            });
        });

    });

    describe("history", () => {

        it("should only load newest state", () => {
            jupiter.distanceToStar = 778000000;

            const promise = planetRepository.save(jupiter);

            return promise.then(() => planetRepository.findAll()).then((planets) => {
                expect(planets.length).to.be.eql(1);
                expect(planets[0].distanceToStar).to.be.eql(778000000);
            });
        });

        it("should save every modified state to db", () => {
            jupiter.distanceToStar = 778000000;

            const promise = planetRepository.save(jupiter);

            return promise.then(() => knex.select().from(PlanetDBMapping.tableName).orderBy("revision_id")).then((rows) => {
                expect(rows.length).to.be.eql(2);
                expect(rows[0].distance_to_star).to.be.eql(null);
                expect(rows[1].distance_to_star).to.be.eql(778000000);
                expect(rows[0].revision_id).to.be.eql(rows[1].parent_id);
                expect(rows[0].parent_id).to.be.eql(null);
            });
        });

        it("should return new revisionId after save", async () => {
            const oldRevisionId = jupiter.revisionId;

            const newJupiter = await planetRepository.save(jupiter);

            expect(newJupiter.revisionId).to.be.a("number");
            expect(newJupiter.revisionId).to.not.be.eql(oldRevisionId);
        });

        it("should only load newest state of 'hasMany' entity", () => {
            europa.distanceToPlanet = 670900;

            const promise = planetRepository.save(jupiter);

            return promise.then(() => planetRepository.findAll()).then((planets) => {
                expect(planets.length).to.be.eql(1);
                expect(planets[0].moons.length).to.be.eql(4);
                expect(planets[0].moons.filter((m) => m.name === europa.name).length).to.be.eql(1);
                expect(planets[0].moons.filter((m) => m.name === europa.name)[0].distanceToPlanet).to.be.eql(670900);
            });
        });

        it("should only load newest state of 'hasOne' entity", () => {
            jupiter.atmosphere.description = "Red, white and stormy";

            const promise = planetRepository.save(jupiter);

            return promise.then(() => planetRepository.findAll()).then((planets) => {
                expect(planets.length).to.be.eql(1);
                expect(planets[0].atmosphere.description).to.be.eql("Red, white and stormy");
            });
        });

        it("should only load newest state of 'belongsTo' entity", () => {
            jupiter.composition.description = "Gas giant";

            const promise = planetRepository.save(jupiter);

            return promise.then(() => planetRepository.findAll()).then((planets) => {
                expect(planets.length).to.be.eql(1);
                expect(planets[0].composition.description).to.be.eql("Gas giant");
            });
        });

        it("should save modified 'hasMany' entity in table", () => {
            europa.distanceToPlanet = 670900;

            const promise = planetRepository.save(jupiter);

            return promise.then(() => knex.select().from(MoonDBMapping.tableName).orderBy("revision_id")).then((rows) => {
                expect(rows.length).to.be.eql(8);
                expect(rows.filter((r) => r.name === europa.name)[0].distance_to_planet).to.be.eql(null);
                expect(rows.filter((r) => r.name === europa.name)[1].distance_to_planet).to.be.eql(670900);
                expect(rows.filter((r) => r.name !== europa.name).length).to.be.eql(6);
            });
        });

        it("should save modified 'hasOne' entity in table", () => {
            jupiter.atmosphere.description = "Red, white and stormy";

            const promise = planetRepository.save(jupiter);

            return promise.then(() => knex.select().from(AtmosphereDBMapping.tableName).orderBy("the_revision_id")).then((rows) => {
                expect(rows.length).to.be.eql(2);
                expect(rows[0].description).to.be.eql("Red and stormy");
                expect(rows[1].description).to.be.eql("Red, white and stormy");
            });
        });

        it("should save modified 'belongsTo' entity in table", () => {
            const jupitersCompositionId = jupiter.composition.id;
            jupiter.composition.description = "Gas giant";

            const promise = planetRepository.save(jupiter);

            return promise.then(() => knex.select().from(CompositionDBMapping.tableName).orderBy("revision_id")).then((rows) => {
                expect(rows.length).to.be.eql(12);
                expect(rows.filter((r) => r.id === jupitersCompositionId)[0].description).to.be.eql("Gas Planet");
                expect(rows.filter((r) => r.id === jupitersCompositionId)[1].description).to.be.eql("Gas giant");
            });
        });

    });

});

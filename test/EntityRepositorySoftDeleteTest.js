"use strict";


describe("Entity Repository Soft Delete Test", function () {
    // jshint maxstatements:false

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
    var planetRepository, jupiter, io, europa, ganymed, kallisto;

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

            var promise = planetRepository.remove(jupiter);

            return promise.then(() => planetRepository.findAll()).then((planets) => {
                expect(planets).to.be.eql([]);
            });
        });

        it("should not find removed 'hasMany' entity again", () => {
            jupiter.removeMoons(europa);

            var promise = planetRepository.save(jupiter);

            return promise.then(() => planetRepository.findOne(jupiter.id)).then((jupiter) => {
                expect(jupiter.moons).to.have.length(3);
                expect(jupiter.moons.map(({ name }) => name).sort()).to.be.eql(["Ganymed", "Io", "Kallisto"]);
            });
        });

        it("should not find removed 'hasOne' entity again", () => {
            jupiter.atmosphere = null;

            var promise = planetRepository.save(jupiter);

            return promise.then(() => planetRepository.findOne(jupiter.id)).then((jupiter) => {
                expect(jupiter.atmosphere).to.be.equal(null);
            });
        });

        it("should not find removed 'belongsTo' entity again", () => {
            jupiter.composition = null;

            var promise = planetRepository.save(jupiter);

            return promise.then(() => planetRepository.findOne(jupiter.id)).then((jupiter) => {
                expect(jupiter.composition).to.be.equal(null);
            });
        });

        it("should keep removed entity in table", () => {

            var promise = planetRepository.remove(jupiter);

            return promise.then(() => knex.select().from(PlanetDBMapping.tableName)).then((rows) => {
                expect(rows.length).to.be.eql(1);
                expect(rows[0].is_deleted).to.be.eql(true);
            });
        });

        it("should keep removed 'hasMany' entity in table", () => {
            jupiter.removeMoons(europa);

            var promise = planetRepository.save(jupiter);

            return promise.then(() => knex.select().from(MoonDBMapping.tableName)).then((rows) => {
                expect(rows.length).to.be.eql(4);
                expect(rows.filter((r) => r.name === europa.name)[0].is_deleted).to.be.eql(true);
                expect(rows.filter((r) => r.name !== europa.name).map((r) => r.is_deleted)).to.be.eql([false, false, false]);
            });
        });

        it("should keep removed 'hasOne' entity in table", () => {
            jupiter.atmosphere = null;

            var promise = planetRepository.save(jupiter);

            return promise.then(() => knex.select().from(AtmosphereDBMapping.tableName)).then((rows) => {
                expect(rows.length).to.be.eql(1);
                expect(rows[0].is_deleted).to.be.eql(true);
            });
        });

        it("should keep removed 'belongsTo' entity in table", () => {
            var jupidersCompositionId = jupiter.composition.id;
            jupiter.composition = null;

            var promise = planetRepository.save(jupiter);

            return promise.then(() => knex.select().from(CompositionDBMapping.tableName)).then((rows) => {
                expect(rows.length).to.be.eql(6);
                expect(rows.filter((r) => r.id === jupidersCompositionId)[0].is_deleted).to.be.eql(true);
                expect(rows.filter((r) => r.id !== jupidersCompositionId).map((r) => r.is_deleted)).to.be.eql([false, false, false, false, false]);
            });
        });

    });

});

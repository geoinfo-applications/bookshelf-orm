"use strict";

const Q = require("q");
const knex = require("./connection").knex;

/* eslint max-statements: 0 */
module.exports = function () {

    // car sample
    const car = knex.schema.createTable("datadictionary.car", (table) => {
        table.increments();
        table.string("name");
        table.string("model_name");
        table.string("serial_number");
        table.integer("owner_id");
    });

    const part = knex.schema.createTable("datadictionary.part", (table) => {
        table.increments();
        table.string("name");
        table.integer("car_id");
        table.integer("engine_id");
    });

    const wheel = knex.schema.createTable("datadictionary.wheel", (table) => {
        table.increments();
        table.integer("index");
        table.integer("part_id");
        table.integer("make_id");
    });

    const engine = knex.schema.createTable("datadictionary.engine", (table) => {
        table.increments();
        table.string("serial_number");
        table.integer("ps");
        table.integer("injection_id");
    });

    const owner = knex.schema.createTable("datadictionary.owner", (table) => {
        table.increments();
        table.string("name");
    });

    const make = knex.schema.createTable("datadictionary.make", (table) => {
        table.increments();
        table.string("name");
    });

    const parkingSpace = knex.schema.createTable("datadictionary.parking_space", (table) => {
        table.increments();
        table.string("name");
        table.integer("car_id");
    });

    const outlet = knex.schema.createTable("datadictionary.outlet", (table) => {
        table.increments();
        table.integer("engine_id");
        table.string("name");
    });

    const injection = knex.schema.createTable("datadictionary.injection", (table) => {
        table.increments();
        table.string("name");
    });

    // soft delete and history sample
    const planet = knex.schema.createTable("datadictionary.planet", (table) => {
        table.specificType("id", "serial");
        table.increments("revision_id");
        table.integer("parent_id");
        table.boolean("is_deleted").default(false);
        table.string("name");
        table.integer("distance_to_star");
        table.integer("composition_id");
    });

    const moon = knex.schema.createTable("datadictionary.moon", (table) => {
        table.specificType("id", "serial");
        table.increments("revision_id");
        table.integer("parent_id");
        table.boolean("is_deleted").default(false);
        table.integer("planet_id");
        table.integer("distance_to_planet");
        table.string("name");
        table.integer("composition_id");
    });

    const atmosphere = knex.schema.createTable("datadictionary.atmosphere", (table) => {
        table.specificType("id", "serial");
        table.increments("the_revision_id");
        table.integer("the_parent_id");
        table.boolean("is_deleted").default(false);
        table.integer("planet_id");
        table.text("description");
        table.integer("composition_id");
    });

    const composition = knex.schema.createTable("datadictionary.composition", (table) => {
        table.specificType("id", "serial");
        table.increments("revision_id");
        table.integer("parent_id");
        table.boolean("is_deleted").default(false);
        table.text("description");
    });

    const person = knex.schema.createTable("datadictionary.person", (table) => {
        table.string("name");
        table.integer("age");
        table.json("things");
    });

    const horn = knex.schema.createTable("datadictionary.horn", (table) => {
        table.specificType("id", "serial");
        table.increments("revision_id");
        table.integer("parent_id");
        table.string("type");
        table.specificType("death", "timestamp").default(null);
    });

    const unicorn = knex.schema.createTable("datadictionary.unicorn", (table) => {
        table.specificType("id", "serial");
        table.increments("revision_id");
        table.integer("parent_id");
        table.string("name");
        table.specificType("death", "timestamp").default(null);
        table.integer("horn_type_id");
    });

    const instrument = knex.schema.createTable("datadictionary.instrument", (table) => {
        table.specificType("id", "serial");
        table.increments("revision_id");
        table.integer("parent_id");
        table.string("player");
        table.string("instrument");
        table.specificType("death", "timestamp").default(null);
    });

    const album = knex.schema.createTable("datadictionary.album", (table) => {
        table.specificType("id", "serial");
        table.increments("revision_id");
        table.integer("parent_id");
        table.string("name");
        table.specificType("death", "timestamp").default(null);
    });

    const albumInstrument = knex.schema.createTable("datadictionary.album_instrument", (table) => {
        table.specificType("id", "serial");
        table.integer("album_id");
        table.integer("instrument_id");
    });


    const cat = knex.schema.createTable("datadictionary.cat", (table) => {
        table.specificType("id", "serial");
        table.increments("revision_id");
        table.integer("parent_id");
        table.string("name");
        table.specificType("death", "timestamp").default(null);
    });

    const kitten = knex.schema.createTable("datadictionary.kitten", (table) => {
        table.specificType("id", "serial");
        table.increments("revision_id");
        table.integer("cat_id");
        table.integer("parent_id");
        table.string("name");
        table.specificType("death", "timestamp").default(null);
    });

    const halfling = knex.schema.createTable("datadictionary.halfling", (table) => {
        table.uuid("id").defaultTo(knex.raw("uuid_generate_v4()")).primary();
        table.integer("height");
        table.string("name");
        table.specificType("death", "timestamp").default(null);
    });

    return Q.all([car, part, wheel, engine, owner, make, outlet, injection, parkingSpace,
        planet, moon, atmosphere, composition, person, horn, unicorn, instrument, album, albumInstrument, cat, kitten, halfling
    ]);
};



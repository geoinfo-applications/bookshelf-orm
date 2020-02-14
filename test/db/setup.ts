"use strict";

import Q from "q";
import { knex } from "./connection";

/* eslint max-statements: 0 */
export default function () {

    // car sample
    const car = knex.schema.withSchema("datadictionary").createTable("car", (table) => {
        table.increments();
        table.string("name");
        table.string("model_name");
        table.string("serial_number");
        table.integer("owner_id");
    });

    const part = knex.schema.withSchema("datadictionary").createTable("part", (table) => {
        table.increments();
        table.string("name");
        table.integer("car_id");
        table.integer("engine_id");
    });

    const wheel = knex.schema.withSchema("datadictionary").createTable("wheel", (table) => {
        table.increments();
        table.integer("index");
        table.integer("part_id");
        table.integer("make_id");
    });

    const engine = knex.schema.withSchema("datadictionary").createTable("engine", (table) => {
        table.increments();
        table.string("serial_number");
        table.integer("ps");
        table.integer("injection_id");
    });

    const owner = knex.schema.withSchema("datadictionary").createTable("owner", (table) => {
        table.increments();
        table.string("name");
    });

    const make = knex.schema.withSchema("datadictionary").createTable("make", (table) => {
        table.increments();
        table.string("name");
    });

    const parkingSpace = knex.schema.withSchema("datadictionary").createTable("parking_space", (table) => {
        table.increments();
        table.string("name");
        table.integer("car_id");
    });

    const outlet = knex.schema.withSchema("datadictionary").createTable("outlet", (table) => {
        table.increments();
        table.integer("engine_id");
        table.string("name");
    });

    const injection = knex.schema.withSchema("datadictionary").createTable("injection", (table) => {
        table.increments();
        table.string("name");
    });

    // soft delete and history sample
    const planet = knex.schema.withSchema("datadictionary").createTable("planet", (table) => {
        table.specificType("id", "serial");
        table.increments("revision_id");
        table.integer("parent_id");
        table.boolean("is_deleted").defaultTo(false);
        table.string("name");
        table.integer("distance_to_star");
        table.integer("composition_id");
    });

    const moon = knex.schema.withSchema("datadictionary").createTable("moon", (table) => {
        table.specificType("id", "serial");
        table.increments("revision_id");
        table.integer("parent_id");
        table.boolean("is_deleted").defaultTo(false);
        table.integer("planet_id");
        table.integer("distance_to_planet");
        table.string("name");
        table.integer("composition_id");
    });

    const atmosphere = knex.schema.withSchema("datadictionary").createTable("atmosphere", (table) => {
        table.specificType("id", "serial");
        table.increments("the_revision_id");
        table.integer("the_parent_id");
        table.boolean("is_deleted").defaultTo(false);
        table.integer("planet_id");
        table.text("description");
        table.integer("composition_id");
    });

    const composition = knex.schema.withSchema("datadictionary").createTable("composition", (table) => {
        table.specificType("id", "serial");
        table.increments("revision_id");
        table.integer("parent_id");
        table.boolean("is_deleted").defaultTo(false);
        table.text("description");
    });

    const person = knex.schema.withSchema("datadictionary").createTable("person", (table) => {
        table.string("name");
        table.integer("age");
        table.json("things");
    });

    const horn = knex.schema.withSchema("datadictionary").createTable("horn", (table) => {
        table.specificType("id", "serial");
        table.increments("revision_id");
        table.integer("parent_id");
        table.string("type");
        table.specificType("death", "timestamp").defaultTo(null);
    });

    const unicorn = knex.schema.withSchema("datadictionary").createTable("unicorn", (table) => {
        table.specificType("id", "serial");
        table.increments("revision_id");
        table.integer("parent_id");
        table.string("name");
        table.specificType("death", "timestamp").defaultTo(null);
        table.integer("horn_type_id");
    });

    const instrument = knex.schema.withSchema("datadictionary").createTable("instrument", (table) => {
        table.specificType("id", "serial");
        table.increments("revision_id");
        table.integer("parent_id");
        table.string("player");
        table.string("instrument");
        table.specificType("death", "timestamp").defaultTo(null);
    });

    const album = knex.schema.withSchema("datadictionary").createTable("album", (table) => {
        table.specificType("id", "serial");
        table.increments("revision_id");
        table.integer("parent_id");
        table.string("name");
        table.specificType("death", "timestamp").defaultTo(null);
    });

    const albumInstrument = knex.schema.withSchema("datadictionary").createTable("album_instrument", (table) => {
        table.specificType("id", "serial");
        table.integer("album_id");
        table.integer("instrument_id");
    });


    const cat = knex.schema.withSchema("datadictionary").createTable("cat", (table) => {
        table.specificType("id", "serial");
        table.increments("revision_id");
        table.integer("parent_id");
        table.string("name");
        table.specificType("death", "timestamp").defaultTo(null);
    });

    const kitten = knex.schema.withSchema("datadictionary").createTable("kitten", (table) => {
        table.specificType("id", "serial");
        table.increments("revision_id");
        table.integer("cat_id");
        table.integer("parent_id");
        table.string("name");
        table.specificType("death", "timestamp").defaultTo(null);
    });

    const halfling = knex.schema.withSchema("datadictionary").createTable("halfling", (table) => {
        table.uuid("id").defaultTo(knex.raw("uuid_generate_v4()")).primary();
        table.integer("height");
        table.string("name");
        table.specificType("death", "timestamp").defaultTo(null);
    });

    return Q.all([car, part, wheel, engine, owner, make, outlet, injection, parkingSpace,
        planet, moon, atmosphere, composition, person, horn, unicorn, instrument, album, albumInstrument, cat, kitten, halfling
    ]);
}

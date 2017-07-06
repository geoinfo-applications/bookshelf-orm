"use strict";

const Q = require("q");
const knex = require("./connection").knex;

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
        table.increments();
        table.boolean("is_deleted").default(false);
        table.string("name");
        table.integer("distance_to_star");
        table.integer("composition_id");
    });

    const moon = knex.schema.createTable("datadictionary.moon", (table) => {
        table.increments();
        table.boolean("is_deleted").default(false);
        table.integer("planet_id");
        table.integer("distance_to_planet");
        table.string("name");
        table.integer("composition_id");
    });

    const atmosphere = knex.schema.createTable("datadictionary.atmosphere", (table) => {
        table.increments();
        table.boolean("is_deleted").default(false);
        table.integer("planet_id");
        table.text("description");
        table.integer("composition_id");
    });

    const composition = knex.schema.createTable("datadictionary.composition", (table) => {
        table.increments();
        table.boolean("is_deleted").default(false);
        table.text("description");
    });

    return Q.all([car, part, wheel, engine, owner, outlet, injection, parkingSpace,
        planet, moon, atmosphere, composition]);
};



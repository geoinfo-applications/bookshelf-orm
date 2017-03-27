"use strict";

const Q = require("q");
const knex = require("./connection").knex;

module.exports = function () {

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

    return Q.all([car, part, wheel, engine, owner, outlet, injection, parkingSpace]);
};



"use strict";

var Q = require("q");
var knex = require("./connection").knex;

module.exports = function () {

    var car = knex.schema.createTable("datadictionary.car", function (table) {
        table.increments();
        table.string("name");
        table.string("model_name");
    });

    var part = knex.schema.createTable("datadictionary.part", function (table) {
        table.increments();
        table.string("name");
        table.integer("car_id");
        table.integer("engine_id");
    });

    var wheel = knex.schema.createTable("datadictionary.wheel", function (table) {
        table.increments();
        table.integer("index");
        table.integer("part_id");
    });

    var engine = knex.schema.createTable("datadictionary.engine", function (table) {
        table.increments();
        table.string("serial_number");
        table.integer("ps");
        table.integer("injection_id");
    });

    var owner = knex.schema.createTable("datadictionary.owner", function (table) {
        table.increments();
        table.string("name");
    });

    var outlet = knex.schema.createTable("datadictionary.outlet", function (table) {
        table.increments();
        table.integer("engine_id");
        table.string("name");
    });

    var injection = knex.schema.createTable("datadictionary.injection", function (table) {
        table.increments();
        table.string("name");
    });

    return Q.all([car, part, wheel, engine, owner, outlet, injection]);
};



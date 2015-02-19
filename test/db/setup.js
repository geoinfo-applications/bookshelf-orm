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
    });

    return Q.all([car, part, wheel, engine]);
};



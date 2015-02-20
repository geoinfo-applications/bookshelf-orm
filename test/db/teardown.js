"use strict";

var Q = require("q");
var knex = require("./connection").knex;

module.exports = function () {

    var car = knex.schema.dropTable("datadictionary.car");
    var part = knex.schema.dropTable("datadictionary.part");
    var wheel = knex.schema.dropTable("datadictionary.wheel");
    var engine = knex.schema.dropTable("datadictionary.engine");
    var owner = knex.schema.dropTable("datadictionary.owner");
    var outlet = knex.schema.dropTable("datadictionary.outlet");
    var injection = knex.schema.dropTable("datadictionary.injection");

    return Q.all([car, part, wheel, engine, owner, outlet, injection]);
};



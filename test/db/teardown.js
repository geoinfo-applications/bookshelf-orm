"use strict";

var Q = require("q");
var knex = require("./connection").knex;

module.exports = function () {
    var tables = [
        "datadictionary.car",
        "datadictionary.part",
        "datadictionary.wheel",
        "datadictionary.engine",
        "datadictionary.owner",
        "datadictionary.parking_space",
        "datadictionary.outlet",
        "datadictionary.injection"
    ];

    return Q.all(tables.map((table) => knex.schema.dropTable(table)));
};



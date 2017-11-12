"use strict";

const Q = require("q");
const knex = require("./connection").knex;

module.exports = () => {
    const tables = [
        "datadictionary.car",
        "datadictionary.part",
        "datadictionary.wheel",
        "datadictionary.engine",
        "datadictionary.owner",
        "datadictionary.make",
        "datadictionary.parking_space",
        "datadictionary.outlet",
        "datadictionary.injection",
        "datadictionary.planet",
        "datadictionary.moon",
        "datadictionary.atmosphere",
        "datadictionary.composition"
    ];

    return Q.all(tables.map((table) => knex.schema.dropTable(table)));
};



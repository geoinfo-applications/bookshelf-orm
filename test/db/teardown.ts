"use strict";

import { knex } from "./connection";


export default () => {
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
        "datadictionary.composition",
        "datadictionary.person",
        "datadictionary.horn",
        "datadictionary.unicorn",
        "datadictionary.album",
        "datadictionary.instrument",
        "datadictionary.album_instrument",
        "datadictionary.cat",
        "datadictionary.kitten",
        "datadictionary.halfling",
        "datadictionary.dungeon",
        "datadictionary.kobold"
    ];

    return Promise.all(tables.map((table) => knex.schema.dropTable(table)));
};

"use strict";

var Engine = require("./mocks").Engine;
var Part = require("./mocks").Part;
var registry = require("./registry");

registry.register("CarDBMapping", "test", {
    tableName: "datadictionary.car",
    columns: ["id", "name", "model_name"],

    relations: [
        {
            name: "parts",
            type: "hasMany",
            references: {
                type: Part,
                mapping: "PartDBMapping",
                mappedBy: "car_id"
            }
        }
    ]
});

registry.register("PartDBMapping", "test", {
    tableName: "datadictionary.part",
    columns: ["id", "name"],

    relations: [
        {
            name: "wheels",
            type: "hasMany",
            references: {
                mapping: "WheelDBMapping",
                mappedBy: "part_id"
            }
        }, {
            name: "engine",
            type: "belongsTo",
            references: {
                type: Engine,
                mapping: "EngineDBMapping",
                cascade: true
            }
        }
    ]
});

registry.register("WheelDBMapping", "test", {
    tableName: "datadictionary.wheel",
    columns: ["id", "index"]
});

registry.register("EngineDBMapping", "test", {
    tableName: "datadictionary.engine",
    columns: ["id", "serial_number", "ps"]
});

registry.register("VeyronEngineDBMapping", "test", {
    tableName: "datadictionary.engine",
    columns: ["id", "serial_number", "ps"],
    discriminator: { ps: 1000 }
});

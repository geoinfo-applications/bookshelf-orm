"use strict";

var Engine = require("./mocks").Engine;
var Part = require("./mocks").Part;
var Owner = require("./mocks").Owner;
var ParkingSpace = require("./mocks").ParkingSpace;
var registry = require("./registry");


registry.register("CarDBMapping", "test", {
    tableName: "datadictionary.car",
    columns: ["id", "name", "model_name", {
        name: "description",
        type: "sql",
        get: "lower(coalesce(name, '') || '::' || coalesce(model_name))"
    }, {
        name: "serial_number",
        type: "sql",
        get: () => "upper(serial_number)",
        set: (v) => "lower('" + v + "')"
    }],

    relations: [
        {
            name: "parts",
            type: "hasMany",
            references: {
                type: Part,
                mapping: "PartDBMapping",
                mappedBy: "car_id",
                orphanRemoval: true,
                cascade: true
            }
        }, {
            name: "owner",
            type: "belongsTo",
            references: {
                type: Owner,
                mapping: "OwnerDBMapping"
            }
        }, {
            name: "parkingSpace",
            type: "hasOne",
            references: {
                type: ParkingSpace,
                mapping: "ParkingSpaceDBMapping",
                mappedBy: "car_id",
                cascade: true
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
                mappedBy: "part_id",
                orphanRemoval: true,
                cascade: true
            }
        }, {
            name: "engine",
            type: "belongsTo",
            references: {
                type: Engine,
                mapping: "EngineDBMapping",
                orphanRemoval: true,
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
    columns: ["id", "serial_number", "ps"],

    relations: [
        {
            name: "outlets",
            type: "hasMany",
            references: {
                mapping: "OutletDBMapping",
                mappedBy: "engine_id",
                orphanRemoval: true,
                cascade: true
            }
        }, {
            name: "injection",
            type: "belongsTo",
            references: {
                mapping: "InjectionDBMapping",
                orphanRemoval: true,
                cascade: true
            }
        }
    ]
});

registry.register("VeyronEngineDBMapping", "test", {
    tableName: "datadictionary.engine",
    columns: ["id", "serial_number", "ps"],
    discriminator: { ps: 1000 }
});

registry.register("OwnerDBMapping", "test", {
    tableName: "datadictionary.owner",
    columns: ["id", "name"]
});

registry.register("NamelessOwnerDBMapping", "test", {
    tableName: "datadictionary.owner",
    columns: ["id"],
    discriminator: { name: null }
});

registry.register("ParkingSpaceDBMapping", "test", {
    tableName: "datadictionary.parking_space",
    columns: ["id", "name"]
});

registry.register("OutletDBMapping", "test", {
    tableName: "datadictionary.outlet",
    columns: ["id", "name"]
});

registry.register("InjectionDBMapping", "test", {
    tableName: "datadictionary.injection",
    columns: ["id", "name"]
});

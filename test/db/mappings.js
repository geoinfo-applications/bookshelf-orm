"use strict";

const Engine = require("./mocks").Engine;
const VeyronEngine = require("./mocks").VeyronEngine;
const Part = require("./mocks").Part;
const Owner = require("./mocks").Owner;
const ParkingSpace = require("./mocks").ParkingSpace;
const registry = require("./registry");


registry.register("CarDBMapping", "test", {
    tableName: "datadictionary.car",
    columns: ["id", "name", "model_name", {
        name: "description",
        type: "sql",
        get: "lower(coalesce(car.name, '') || '::' || coalesce(model_name))"
    }, {
        name: "serial_number",
        type: "sql",
        get: () => "upper(car.serial_number)",
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
    columns: ["id", "name",
        {
            type: "sql",
            name: "upperName",
            get: () => "upper(part.name)"
        }],

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
    columns: ["id", "index"],

    relations: [
        {
            name: "make",
            type: "belongsTo",
            references: {
                mapping: "MakeDBMapping",
                orphanRemoval: true,
                cascade: true
            }
        }
    ]

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

registry.register("MakeDBMapping", "test", {
    tableName: "datadictionary.make",
    columns: ["id", "name"]
});

registry.register("NamelessOwnerDBMapping", "test", {
    tableName: "datadictionary.owner",
    columns: ["id"],
    discriminator: { name: null }
});

registry.register("VeyronPartDBMapping", "test", {
    tableName: "datadictionary.part",
    columns: ["id"],

    relations: [{
        name: "engine",
        type: "belongsTo",
        references: {
            type: VeyronEngine,
            mapping: "VeyronEngineDBMapping"
            // TODO: removal and cascade
        }
    }]
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



registry.register("PlanetDBMapping", "test", {
    tableName: "datadictionary.planet",
    columns: ["id", "name", "distance_to_star"],

    keepHistory: true,
    onDelete: { is_deleted: true },
    discriminator: { is_deleted: false },

    relations: [{
        name: "moons",
        type: "hasMany",
        references: {
            mapping: "MoonDBMapping",
            mappedBy: "planet_id",
            cascade: true,
            orphanRemoval: true
        }
    }, {
        name: "composition",
        type: "belongsTo",
        references: {
            mapping: "CompositionDBMapping",
            cascade: true,
            orphanRemoval: true
        }
    }, {
        name: "atmosphere",
        type: "hasOne",
        references: {
            mapping: "AtmosphereDBMapping",
            mappedBy: "planet_id",
            cascade: true,
            orphanRemoval: true
        }
    }]
});

registry.register("MoonDBMapping", "test", {
    tableName: "datadictionary.moon",
    columns: ["id", "name", "distance_to_planet"],

    keepHistory: true,
    onDelete: { is_deleted: true },
    discriminator: { is_deleted: false },

    relations: [{
        name: "composition",
        type: "belongsTo",
        references: {
            mapping: "CompositionDBMapping",
            cascade: true,
            orphanRemoval: true
        }
    }]
});

registry.register("AtmosphereDBMapping", "test", {
    tableName: "datadictionary.atmosphere",
    columns: ["id", "description"],

    keepHistory: true,
    historyColumns: { revisionId: "the_revision_id", parentId: "the_parent_id" },
    onDelete: { is_deleted: true },
    discriminator: { is_deleted: false },

    relations: [{
        name: "composition",
        type: "belongsTo",
        references: {
            mapping: "CompositionDBMapping",
            cascade: true,
            orphanRemoval: true
        }
    }]
});

registry.register("CompositionDBMapping", "test", {
    tableName: "datadictionary.composition",
    columns: ["id", "description"],
    keepHistory: true,
    onDelete: { is_deleted: true },
    discriminator: { is_deleted: false }
});

registry.register("PersonDBMapping", "test", {
    tableName: "datadictionary.person",
    identifiedBy: "name",
    columns: ["name", "age"]
});

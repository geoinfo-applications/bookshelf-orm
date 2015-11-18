"use strict";

var registry = require("./registry");
var EntityRepository = require("../../orm/EntityRepository");

function createRepository(Entity, name) {
    return class extends EntityRepository{
        constructor() {
            super(Entity, registry.compile(name + "DBMapping"));
        }
    };
}


class Car {}
class Part {}
class Engine {}
class VeyronEngine {}
class Wheel {}
class Owner {}
class ParkingSpace {}


var CarRepository = createRepository(Car, "Car");
var PartRepository = createRepository(Part, "Part");
var VeyronEngineRepository = createRepository(VeyronEngine, "VeyronEngine");
var EngineRepository = createRepository(Engine, "Engine");
var WheelRepository = createRepository(Wheel, "Wheel");
var OwnerRepository = createRepository(Owner, "Owner");
var ParkingSpaceRepository = createRepository(ParkingSpace, "ParkingSpace");

module.exports = {
    Car: Car,
    Part: Part,
    Engine: Engine,
    VeyronEngine: VeyronEngine,
    Wheel: Wheel,
    Owner: Owner,
    ParkingSpace: ParkingSpace,

    CarRepository: CarRepository,
    PartRepository: PartRepository,
    EngineRepository: EngineRepository,
    VeyronEngineRepository: VeyronEngineRepository,
    WheelRepository: WheelRepository,
    OwnerRepository: OwnerRepository,
    ParkingSpaceRepository: ParkingSpaceRepository
};

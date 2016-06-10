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
class VeyronPart {}
class Engine {}
class VeyronEngine {}
class Wheel {}
class Owner {}
class NamelessOwner {}
class ParkingSpace {}


var CarRepository = createRepository(Car, "Car");
var PartRepository = createRepository(Part, "Part");
var VeyronPartRepository = createRepository(VeyronPart, "VeyronPart");
var VeyronEngineRepository = createRepository(VeyronEngine, "VeyronEngine");
var EngineRepository = createRepository(Engine, "Engine");
var WheelRepository = createRepository(Wheel, "Wheel");
var OwnerRepository = createRepository(Owner, "Owner");
var NamelessOwnerRepository = createRepository(NamelessOwner, "NamelessOwner");
var ParkingSpaceRepository = createRepository(ParkingSpace, "ParkingSpace");

module.exports = {
    Car: Car,
    Part: Part,
    VeyronPart: VeyronPart,
    Engine: Engine,
    VeyronEngine: VeyronEngine,
    Wheel: Wheel,
    Owner: Owner,
    NamelessOwner: NamelessOwner,
    ParkingSpace: ParkingSpace,

    CarRepository: CarRepository,
    PartRepository: PartRepository,
    VeyronPartRepository: VeyronPartRepository,
    EngineRepository: EngineRepository,
    VeyronEngineRepository: VeyronEngineRepository,
    WheelRepository: WheelRepository,
    OwnerRepository: OwnerRepository,
    NamelessOwnerRepository: NamelessOwnerRepository,
    ParkingSpaceRepository: ParkingSpaceRepository
};

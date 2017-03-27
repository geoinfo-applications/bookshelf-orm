"use strict";

const registry = require("./registry");
const EntityRepository = require("../../orm/EntityRepository");

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


const CarRepository = createRepository(Car, "Car");
const PartRepository = createRepository(Part, "Part");
const VeyronPartRepository = createRepository(VeyronPart, "VeyronPart");
const VeyronEngineRepository = createRepository(VeyronEngine, "VeyronEngine");
const EngineRepository = createRepository(Engine, "Engine");
const WheelRepository = createRepository(Wheel, "Wheel");
const OwnerRepository = createRepository(Owner, "Owner");
const NamelessOwnerRepository = createRepository(NamelessOwner, "NamelessOwner");
const ParkingSpaceRepository = createRepository(ParkingSpace, "ParkingSpace");

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

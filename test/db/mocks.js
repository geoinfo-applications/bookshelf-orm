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


class Planet {}
class Moon {}
class Atmosphere {}
class Composition {}

const PlanetRepository = createRepository(Planet, "Planet");
const MoonRepository = createRepository(Moon, "Moon");
const AtmosphereRepository = createRepository(Atmosphere, "Atmosphere");
const CompositionRepository = createRepository(Composition, "Composition");


class Person {}
const PersonRepository = createRepository(Person, "Person");

module.exports = {
    Car,
    Part,
    VeyronPart,
    Engine,
    VeyronEngine,
    Wheel,
    Owner,
    NamelessOwner,
    ParkingSpace,

    CarRepository,
    PartRepository,
    VeyronPartRepository,
    EngineRepository,
    VeyronEngineRepository,
    WheelRepository,
    OwnerRepository,
    NamelessOwnerRepository,
    ParkingSpaceRepository,


    Planet,
    Moon,
    Atmosphere,
    Composition,

    PlanetRepository,
    MoonRepository,
    AtmosphereRepository,
    CompositionRepository,


    Person,
    PersonRepository
};

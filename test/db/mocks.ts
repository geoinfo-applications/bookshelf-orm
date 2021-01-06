"use strict";

import registry from "./registry";
import EntityRepository from "../../orm/EntityRepository";


// tslint:disable:max-classes-per-file

interface IMockRepositoryConstructor<E> {
    new(): EntityRepository<E>;
}

function createRepository<E>(Entity, name): IMockRepositoryConstructor<E> {
    return class extends EntityRepository<E> {
        public constructor() {
            super(Entity, registry.compile(name + "DBMapping"));
        }
    };
}


class Car {
    id: number;
    name: string;
    modelName: string;
    description: string;
    serialNumber: string;

    parts: Part[];
    removeParts: (parts: Part | Part[]) => void;

    owner: Owner;
    parkingSpace: ParkingSpace;
}

class SaferCar extends Car {}

class Part {
    id: number;
    name: string;
    upperName: string;
    wheels: Wheel[];

    engine: Engine | null;
    newEngine: (engine?: Partial<Engine>) => Engine;
}

class VeyronPart {}

class Engine {
    id: number;
    ps: number;
    serialNumber: string;

    injection: IInjection;
    newInjection: (injection?: Partial<IInjection>) => IInjection;

    addOutlets: (outlet: IOutlet | IOutlet[]) => void;
    newOutlets: (outlet?: Partial<IOutlet>) => IOutlet;
}

interface IInjection {
    id: number;
    name: string;
}

interface IOutlet {
    id: number;
    name: string;
}

class VeyronEngine {}

class Wheel {}

class Owner {
    id: number;
    name: string;
}

class NamelessOwner {}

class ParkingSpace {}

const CarRepository = createRepository<Car>(Car, "Car");
const SaferCarRepository = createRepository<Car>(Car, "SaferCar");
const PartRepository = createRepository<Part>(Part, "Part");
const VeyronPartRepository = createRepository<VeyronPart>(VeyronPart, "VeyronPart");
const VeyronEngineRepository = createRepository<VeyronEngine>(VeyronEngine, "VeyronEngine");
const EngineRepository = createRepository<Engine>(Engine, "Engine");
const WheelRepository = createRepository<Wheel>(Wheel, "Wheel");
const OwnerRepository = createRepository<Owner>(Owner, "Owner");
const NamelessOwnerRepository = createRepository<NamelessOwner>(NamelessOwner, "NamelessOwner");
const ParkingSpaceRepository = createRepository<ParkingSpace>(ParkingSpace, "ParkingSpace");


class Planet {}
class Moon {}
class Atmosphere {}
class Composition {}

const PlanetRepository = createRepository<Planet>(Planet, "Planet");
const MoonRepository = createRepository<Moon>(Moon, "Moon");
const AtmosphereRepository = createRepository<Atmosphere>(Atmosphere, "Atmosphere");
const CompositionRepository = createRepository<Composition>(Composition, "Composition");


class Person {}
const PersonRepository = createRepository<Person>(Person, "Person");

class Horn {}
class Unicorn {}
const HornRepository = createRepository<Horn>(Horn, "Horn");
const UnicornRepository = createRepository<Unicorn>(Unicorn, "Unicorn");

class Instrument {}
class AlbumInstrument {}
class Album {}
const InstrumentRepository = createRepository<Instrument>(Instrument, "Instrument");
const AlbumInstrumentRepository = createRepository<Instrument>(AlbumInstrument, "AlbumInstrument");
const AlbumRepository = createRepository<Album>(Album, "Album");

class Cat {}
class Kitten {}
const CatRepository = createRepository<Cat>(Cat, "Cat");
const KittenRepository = createRepository<Kitten>(Kitten, "Kitten");
const SampleCatRepository = createRepository<Cat>(Cat, "SampleCat");
const SampleKittenRepository = createRepository<Kitten>(Kitten, "SampleKitten");

class Halfling {}
const HalflingRepository = createRepository<Halfling>(Halfling, "Halfling");


class Dungeon {}
const DungeonRepository = createRepository<Dungeon>(Dungeon, "Dungeon");

export {
    Car,
    SaferCar,
    Part,
    VeyronPart,
    Engine,
    VeyronEngine,
    Wheel,
    Owner,
    NamelessOwner,
    ParkingSpace,

    CarRepository,
    SaferCarRepository,
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
    PersonRepository,

    Horn,
    HornRepository,
    Unicorn,
    UnicornRepository,

    Instrument,
    InstrumentRepository,
    Album,
    AlbumRepository,
    AlbumInstrumentRepository,

    Cat,
    CatRepository,
    Kitten,
    KittenRepository,

    SampleCatRepository,
    SampleKittenRepository,

    Halfling,
    HalflingRepository,

    Dungeon,
    DungeonRepository
};

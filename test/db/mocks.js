"use strict";

var registry = require("./registry");
var EntityRepository = require("../../orm/EntityRepository");

function createRepository(Entity, name) {
    var constructor = function () {
        EntityRepository.call(this, Entity, registry.compile(name + "DBMapping"));
    };

    constructor.prototype = Object.create(EntityRepository.prototype);

    return constructor;
}


function Car() {}
function Part() {}
function Engine() {}
function VeyronEngine() {}
function Wheel() {}
function Owner() {}


var CarRepository = createRepository(Car, "Car");
var PartRepository = createRepository(Part, "Part");
var VeyronEngineRepository = createRepository(VeyronEngine, "VeyronEngine");
var EngineRepository = createRepository(Engine, "Engine");
var WheelRepository = createRepository(Wheel, "Wheel");
var OwnerRepository = createRepository(Owner, "Owner");

module.exports = {
    Car: Car,
    Part: Part,
    Engine: Engine,
    VeyronEngine: VeyronEngine,
    Wheel: Wheel,
    Owner: Owner,

    CarRepository: CarRepository,
    PartRepository: PartRepository,
    EngineRepository: EngineRepository,
    VeyronEngineRepository: VeyronEngineRepository,
    WheelRepository: WheelRepository,
    OwnerRepository: OwnerRepository
};

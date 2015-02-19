"use strict";

var registry = require("./registry");
var EntityRepository = require("../../orm/EntityRepository");

function Car() {}
function Part() {}
function Engine() {}
function VeyronEngine() {}


function CarRepository() {
    EntityRepository.call(this, Car, registry.compile("CarDBMapping"));
}
CarRepository.prototype = Object.create(EntityRepository.prototype);


function PartRepository() {
    EntityRepository.call(this, Part, registry.compile("PartDBMapping"));
}
PartRepository.prototype = Object.create(EntityRepository.prototype);

function VeyronEngineRepository() {
    EntityRepository.call(this, VeyronEngine, registry.compile("VeyronEngineDBMapping"));
}
VeyronEngineRepository.prototype = Object.create(EntityRepository.prototype);

function EngineRepository() {
    EntityRepository.call(this, Engine, registry.compile("EngineDBMapping"));
}
EngineRepository.prototype = Object.create(EntityRepository.prototype);

function WheelRepository() {
    EntityRepository.call(this, Engine, registry.compile("WheelDBMapping"));
}
WheelRepository.prototype = Object.create(EntityRepository.prototype);


module.exports = {
    Car: Car,
    Part: Part,
    Engine: Engine,
    VeyronEngine: VeyronEngine,

    CarRepository: CarRepository,
    PartRepository: PartRepository,
    EngineRepository: EngineRepository,
    VeyronEngineRepository: VeyronEngineRepository,
    WheelRepository: WheelRepository
};

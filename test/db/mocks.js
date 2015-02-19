"use strict";

var registry = require("./registry");
var EntityRepository = require("../../orm/EntityRepository");

function Car() {}
function Part() {}
function Engine() {}


function CarRepository() {
    EntityRepository.call(this, Car, registry.compile("CarDBMapping"));
}
CarRepository.prototype = Object.create(EntityRepository.prototype);


function PartRepository() {
    EntityRepository.call(this, Part, registry.compile("PartDBMapping"));
}
PartRepository.prototype = Object.create(EntityRepository.prototype);


module.exports = {
    Car: Car,
    Part: Part,
    Engine: Engine,
    CarRepository: CarRepository,
    PartRepository: PartRepository
};

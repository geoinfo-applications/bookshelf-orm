"use strict";

const DBMappingRegistry = require("../../orm/DBMappingRegistry");
const ModelFactory = require("../../orm/ModelFactory");

module.exports = new DBMappingRegistry(ModelFactory);

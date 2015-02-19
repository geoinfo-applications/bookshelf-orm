"use strict";

var DBMappingRegistry = require("../../orm/DBMappingRegistry");
var ModelFactory = require("../../orm/ModelFactory");

module.exports = new DBMappingRegistry(ModelFactory);

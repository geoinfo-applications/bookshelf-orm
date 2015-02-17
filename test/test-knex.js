"use strict";

var knex = require("knex");
var bookshelf = require("bookshelf");


module.exports =  bookshelf.initialize(knex({
    client: "pg"
}));

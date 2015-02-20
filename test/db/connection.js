"use strict";

var knex = require("knex")({
    client: "pg",
    connection: {
        host: process.env.TESTSERVER_HOST || "localhost",
        port: 5433,
        user: "ngp_admin",
        password: "admin_1",
        database: "test_prod_ngp_organisation",
        charset: "utf8"
    }
});

var bookshelf = require("bookshelf").initialize(knex);

require("../../orm/ModelFactory").registerContext("test", bookshelf);

module.exports = {
    bookshelf: bookshelf,
    knex: knex
};

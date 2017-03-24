"use strict";

const knex = require("knex")({
    client: "pg",
    connection: {
        host: process.env.TESTSERVER_HOST || "localhost",
        port: 5433,
        user: "ngp_admin",
        password: "admin_1",
        database: "unit_test_ngp_organisation",
        charset: "utf8"
    }
});

const bookshelf = require("bookshelf")(knex);

require("../../orm/ModelFactory").registerContext("test", bookshelf);

module.exports = {
    bookshelf: bookshelf,
    knex: knex
};

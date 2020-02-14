"use strict";

const knex = require("knex")({
    client: "pg",
    connection: {
        host: process.env.TESTSERVER_HOST || "localhost",
        port: process.env.TESTSERVER_PORT,
        user: process.env.TESTSERVER_USER,
        password: process.env.TESTSERVER_PASSWORD,
        database: process.env.TESTSERVER_DATABASE,
        charset: "utf8"
    }
});

const bookshelf = require("bookshelf")(knex);

require("../../orm/ModelFactory").registerContext("test", bookshelf);

module.exports = { bookshelf, knex };

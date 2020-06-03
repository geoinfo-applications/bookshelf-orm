"use strict";

import Knex from "knex";
import Bookshelf from "bookshelf";
import ModelFactory from "../../orm/ModelFactory";


// eslint-disable-next-line new-cap
const knex = Knex({
    client: "pg",
    connection: {
        host: process.env.TESTSERVER_HOST || "localhost",
        port: process.env.TESTSERVER_PORT ? +process.env.TESTSERVER_PORT : undefined,
        user: process.env.TESTSERVER_USER,
        password: process.env.TESTSERVER_PASSWORD,
        database: process.env.TESTSERVER_DATABASE,
        charset: "utf8"
    }
});

// eslint-disable-next-line new-cap
const bookshelf = Bookshelf(knex as any);

ModelFactory.registerContext("test", bookshelf as any);

export { bookshelf, knex };

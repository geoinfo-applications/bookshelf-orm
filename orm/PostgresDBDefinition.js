"use strict";

const knex = require("knex");
const bookshelf = require("bookshelf");
const _ = require("underscore");
const os = require("os");


class PostgresDBDefinition {

    constructor(config, ModelFactory) {
        this.config = config;
        this.ModelFactory = ModelFactory;
    }

    define() {
        Object.getOwnPropertyNames(this.config.db).forEach((name) => {

            this.ModelFactory.registerContext(name, bookshelf(knex({
                client: "pg",
                connection: _.extend({ application_name: this.applicationName }, this.config.db[name]),
                debug: this.config.debug || false,
                pool: _.extend({
                    min: 0,
                    max: 5,
                    idleTimeoutMillis: 5 * 60 * 1000,
                    reapIntervalMillis: 10 * 1000,
                    refreshIdle: false,
                    ping: (connection, callback) => connection.query("SELECT 1", callback)
                }, this.config.db[name].pool)
            })));
        });
    }

    get applicationName() {
        return `${this.config.projectName}@${os.hostname()}`;
    }

}

module.exports = PostgresDBDefinition;

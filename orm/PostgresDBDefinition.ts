"use strict";

import knex from "knex";
import bookshelf from "bookshelf";
import _ from "underscore";
import os from "os";
import { ModelFactoryStatic } from "./ModelFactory";
import IDbConnectionConfig from "./IDbConnectionConfig";


export default class PostgresDBDefinition {

    private readonly ModelFactory: ModelFactoryStatic;
    private config: IDbConnectionConfig;

    constructor(config, ModelFactory: ModelFactoryStatic) {
        this.config = config;
        this.ModelFactory = ModelFactory;
    }

    define() {
        Object.getOwnPropertyNames(this.config.db).forEach((name) => {

            this.ModelFactory.registerContext(name, bookshelf(knex({
                client: "pg",
                connection: _.extend({
                    application_name: this.applicationName // eslint-disable-line camelcase
                }, this.config.db[name]),
                debug: this.config.debug || false,
                pool: _.extend({
                    min: 0,
                    max: 5,
                    idleTimeoutMillis: 5 * 60 * 1000,
                    reapIntervalMillis: 10 * 1000
                }, this.config.db[name].pool)
            }) as any) as any);
        });
    }

    get applicationName() {
        return `${this.config.projectName}@${os.hostname()}`;
    }

}


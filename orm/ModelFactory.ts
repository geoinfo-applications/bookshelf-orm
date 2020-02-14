"use strict";

import Knex from "knex";
import Bookshelf from "bookshelf";
import BookshelfMapping from "./BookshelfMapping";


export interface ModelFactoryStatic {
    registerContext(name: string, context: { knex: Knex }): void;
    readonly context: { [prop: string]: ModelFactory };
}


export default class ModelFactory {

    public static readonly context: { [prop: string]: ModelFactory } = Object.create({});

    public static registerContext(name: string, context: { knex: Knex }) {
        ModelFactory.context[name] = new ModelFactory(context);
    }

    private readonly dbContext: Bookshelf & { knex: Knex };

    constructor(dbContext) {
        this.dbContext = dbContext;
    }

    public createModel(config) {
        return new BookshelfMapping(this.dbContext, config);
    }

    public get knex(): Knex {
        return this.dbContext.knex;
    }

    public get context(): { [prop: string]: ModelFactory } {
        return ModelFactory.context;
    }

}

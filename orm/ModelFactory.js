"use strict";

var BookshelfModel = require("./BookshelfModel");


class ModelFactory {

    constructor(dbContext) {
        this.dbContext = dbContext;
        this.knex = dbContext.knex;
    }

    createModel(config) {
        return new BookshelfModel(this.dbContext, config);
    }

}

module.exports = {
    context: {},
    registerContext: function (name, context) {
        this.context[name] = new ModelFactory(context);
    }
};

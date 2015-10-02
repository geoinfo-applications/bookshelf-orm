"use strict";

var BookshelfMapping = require("./BookshelfMapping");


class ModelFactory {

    constructor(dbContext) {
        this.dbContext = dbContext;
        this.knex = dbContext.knex;
    }

    createModel(config) {
        return new BookshelfMapping(this.dbContext, config);
    }

}

module.exports = {
    context: {},
    registerContext: function (name, context) {
        this.context[name] = new ModelFactory(context);
    }
};

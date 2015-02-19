"use strict";

describe("Model Factory Test", function () {

    var expect = require("chai").expect;
    var ModelFactory = require("../orm/ModelFactory");
    var connection = require("./db/connection");

    this.timeout(1000);

    describe("Context Registration", function () {

        it("should hold context for key", function () {
            var context = {};

            ModelFactory.registerContext("thatContext", context);
            var instance = ModelFactory.context.thatContext;

            expect(instance.dbContext).to.be.equal(context);
        });

    });

    describe("createModel", function () {
        var factory;

        beforeEach(function () {
            ModelFactory.registerContext("testContext", connection.bookshelf);
            factory = ModelFactory.context.testContext;
        });

        it("should return Model", function () {
            var mapping = factory.createModel({});

            expect("Model" in mapping).to.be.eql(true);
        });

        it("should return Collection", function () {
            var mapping = factory.createModel({});

            expect("Collection" in mapping).to.be.eql(true);
        });

        it("should return columns", function () {
            var columns = {};

            var mapping = factory.createModel({ columns: columns });

            expect(mapping.columns).to.be.eql(columns);

        });

        it("should return relations", function () {
            var relations = [];

            var mapping = factory.createModel({ relations: relations });

            expect(mapping.relations).to.be.eql(relations);
        });

        it("should initialize relations on Model", function () {
            var mapping = factory.createModel({
                relations: [{
                    name: "theName",
                    type: "hasOne",
                    references: {
                        type: {},
                        model: {},
                        mappedBy: "theName_fk_name"
                    }
                }]
            });

            var model = mapping.Model.forge();

            expect("relation_theName" in model).to.be.eql(true);
        });

        it("should throw if relation type doesn't exits", function () {
            var mapping = factory.createModel({
                relations: [{
                    name: "theName",
                    type: "someSillyType",
                    references: {
                        type: {},
                        model: {},
                        mappedBy: "theName_fk_name"
                    }
                }]
            });

            var prototype = mapping.Model.prototype;

            expect(prototype.relation_theName.bind(prototype)).to.throw(/Relation of type 'someSillyType' doesn't exist/);
        });

    });

});

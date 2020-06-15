"use strict";

import { expect } from "chai";
import ModelFactory from "../orm/ModelFactory";
import { bookshelf } from "./db/connection";


describe("Model Factory Test", () => {

    describe("Context Registration", () => {

        it("should hold context for key", () => {
            const context = {};

            ModelFactory.registerContext("thatContext", context as any);
            const instance = ModelFactory.context.thatContext;

            expect((instance as any).dbContext).to.be.equal(context);
        });

    });

    describe("createModel", () => {
        let factory;

        beforeEach(() => {
            ModelFactory.registerContext("testContext", bookshelf as any);
            factory = ModelFactory.context.testContext;
        });

        it("should return Model", () => {
            const mapping = factory.createModel({});

            expect("Model" in mapping).to.be.eql(true);
        });

        it("should return Collection", () => {
            const mapping = factory.createModel({});

            expect("Collection" in mapping).to.be.eql(true);
        });

        it("should return columns", () => {
            const columns = [];

            const mapping = factory.createModel({ columns: columns });

            expect(mapping.columns).to.be.eql(columns);

        });

        it("should return relations", () => {
            const relations = [];

            const mapping = factory.createModel({ relations: relations });

            expect(mapping.relations).to.be.eql(relations);
        });

        it("should initialize relations on Model", () => {
            const mapping = factory.createModel({
                relations: [{
                    name: "theName",
                    type: "hasOne",
                    references: {
                        type: {},
                        model: {},
                        mappedBy: "theName_fk_name",
                        mapping: {
                            qualifiedRegularColumnNames: []
                        }
                    }
                }]
            });

            const model = mapping.Model.forge();

            expect("relation_theName" in model).to.be.eql(true);
        });

        it("should throw if relation type doesn't exits", () => {
            const mapping = factory.createModel({
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

            const prototype = mapping.Model.prototype;

            expect(prototype.relation_theName.bind(prototype)).to.throw(/Relation of type 'someSillyType' doesn't exist/);
        });

    });

});

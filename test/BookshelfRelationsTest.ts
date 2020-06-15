"use strict";

import _ from "underscore";
import { expect } from "chai";
import BookshelfRelations from "../orm/BookshelfRelations";


describe("Bookshelf Relations Test", () => {
    let mapping, subMapping, subSubMapping, relations, tableName, identifiedBy;

    beforeEach(() => {
        tableName = "datadictionary";
        identifiedBy = "id";
        subSubMapping = { discriminator: {}, relations: [{ name: "subSubRelatedThing", references: { mapping: {} } }] };
        subMapping = { relations: [{ name: "subRelatedThing", references: { mapping: subSubMapping } }] };
        mapping = {
            relations: [{ name: "relatedThing", references: { mapping: subMapping } }],
            qualifiedRegularColumnNames: [],
            readableSqlColumns: [],
            tableName: tableName,
            identifiedBy: identifiedBy
        };
        relations = new BookshelfRelations(mapping);
    });

    describe("relationNames", () => {

        it("should pluck relation.names from Mapping.relations", () => {
            mapping.relations.push({ name: "relatedThing2" });

            const relationNames = relations.relationNames;

            expect(relationNames).to.be.eql(["relatedThing", "relatedThing2"]);
        });

        it("should return empty array if no relations present", () => {
            mapping.relations = [];

            const relationNames = relations.relationNames;

            expect(relationNames).to.be.eql([]);
        });

    });

    describe("relationNamesDeep", () => {

        it("should return relation names deeply in dot notation", () => {

            const relationNames = relations.relationNamesDeep;

            expect(relationNames).to.be.eql([
                "relatedThing",
                "relatedThing.subRelatedThing",
                "relatedThing.subRelatedThing.subSubRelatedThing"
            ]);
        });

    });

    describe("getFetchOptions", () => {

        it("should return prefixed relation name", () => {
            mapping.relations[0].references.mapping = {};
            const options = { exclude: ["relatedThing"] };

            const fetchOptions = relations.getFetchOptions(options);

            expect(fetchOptions.withRelated).to.be.eql([]);
        });

        it("should return prefixed deep relation name", () => {
            const options = { exclude: ["relatedThing.subRelatedThing"] };

            const fetchOptions = relations.getFetchOptions(options);

            expect(fetchOptions.withRelated.length).to.be.eql(1);
            expect(fetchOptions.withRelated[0]).to.have.keys("relation_relatedThing");
            expect(fetchOptions.withRelated[0].relation_relatedThing).to.be.a("function");
        });

        it("should return exclude descendent properties", () => {
            const options = { exclude: ["relatedThing"] };

            const fetchOptions = relations.getFetchOptions(options);

            expect(fetchOptions.withRelated).to.be.eql([]);
        });

        it("should return prefixed deep relation name without wildcarded subrelations", () => {
            const options = { exclude: ["relatedThing.*"] };

            const fetchOptions = relations.getFetchOptions(options);

            expect(fetchOptions.withRelated.length).to.be.eql(1);
            expect(fetchOptions.withRelated[0]).to.have.keys("relation_relatedThing");
            expect(fetchOptions.withRelated[0].relation_relatedThing).to.be.a("function");
        });

        it("should return no relation names if excluded is wildcard only", () => {
            const options = { exclude: ["*"] };

            const fetchOptions = relations.getFetchOptions(options);

            expect(fetchOptions.withRelated).to.be.eql([]);
        });

        it("should add columns if specified", () => {
            const primaryKey = `${tableName}.${identifiedBy}`;
            const columns = ["b", "b", "c", primaryKey];
            const options = { columns: columns };

            const fetchOptions = relations.getFetchOptions(options);

            expect(_.isEqual(fetchOptions.columns, columns)).to.be.equal(true);
        });

        it("should add transaction if specified", () => {
            const transaction = {};
            const options = { transacting: transaction };

            const fetchOptions = relations.getFetchOptions(options);

            expect(fetchOptions.transacting).to.be.equal(transaction);
        });

    });

});

"use strict";


describe("Bookshelf Relations Test", function () {
    // jshint maxstatements:false
    const _ = require("underscore");
    const expect = require("chai").expect;
    const BookshelfRelations = require("../orm/BookshelfRelations");

    var mapping, subMapping, subSubMapping, relations, tableName, identifiedBy;

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

            var relationNames = relations.relationNames;

            expect(relationNames).to.be.eql(["relatedThing", "relatedThing2"]);
        });

        it("should return empty array if no relations present", () => {
            mapping.relations = [];

            var relationNames = relations.relationNames;

            expect(relationNames).to.be.eql([]);
        });

    });

    describe("relationNamesDeep", () => {

        it("should return relation names deeply in dot notation", () => {

            var relationNames = relations.relationNamesDeep;

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
            var options = { exclude: ["relatedThing"] };

            var fetchOptions = relations.getFetchOptions(options);

            expect(fetchOptions.withRelated).to.be.eql([]);
        });

        it("should return prefixed deep relation name", () => {
            var options = { exclude: ["relatedThing.subRelatedThing"] };

            var fetchOptions = relations.getFetchOptions(options);

            expect(fetchOptions.withRelated.length).to.be.eql(1);
            expect(fetchOptions.withRelated[0]).to.have.keys("relation_relatedThing");
            expect(fetchOptions.withRelated[0].relation_relatedThing).to.be.a("function");
        });

        it("should return exclude descendent properties", () => {
            var options = { exclude: ["relatedThing"] };

            var fetchOptions = relations.getFetchOptions(options);

            expect(fetchOptions.withRelated).to.be.eql([]);
        });

        it("should return prefixed deep relation name without wildcarded subrelations", () => {
            var options = { exclude: ["relatedThing.*"] };

            var fetchOptions = relations.getFetchOptions(options);

            expect(fetchOptions.withRelated.length).to.be.eql(1);
            expect(fetchOptions.withRelated[0]).to.have.keys("relation_relatedThing");
            expect(fetchOptions.withRelated[0].relation_relatedThing).to.be.a("function");
        });

        it("should return no relation names if excluded is wildcard only", () => {
            var options = { exclude: ["*"] };

            var fetchOptions = relations.getFetchOptions(options);

            expect(fetchOptions.withRelated).to.be.eql([]);
        });

        it("should add columns if specified", () => {
            var primaryKey = `${tableName}.${identifiedBy}`;
            var columns = ["b", "b", "c", primaryKey];
            var options = { columns: columns };

            var fetchOptions = relations.getFetchOptions(options);

            expect(_.isEqual(fetchOptions.columns, columns)).to.be.equal(true);
        });

        it("should add transaction if specified", () => {
            var transaction = {};
            var options = { transacting: transaction };

            var fetchOptions = relations.getFetchOptions(options);

            expect(fetchOptions.transacting).to.be.equal(transaction);
        });

    });

});

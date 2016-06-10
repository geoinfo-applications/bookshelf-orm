"use strict";

var expect = require("chai").expect;
var BookshelfRelations = require("../orm/BookshelfRelations");
var mapping, subMapping, subSubMapping, relations;


describe("Bookshelf Relations Test", function () {

    beforeEach(function () {
        subSubMapping = { discriminator: {}, relations: [{ name: "subSubRelatedThing", references: { mapping: {} } }] };
        subMapping = { relations: [{ name: "subRelatedThing", references: { mapping: subSubMapping } }] };
        mapping = { relations: [{ name: "relatedThing", references: { mapping: subMapping } }] };
        relations = new BookshelfRelations(mapping);
    });

    describe("relationNames", function () {

        it("should pluck relation.names from Mapping.relations", function () {
            mapping.relations.push({ name: "relatedThing2" });

            var relationNames = relations.relationNames;

            expect(relationNames).to.be.eql(["relatedThing", "relatedThing2"]);
        });

        it("should return empty array if no relations present", function () {
            mapping.relations = [];

            var relationNames = relations.relationNames;

            expect(relationNames).to.be.eql([]);
        });

    });

    describe("relationNamesDeep", function () {

        it("should return relation names deeply in dot notation", function () {

            var relationNames = relations.relationNamesDeep;

            expect(relationNames).to.be.eql([
                "relatedThing",
                "relatedThing.subRelatedThing",
                "relatedThing.subRelatedThing.subSubRelatedThing"
            ]);
        });

    });

    describe("getFetchOptions", function () {

        it("should return prefixed relation name", function () {
            mapping.relations[0].references.mapping = {};
            var options = { exclude: ["relatedThing"] };

            var fetchOptions = relations.getFetchOptions(options);

            expect(fetchOptions.withRelated).to.be.eql([]);
        });

        it("should return prefixed deep relation name", function () {
            var options = { exclude: ["relatedThing.subRelatedThing"] };

            var fetchOptions = relations.getFetchOptions(options);

            expect(fetchOptions.withRelated).to.be.eql(["relation_relatedThing"]);
        });

        it("should return exclude descendent properties", function () {
            var options = { exclude: ["relatedThing"] };

            var fetchOptions = relations.getFetchOptions(options);

            expect(fetchOptions.withRelated).to.be.eql([]);
        });

        it("should return prefixed deep relation name without wildcarded subrelations", function () {
            var options = { exclude: ["relatedThing.*"] };

            var fetchOptions = relations.getFetchOptions(options);

            expect(fetchOptions.withRelated).to.be.eql(["relation_relatedThing"]);
        });

        it("should return no relation names if excluded is wildcard only", function () {
            var options = { exclude: ["*"] };

            var fetchOptions = relations.getFetchOptions(options);

            expect(fetchOptions.withRelated).to.be.eql([]);
        });

        it("should add columns if specified", function () {
            var columns = ["b", "b", "c"];
            var options = { columns: columns };

            var fetchOptions = relations.getFetchOptions(options);

            expect(fetchOptions.columns).to.be.equal(columns);
        });

        it("should add transaction if specified", function () {
            var transaction = {};
            var options = { transacting: transaction };

            var fetchOptions = relations.getFetchOptions(options);

            expect(fetchOptions.transacting).to.be.equal(transaction);
        });

    });

});

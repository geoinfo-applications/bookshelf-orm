"use strict";

describe("Bookshelf Relations Test", function () {

    var expect = require("chai").expect;
    var BookshelfRelations = require("../orm/BookshelfRelations");
    var mapping, subMapping, relations;

    beforeEach(function () {
        subMapping = { relations: [{ name: "subRelatedThing", references: { mapping: {} } }] };
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

            expect(relationNames).to.be.eql(["relatedThing", "relatedThing.subRelatedThing"]);
        });

    });

    describe("relationNamesDeepWithPrefixes", function () {

        it("should return relation names deeply in dot notation with 'relation_' prefix", function () {

            var relationNames = relations.relationNamesDeepWithPrefixes;

            expect(relationNames).to.be.eql(["relation_relatedThing", "relation_relatedThing.relation_subRelatedThing"]);
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

    });

});

//"use strict";
//
//describe("Bookshelf Repository Test", function () {
//    /*jshint maxstatements:false*/
//
//    require("./test-server");
//    var expect = require("chai").expect;
//    var TestUtils = require("./TestUtils");
//    var registry = require("../orm/mappingRegistry");
//    var CategoryRepository = require("../../../domain/datadictionary/CategoryRepository");
//    var ImportTableRepository = require("../../../domain/datadictionary/ImportTableRepository");
//    var knex = require("../orm/ModelFactory").context.organisation.knex;
//    var AttributeDBMapping = registry.compile("AttributeDBMapping");
//
//    this.timeout(1000);
//    var repository, categoryRepository, Mapping;
//
//    beforeEach(function (done) {
//        repository = new ImportTableRepository().repository;
//        categoryRepository = new CategoryRepository();
//        Mapping = repository.Mapping;
//
//        TestUtils.truncateDatabase(knex, done);
//    });
//
//    it("should be defined", function () {
//        expect(ImportTableRepository).to.be.a("function");
//    });
//
//    describe("findAll", function () {
//
//        it("should return Collection of ImportTables", function (done) {
//            repository.findAll().then(function (tables) {
//                expect(tables).to.be.instanceof(Mapping.Collection);
//                done();
//            }, done);
//        });
//
//        it("should return Collection of ImportTables with specified ids", function (done) {
//            createImportTable().then(function (model) {
//                return repository.findAll([model.id]).then(function (tables) {
//                    expect(tables.length).to.be.eql(1);
//                    expect(tables.at(0).id).to.be.eql(model.id);
//                    model.destroy();
//                    done();
//                });
//            }, done);
//        });
//
//        it("should return all ImportTables", function (done) {
//            createImportTable().then(function (model1) {
//                return createImportTable().then(function (model2) {
//                    return repository.findAll().then(function (tables) {
//                        expect(tables.length).to.be.eql(2);
//                        expect(tables.at(0).id).to.be.eql(model1.id);
//                        expect(tables.at(1).id).to.be.eql(model2.id);
//                        done();
//                    });
//                });
//            }, done);
//        });
//
//        it("should return instance with related data", function (done) {
//            createImportTable().then(function (model1) {
//                return AttributeDBMapping.Model.forge({
//                    imptable_id: model1.id,
//                    name: "",
//                    label: ""
//                }).save().then(function (attribute1) {
//                    createImportTable().then(function (model2) {
//                        return AttributeDBMapping.Model.forge({
//                            imptable_id: model2.id,
//                            name: "",
//                            label: ""
//                        }).save().then(function (attribute2) {
//                            return repository.findAll().then(function (models) {
//                                expect(models.at(0).related("relation_attributes").length).to.be.eql(1);
//                                expect(models.at(1).related("relation_attributes").length).to.be.eql(1);
//                                expect(models.at(0).related("relation_attributes").at(0).id).to.be.eql(attribute1.id);
//                                expect(models.at(1).related("relation_attributes").at(0).id).to.be.eql(attribute2.id);
//                                done();
//                            });
//                        });
//                    });
//                });
//            }, done);
//        });
//
//        it("should return empty list if no importtables exist", function (done) {
//            repository.findAll().then(function (tables) {
//                expect(tables.length).to.be.eql(0);
//                done();
//            }, done);
//        });
//
//        it("should return empty list if no importtables with given ids exist", function (done) {
//            createImportTable().then(function () {
//                return createImportTable().then(function () {
//                    return repository.findAll([-1, -2, -3]).then(function (tables) {
//                        expect(tables.length).to.be.eql(0);
//                        done();
//                    });
//                });
//            }, done);
//        });
//
//    });
//
//    describe("findOne", function () {
//
//        it("should return instance of ImportTables with specified id", function (done) {
//            createImportTable().then(function (model) {
//                return repository.findOne(model.id).then(function (fetchedModel) {
//                    expect(fetchedModel).to.be.instanceof(Mapping.Model);
//                    expect(fetchedModel.id).to.be.eql(model.id);
//                    done();
//                });
//            }, done);
//        });
//
//        it("should return instance with related data", function (done) {
//            createImportTable().then(function (model) {
//                return AttributeDBMapping.Model.forge({
//                    imptable_id: model.id,
//                    name: "",
//                    label: ""
//                }).save().then(function (attribute) {
//                    return repository.findOne(model.id).then(function (model) {
//                        expect(model.related("relation_attributes").length).to.be.eql(1);
//                        expect(model.related("relation_attributes").at(0).id).to.be.eql(attribute.id);
//                        done();
//                    });
//                });
//            }, done);
//        });
//
//        it("should return null if item with given id doesn't exist", function (done) {
//            repository.findOne(-1).then(function (fetchedModel) {
//                expect(fetchedModel).to.be.eql(null);
//                done();
//            }, done);
//        });
//
//    });
//
//    describe("discriminator", function () {
//
//        it("findAll should return items which are matched by discriminator", function (done) {
//            var categoryRepository = new CategoryRepository();
//
//            categoryRepository.findAll().then(function (categories) {
//                expect(categories.length).to.be.eql(3);
//                done();
//            });
//        });
//
//        it("findOne should return item which is matched by discriminator", function (done) {
//            var categoryRepository = new CategoryRepository();
//
//            categoryRepository.findAll().then(function (categories) {
//                return categoryRepository.findOne(categories[0].id).then(function (category) {
//                    expect(category.id).to.be.eql(categories[0].id);
//                    expect(category.label).to.be.eql(categories[0].label);
//                    expect(category.notation).to.be.eql(categories[0].notation);
//                    expect(category.kennzahl).to.be.eql(categories[0].kennzahl);
//                    done();
//                });
//            }).catch(done);
//        });
//
//    });
//
//    var tableIndex = 0;
//
//    function createImportTable() {
//        return Mapping.Model.forge({
//            name: "table" + tableIndex++,
//            label: ""
//        }).save();
//    }
//
//    afterEach(TestUtils.truncateDatabase.bind(null, knex));
//
//});

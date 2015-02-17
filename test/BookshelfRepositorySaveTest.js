//"use strict";
//
//describe("Bookshelf Repository Save Test", function () {
//    /*jshint maxstatements:false*/
//
//    require("./test-server");
//    var expect = require("chai").expect;
//    var TestUtils = require("./TestUtils");
//    var fail = require("./TestUtils").fail;
//    var registry = require("../orm/mappingRegistry");
//    var CategoryRepository = require("../../../domain/datadictionary/CategoryRepository");
//    var DocumentRepository = require("../../../domain/data/DocumentRepository");
//    var ImportTableRepository = require("../../../domain/datadictionary/ImportTableRepository");
//    var LayerRepository = require("../../../domain/datadictionary/LayerRepository");
//    var knex = require("../orm/ModelFactory").context.organisation.knex;
//    var AttributeDBMapping = registry.compile("AttributeDBMapping");
//    var Q = require("q");
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
//    it("should persist item", function (done) {
//        var item = Mapping.Model.forge({ name: "", label: "" });
//
//        repository.save(item).then(function () {
//            repository.findOne(item.id).then(function (fetchedItem) {
//                expect(item.id).to.be.eql(fetchedItem.id);
//                done();
//            });
//        }, done);
//    });
//
//    it("should persist array of item", function (done) {
//        var item1 = Mapping.Model.forge({ name: "item1", label: "" });
//        var item2 = Mapping.Model.forge({ name: "item2", label: "" });
//
//        repository.save([item1, item2]).then(function () {
//            repository.findAll([item1.id, item2.id]).then(function (items) {
//                expect(item1.id).to.be.eql(items.at(0).id);
//                expect(item2.id).to.be.eql(items.at(1).id);
//                done();
//            });
//        }, done);
//    });
//
//    it("should persist Collection of item", function (done) {
//        var item1 = Mapping.Model.forge({ name: "item1", label: "" });
//        var item2 = Mapping.Model.forge({ name: "item2", label: "" });
//        var collection = Mapping.Collection.forge([item1, item2]);
//
//        repository.save(collection).then(function () {
//            repository.findAll([item1.id, item2.id]).then(function (items) {
//                expect(item1.id).to.be.eql(items.at(0).id);
//                expect(item2.id).to.be.eql(items.at(1).id);
//                done();
//            });
//        }, done);
//    });
//
//    it("should persist related items", function (done) {
//        createImportTable().then(function (item) {
//            var attribute = AttributeDBMapping.Model.forge({
//                imptable_id: item.id,
//                name: "name" + Date.now(),
//                label: "lbl" + Date.now()
//            });
//            item.relations.relation_attributes = AttributeDBMapping.Collection.forge(attribute);
//
//            return repository.save(item).then(function (item) {
//
//                return AttributeDBMapping.Collection.forge().fetch().then(function (attrs) {
//                    expect(attrs.length).to.be.eql(1);
//                    expect(attrs.at(0).get("imptable_id")).to.be.eql(item.id);
//                    expect(attrs.at(0).get("name")).to.be.eql(attribute.get("name"));
//                    expect(attrs.at(0).get("label")).to.be.eql(attribute.get("label"));
//                    done();
//                });
//
//            });
//        }, done);
//    });
//
//    it("should not persist related items if cascade is false in n:1 relation", function (done) {
//        categoryRepository.findOne(1).then(function (category) {
//            category.item.save = fail(done);
//
//            var repository = new LayerRepository({ createLayer: Q }, { createLayer: Q }, { notify: Q });
//            var layer = repository.newEntity({ name: "name" + Date.now(), label: "" });
//            layer.category = category;
//
//            return repository.save(layer).then(function () {
//                return repository.findAll().then(function (layers) {
//                    expect(layers.length).to.be.eql(1);
//                    expect(layers[0].name).to.be.eql(layer.name);
//                    done();
//                });
//            });
//        }).catch(done);
//    });
//
//    // TODO: Related Objects do not have to be saved, but key does
//    it.skip("should not persist related items if cascade is false in 1:n relation", function (done) {
//        var repository = new LayerRepository({ createLayer: Q });
//        var layer = repository.newEntity({ name: "name" + Date.now(), label: "" });
//        var importTable = layer.newImportTables({ name: "name" + Date.now(), label: "" });
//        layer.addImportTables(importTable);
//
//        importTable.item.save = fail(done);
//
//        repository.save(layer).then(function () {
//            return repository.findAll().then(function (layers) {
//                expect(layers.length).to.be.eql(1);
//                expect(layers[0].name).to.be.eql(layer.name);
//                expect(layers[0].importTables.length).to.be.eql(0);
//                done();
//            });
//        }).catch(done);
//    });
//
//    it("should persist related items where root is new", function (done) {
//        var item = Mapping.Model.forge({
//            name: "itname" + Date.now(),
//            label: "itlbl" + Date.now()
//        });
//        var attribute = AttributeDBMapping.Model.forge({
//            name: "aname" + Date.now(),
//            label: "albl" + Date.now()
//        });
//        item.relations.relation_attributes = AttributeDBMapping.Collection.forge(attribute);
//
//        return repository.save(item).then(function (item) {
//            return repository.findOne(item.id).then(function (fetchedItem) {
//                expect(fetchedItem.get("name")).to.be.eql(item.get("name"));
//                expect(fetchedItem.get("label")).to.be.eql(item.get("label"));
//
//                var attrs = fetchedItem.relations.relation_attributes;
//                expect(attrs.length).to.be.eql(1);
//                expect(attrs.at(0).get("imptable_id")).to.be.eql(item.id);
//                expect(attrs.at(0).get("name")).to.be.eql(attribute.get("name"));
//                expect(attrs.at(0).get("label")).to.be.eql(attribute.get("label"));
//                done();
//            });
//        }, done);
//    });
//
//    it("should persist related items where foreign key is on item", function (done) {
//        var repository = new DocumentRepository();
//        var document = repository.newEntity({
//            description: "description" + Date.now()
//        });
//        var file = document.newFile({
//            name: "name" + Date.now()
//        });
//        document.file = file;
//
//        repository.save(document).then(function () {
//            return repository.findAll().then(function (documents) {
//                expect(documents.length).to.be.eql(1);
//                expect(documents[0].description).to.be.eql(document.description);
//                expect(documents[0].file.name).to.be.eql(file.name);
//                done();
//            });
//        }).catch(done);
//    });
//
//    it("should throw if related value is not saveable", function (done) {
//            createImportTable().then(function (item) {
//                item.relations.relation_attributes = {};
//
//                return repository.save(item).then(fail(done)).catch(function (error) {
//                    expect(error.message).to.match(/can not be saved/);
//                    done();
//                });
//            }).catch(done);
//        });
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

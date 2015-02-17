//"use strict";
//
//describe("Bookshelf Repository Remove Test", function () {
//    /*jshint maxstatements:false*/
//
//    require("./test-server");
//    var chai = require("chai");
//    var expect = chai.expect;
//    var sinon = require("sinon");
//    var sinonChai = require("sinon-chai");
//    chai.use(sinonChai);
//
//    var TestUtils = require("./TestUtils");
//    var registry = require("../orm/mappingRegistry");
//    var CategoryRepository = require("../../../domain/datadictionary/CategoryRepository");
//    var ImportTableRepository = require("../../../domain/datadictionary/ImportTableRepository");
//    var LayerRepository = require("../../../domain/datadictionary/LayerRepository");
//    var MapRepository = require("../../../domain/datadictionary/MapRepository");
//    var knex = require("../orm/ModelFactory").context.organisation.knex;
//    var AttributeDBMapping = registry.compile("AttributeDBMapping");
//    var StyleDBMapping = registry.compile("StyleDBMapping");
//    var StyleRuleDBMapping = registry.compile("StyleRuleDBMapping");
//    var Q = require("q");
//
//    this.timeout(10000);
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
//    it("should drop item", function (done) {
//        createImportTable().then(function (item) {
//            return repository.remove(item).then(function () {
//                return repository.findAll().then(function (items) {
//                    expect(items.length).to.be.eql(0);
//                    done();
//                });
//            });
//        });
//    });
//
//    it("should drop item specified by id", function (done) {
//        createImportTable().then(function (item) {
//            return repository.remove(item.id).then(function () {
//                return repository.findAll().then(function (items) {
//                    expect(items.length).to.be.eql(0);
//                    done();
//                });
//            });
//        });
//    });
//
//    it("should drop array of item", function (done) {
//        var item1 = Mapping.Model.forge({ name: "item1", label: "" });
//        var item2 = Mapping.Model.forge({ name: "item2", label: "" });
//
//        repository.save([item1, item2]).then(function () {
//            return repository.remove([item1, item2]).then(function () {
//                return repository.findAll().then(function (items) {
//                    expect(items.length).to.be.eql(0);
//                    done();
//                });
//            });
//        }, done);
//    });
//
//    it("should drop array of items specified by id", function (done) {
//        var item1 = Mapping.Model.forge({ name: "item1", label: "" });
//        var item2 = Mapping.Model.forge({ name: "item2", label: "" });
//
//        repository.save([item1, item2]).then(function () {
//            return repository.remove([item1.id, item2.id]).then(function () {
//                return repository.findAll().then(function (items) {
//                    expect(items.length).to.be.eql(0);
//                    done();
//                });
//            });
//        }, done);
//    });
//
//    it("should drop Collection of item", function (done) {
//        var item1 = Mapping.Model.forge({ name: "item1", label: "" });
//        var item2 = Mapping.Model.forge({ name: "item2", label: "" });
//        var collection = Mapping.Collection.forge([item1, item2]);
//
//        repository.save(collection).then(function () {
//            return repository.remove(collection).then(function () {
//                return repository.findAll().then(function (items) {
//                    expect(items.length).to.be.eql(0);
//                    done();
//                });
//            });
//        }, done);
//    });
//
//    it("should drop related items if cascade is set", function () {
//        return createImportTable().then(function (item) {
//            var attribute = AttributeDBMapping.Model.forge({
//                imptable_id: item.id,
//                name: "name" + Date.now(),
//                label: "lbl" + Date.now()
//            });
//            item.relations.relation_attributes = AttributeDBMapping.Collection.forge(attribute);
//
//            return repository.save(item).then(function () {
//                return repository.findOne(item.id).then(function (item) {
//                    return repository.remove(item).then(function () {
//                        return AttributeDBMapping.Collection.forge().fetch().then(function (attrs) {
//                            expect(attrs.length).to.be.eql(0);
//                        });
//                    });
//                });
//            });
//        });
//    });
//
//    it("should cascade drop deeply", function () {
//        var categoryRepository = new CategoryRepository();
//        var layerRepository = new LayerRepository({ createLayer: Q, removeLayer: Q }, {}, { notify: Q });
//        var layer = layerRepository.newEntity({ name: "", label: "" });
//        var style = layer.style = layer.newStyle();
//        style.addRules(style.newRules());
//
//        return categoryRepository.findOne(1).then(function (category) {
//            layer.category = category;
//
//            return layerRepository.save(layer).then(function (layer) {
//                return layerRepository.remove(layer).then(function () {
//                    return StyleRuleDBMapping.Collection.forge().fetch().then(function (styleRules) {
//                        return layerRepository.findAll().then(function (layers) {
//                            expect(styleRules.length).to.be.eql(0);
//                            expect(layers.length).to.be.eql(0);
//                        });
//                    });
//                });
//            });
//        });
//    });
//
//    it("should not drop non-cascaded entities", function () {
//        var importTableRepository = new ImportTableRepository();
//        var importTable = importTableRepository.newEntity({ name: "", label: "" });
//        var categoryRepository = new CategoryRepository();
//        var layerRepository = new LayerRepository({ createLayer: Q, removeLayer: Q }, {}, { notify: Q });
//        var layer = layerRepository.newEntity({ name: "", label: "" });
//
//        return importTableRepository.save(importTable).then(function () {
//            layer.addImportTables(importTable);
//            return categoryRepository.findOne(1).then(function (category) {
//                layer.category = category;
//                return layerRepository.save(layer).then(function (layer) {
//                    return layerRepository.remove(layer).then(function () {
//                        return importTableRepository.findAll().then(function (importTables) {
//                            expect(importTables.length).to.be.eql(1);
//                        });
//                    });
//                });
//            });
//        });
//    });
//
//    describe("orphanRemoval", function () {
//
//        it("should remove orphans if orphanRemoval = true in n:1 relations", function () {
//            return createImportTable().then(function (item) {
//                var attribute = AttributeDBMapping.Model.forge({
//                    imptable_id: item.id,
//                    name: "name" + Date.now(),
//                    label: "lbl" + Date.now()
//                });
//                item.relations.relation_attributes = AttributeDBMapping.Collection.forge(attribute);
//
//                return repository.save(item).then(function (item) {
//                    item.relations.relation_attributes.models = [];
//                    return repository.save(item).then(function () {
//                        return AttributeDBMapping.Collection.forge().fetch().then(function (attributes) {
//                            expect(attributes.length).to.be.eql(0);
//                        });
//                    });
//                });
//            });
//        });
//
//        it("should not remove still attached relations in n:1 relations", function () {
//            return createImportTable().then(function (item) {
//                var attribute = AttributeDBMapping.Model.forge({
//                    imptable_id: item.id,
//                    name: "name" + Date.now(),
//                    label: "lbl" + Date.now()
//                });
//                item.relations.relation_attributes = AttributeDBMapping.Collection.forge(attribute);
//
//                return repository.save(item).then(function (item) {
//                    return repository.save(item).then(function () {
//                        return AttributeDBMapping.Collection.forge().fetch().then(function (attributes) {
//                            expect(attributes.length).to.be.eql(1);
//                        });
//                    });
//                });
//            });
//        });
//
//        it("should remove orphans if orphanRemoval = true in 1:n relations", function () {
//            var messageBus = { notify: sinon.stub().returns(), listen: sinon.stub().returns() };
//            var mapRepository = new MapRepository({}, {}, messageBus);
//            var layerRepository = new LayerRepository({ createFlatTable: sinon.stub().returns(Q.when()) }, {}, messageBus);
//
//            var layer = layerRepository.newEntity({ name: "", label: "" });
//            return layerRepository.save(layer).then(function () {
//                var map = mapRepository.newEntity({ label: "" });
//                var layerLink = map.newLayerLinks();
//                map.addLayerLinks(layerLink);
//                layerLink.style = layerLink.newStyle();
//                layerLink.layer = layer;
//
//                return mapRepository.save(map).then(function (map) {
//                    layerLink.style = null;
//
//                    return mapRepository.save(map).then(function () {
//                        return StyleDBMapping.Collection.forge().fetch().then(function (styles) {
//                            expect(styles.length).to.be.eql(0);
//                        });
//                    });
//                });
//            });
//        });
//
//        it("should not remove still attached relations in 1:n relations", function () {
//            var messageBus = { notify: sinon.stub().returns(), listen: sinon.stub().returns() };
//            var mapRepository = new MapRepository({}, {}, messageBus);
//            var layerRepository = new LayerRepository({ createFlatTable: sinon.stub().returns(Q.when()) }, {}, messageBus);
//
//            var layer = layerRepository.newEntity({ name: "", label: "" });
//            return layerRepository.save(layer).then(function () {
//                var map = mapRepository.newEntity({ label: "" });
//                var layerLink = map.newLayerLinks();
//                map.addLayerLinks(layerLink);
//                layerLink.style = layerLink.newStyle();
//                layerLink.layer = layer;
//
//                return mapRepository.save(map).then(function (map) {
//                    return mapRepository.save(map).then(function () {
//                        return StyleDBMapping.Collection.forge().fetch().then(function (styles) {
//                            expect(styles.length).to.be.eql(1);
//                        });
//                    });
//                });
//            });
//        });
//
//        it("should remove orphans deeply if orphanRemoval = true in 1:n relations", function () {
//            var messageBus = { notify: sinon.stub().returns(), listen: sinon.stub().returns() };
//            var mapRepository = new MapRepository({}, {}, messageBus);
//            var layerRepository = new LayerRepository({ createFlatTable: sinon.stub().returns(Q.when()) }, {}, messageBus);
//
//            var layer = layerRepository.newEntity({ name: "", label: "" });
//            return layerRepository.save(layer).then(function () {
//                var map = mapRepository.newEntity({ label: "" });
//                var layerLink = map.newLayerLinks();
//                map.addLayerLinks(layerLink);
//                layerLink.style = layerLink.newStyle();
//                layerLink.layer = layer;
//                layerLink.style.addRules(layerLink.style.newRules());
//
//                return mapRepository.save(map).then(function (map) {
//                    layerLink.style = null;
//
//                    return mapRepository.save(map).then(function () {
//                        return StyleDBMapping.Collection.forge().fetch().then(function (styles) {
//                            expect(styles.length).to.be.eql(0);
//                        });
//                    });
//                });
//            });
//        });
//
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

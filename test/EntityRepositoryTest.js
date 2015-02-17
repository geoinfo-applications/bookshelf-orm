//"use strict";
//
//describe("Entity Repository Test", function () {
//    /*jshint maxstatements:false*/
//
//    require("./test-server");
//    var expect = require("chai").expect;
//    var TestUtils = require("./TestUtils");
//    var EntityClass = require("../../../domain/datadictionary/ImportTable");
//    var CategoryRepository = require("../../../domain/datadictionary/CategoryRepository");
//    var ImportTableRepository = require("../../../domain/datadictionary/ImportTableRepository");
//    var LayerRepository = require("../../../domain/datadictionary/LayerRepository");
//    var registry = require("../orm/mappingRegistry");
//    var knex = require("../orm/ModelFactory").context.organisation.knex;
//    var ImportTableDBMapping = registry.compile("ImportTableDBMapping");
//    var Q = require("q");
//
//    this.timeout(1000);
//    var repository, categoryRepository, layerCategory, layerService = { createLayer: Q };
//
//    beforeEach(function (done) {
//        repository = new ImportTableRepository();
//        categoryRepository = new CategoryRepository();
//
//        categoryRepository.findOne(1).then(function (category) {
//            layerCategory = category;
//            TestUtils.truncateDatabase(knex, done);
//        }).catch(done);
//    });
//
//    it("should be defined", function () {
//        expect(ImportTableRepository).to.be.a("function");
//    });
//
//    describe("findAll", function () {
//
//        it("should return array of ImportTables with specified ids", function (done) {
//            repository.save(createImportTable()).then(function (model) {
//                return repository.findAll([model.id]).then(function (tables) {
//                    expect(tables.length).to.be.eql(1);
//                    expect(tables[0].id).to.be.eql(model.id);
//                    done();
//                });
//            }, done);
//        });
//
//        it("should return all ImportTables", function (done) {
//            repository.save(createImportTable()).then(function (model1) {
//                return repository.save(createImportTable()).then(function (model2) {
//                    return repository.findAll().then(function (tables) {
//                        expect(tables.length).to.be.eql(2);
//                        expect(tables[0].id).to.be.eql(model1.id);
//                        expect(tables[1].id).to.be.eql(model2.id);
//                        done();
//                    });
//                });
//            }, done);
//        });
//
//        it("should not include excluded relations", function () {
//            var options = { exclude: ["attributes"] };
//            var importTable = repository.newEntity({ name: "", label: "" });
//            importTable.addAttributes(importTable.newAttributes({ name: "", label: "" }));
//            var promise = repository.save(importTable);
//
//            promise = promise.then(function () {
//                return repository.findAll(options);
//            });
//
//            return promise.then(function (importTables) {
//                expect(importTables[0].attributes.length).to.be.eql(0);
//            });
//        });
//
//        it("should not include excluded relations", function () {
//            var options = { exclude: ["attributes"] };
//            var importTable = repository.newEntity({ name: "", label: "" });
//            importTable.addAttributes(importTable.newAttributes({ name: "", label: "" }));
//            var promise = repository.save(importTable);
//
//            promise = promise.then(function (importTable) {
//                return repository.findAll([importTable.id], options);
//            });
//
//            return promise.then(function (importTables) {
//                expect(importTables[0].attributes.length).to.be.eql(0);
//            });
//        });
//
//    });
//
//    describe("findOne", function () {
//
//        it("should return instance of EntityClass with specified id", function (done) {
//            repository.save(createImportTable()).then(function (model) {
//                return repository.findOne(model.id).then(function (fetchedModel) {
//                    expect(fetchedModel).to.be.instanceof(EntityClass);
//                    expect(fetchedModel.id).to.be.eql(model.id);
//                    done();
//                });
//            }, done);
//        });
//
//        it("should fetch relations deeply", function (done) {
//            var layerRepository = new LayerRepository(layerService, {}, { notify: Q });
//            var importTable = repository.newEntity();
//            var attribute = importTable.newAttributes();
//
//            importTable.name = "tablename";
//            importTable.label = "tablelabel";
//            importTable.addAttributes(attribute);
//            attribute.name = "attributename";
//            attribute.label = "attributelabel";
//
//            repository.save(importTable).then(function (importTable) {
//
//                var layer = layerRepository.newEntity();
//                layer.name = "layername";
//                layer.label = "layerlabel";
//                layer.category = layerCategory;
//                layer.addImportTables(importTable);
//
//                return layerRepository.save(layer).then(function (layer) {
//                    return layerRepository.findOne(layer.id).then(function (layer) {
//                        expect("importTables" in layer);
//                        expect(layer.importTables.length).to.be.eql(1);
//                        expect("attributes" in layer.importTables[0]);
//                        expect(layer.importTables[0].attributes.length).to.be.eql(1);
//                        done();
//                    });
//                });
//            }).catch(done);
//        });
//
//        it("should not include excluded relations", function () {
//            var options = { exclude: ["attributes"] };
//            var importTable = repository.newEntity({ name: "", label: "" });
//            importTable.addAttributes(importTable.newAttributes({ name: "", label: "" }));
//            var promise = repository.save(importTable);
//
//            promise = promise.then(function (importTable) {
//                return repository.findOne(importTable.id, options);
//            });
//
//            return promise.then(function (importTable) {
//                expect(importTable.attributes.length).to.be.eql(0);
//            });
//        });
//
//    });
//
//    describe("save", function () {
//
//        it("should return EntityClass", function (done) {
//            var item = createImportTable();
//
//            repository.save(item).then(function (saved) {
//                expect(saved).to.be.instanceof(EntityClass);
//                done();
//            }, done);
//        });
//
//        it("should return array of EntityClass", function (done) {
//            var item1 = createImportTable();
//            var item2 = createImportTable();
//
//            repository.save([item1, item2]).then(function (saved) {
//                expect(saved).to.be.an("array");
//                expect(saved.length).to.eql(2);
//                expect(saved[0]).to.be.instanceof(EntityClass);
//                expect(saved[1]).to.be.instanceof(EntityClass);
//                done();
//            }, done);
//        });
//
//        it("should persist item", function (done) {
//            var item = createImportTable();
//
//            repository.save(item).then(function (item) {
//                return repository.findOne(item.id).then(function (fetchedItem) {
//                    expect(item.id).to.be.eql(fetchedItem.id);
//                    done();
//                });
//            }, done);
//        });
//
//        it("should persist array of item", function (done) {
//            var item1 = createImportTable();
//            var item2 = createImportTable();
//
//            repository.save([item1, item2]).then(function (savedItems) {
//                repository.findAll([savedItems[0].id, savedItems[1].id]).then(function (items) {
//                    expect(savedItems[0].id).to.be.eql(items[0].id);
//                    expect(savedItems[1].id).to.be.eql(items[1].id);
//                    done();
//                });
//            }, done);
//        });
//
//        it("should persist related items", function (done) {
//            var item = createImportTable();
//
//            repository.save(item).then(function (item) {
//                var attribute = item.newAttributes({
//                    name: "attrname" + Date.now(),
//                    label: "attrlabel" + Date.now()
//                });
//                item.addAttributes(attribute);
//
//                return repository.save(item).then(function (item) {
//                    return repository.findOne(item.id).then(function (fetchedItem) {
//                        expect(fetchedItem.id).to.be.eql(item.id);
//                        expect(fetchedItem.attributes.length).to.be.eql(1);
//                        expect(fetchedItem.attributes[0].name).to.be.eql(attribute.name);
//                        expect(fetchedItem.attributes[0].label).to.be.eql(attribute.label);
//                        done();
//                    });
//                });
//            }, done);
//        });
//
//        it("should persist related items where root is new", function (done) {
//            var item = createImportTable();
//
//            var attribute = item.newAttributes({
//                name: "attrname" + Date.now(),
//                label: "attrlabel" + Date.now()
//            });
//            item.addAttributes(attribute);
//
//            return repository.save(item).then(function (item) {
//                return repository.findOne(item.id).then(function (fetchedItem) {
//                    expect(fetchedItem.id).to.be.eql(item.id);
//                    expect(fetchedItem.attributes.length).to.be.eql(1);
//                    expect(fetchedItem.attributes[0].name).to.be.eql(attribute.name);
//                    expect(fetchedItem.attributes[0].label).to.be.eql(attribute.label);
//                    done();
//                });
//            }, done);
//        });
//
//        it("should save relations deeply", function (done) {
//            var layerRepository = new LayerRepository(layerService, {}, { notify: Q });
//            var layer = layerRepository.newEntity();
//            var importTable = repository.newEntity();
//            var attribute = importTable.newAttributes();
//
//            layer.name = "layername";
//            layer.label = "layerlabel";
//            layer.category = layerCategory;
//            layer.addImportTables(importTable);
//            importTable.name = "tablename";
//            importTable.label = "tablelabel";
//            importTable.addAttributes(attribute);
//            attribute.name = "attributename" + Date.now();
//            attribute.label = "attributelabel";
//
//
//            layerRepository.save(layer).then(function () {
//                return repository.findOne(importTable.id).then(function (importTable) {
//                    expect(importTable.attributes.length).to.be.eql(1);
//                    expect(importTable.attributes[0].name).to.be.eql(attribute.name);
//                    done();
//                });
//            }, done);
//        });
//
//    });
//
//    describe("remove", function () {
//
//        it("should drop item", function (done) {
//            repository.save(createImportTable()).then(function (item) {
//                return repository.remove(item).then(function () {
//                    return repository.findAll().then(function (items) {
//                        expect(items.length).to.be.eql(0);
//                        done();
//                    });
//                });
//            });
//        });
//
//        it("should drop item specified by id", function (done) {
//            repository.save(createImportTable()).then(function (item) {
//                return repository.remove(item.id).then(function () {
//                    return repository.findAll().then(function (items) {
//                        expect(items.length).to.be.eql(0);
//                        done();
//                    });
//                });
//            });
//        });
//
//        it("should drop array of item", function (done) {
//            var item1 = createImportTable();
//            var item2 = createImportTable();
//
//            repository.save([item1, item2]).then(function (items) {
//                return repository.remove(items).then(function () {
//                    return repository.findAll().then(function (items) {
//                        expect(items.length).to.be.eql(0);
//                        done();
//                    });
//                });
//            }, done);
//        });
//
//        it("should drop array of items specified by id", function (done) {
//            var item1 = createImportTable();
//            var item2 = createImportTable();
//
//            repository.save([item1, item2]).then(function (items) {
//                return repository.remove([items[0].id, items[1].id]).then(function () {
//                    return repository.findAll().then(function (items) {
//                        expect(items.length).to.be.eql(0);
//                        done();
//                    });
//                });
//            }, done);
//        });
//
//    });
//
//    describe("wrap", function () {
//
//        it("should wrap Model in EntityClass", function () {
//            var item = ImportTableDBMapping.Model.forge({ name: "", label: "", srid: 1 });
//
//            var entity = repository.wrap(item);
//
//            expect(entity).to.be.instanceof(EntityClass);
//        });
//
//    });
//
//    describe("unwrap", function () {
//
//        it("should return Model for EntityClass", function () {
//            var item = ImportTableDBMapping.Model.forge({ name: "", label: "", srid: 1 });
//            var entity = repository.wrap(item);
//
//            var unwrappedItem = repository.unwrap(entity);
//
//            expect(item).to.be.equal(unwrappedItem);
//        });
//
//    });
//
//    describe("newEntity", function () {
//
//        it("should return new Entity", function () {
//            var entity = repository.newEntity();
//
//            expect(entity).to.be.instanceof(EntityClass);
//        });
//
//        it("should return wrapped and initialized Entity", function () {
//            var entity = repository.newEntity();
//
//            var model = repository.unwrap(entity);
//            model.set("name", "name " + Date.now());
//
//            expect(entity.name).to.be.eql(model.get("name"));
//        });
//
//        it("should call constructor with given arguments", function () {
//            var args = [{}, "a", 0];
//            repository.Entity = function () {
//                expect(args).to.be.eql([].slice.call(arguments));
//            };
//
//            repository.newEntity.apply(repository, args);
//        });
//
//        it("should call constructor after initialization", function () {
//            repository.Entity = function () {
//                expect(this.item).to.be.instanceof(ImportTableDBMapping.Model);
//                expect("name" in this).to.be.eql(true);
//            };
//
//            repository.newEntity.apply(repository);
//        });
//
//        it("should call model.forge with given argument", function () {
//            var forgeArgument = {
//                name: "thename" + Date.now(),
//                label: "theLabel" + Date.now()
//            };
//
//            var entity = repository.newEntity(forgeArgument);
//
//            expect(repository.unwrap(entity).get("name")).to.be.eql(forgeArgument.name);
//            expect(repository.unwrap(entity).get("label")).to.be.eql(forgeArgument.label);
//        });
//
//        it("should reconstruct relations", function () {
//            var entity = repository.newEntity({
//                name: "tablename",
//                label: "tablelabel",
//                attributes: [{
//                    name: "attr1name",
//                    label: "attribute 1 label"
//                }, {
//                    name: "attr2name",
//                    label: "attribute 2 label"
//                }]
//            });
//
//            var item = repository.unwrap(entity);
//
//            expect(item.get("attributes")).to.be.eql(void 0);
//            expect(item.related("relation_attributes").length).to.be.eql(2);
//            expect(item.related("relation_attributes").at(0).get("name")).to.be.eql("attr1name");
//            expect(item.related("relation_attributes").at(0).get("label")).to.be.eql("attribute 1 label");
//            expect(item.related("relation_attributes").at(1).get("name")).to.be.eql("attr2name");
//            expect(item.related("relation_attributes").at(1).get("label")).to.be.eql("attribute 2 label");
//        });
//
//    });
//
//    var tableIndex = 0;
//
//    function createImportTable() {
//        return repository.wrap(ImportTableDBMapping.Model.forge({
//            name: "table" + tableIndex++,
//            label: "",
//            srid: 1
//        }));
//    }
//
//    afterEach(TestUtils.truncateDatabase.bind(null, knex));
//
//});

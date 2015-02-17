//"use strict";
//
//describe("Bookshelf Model Wrapper Test", function () {
//    /*jshint maxstatements:false*/
//
//    require("./test-server");
//    var TestUtils = require("./TestUtils");
//    var fail = require("./TestUtils").fail;
//    var chai = require("chai");
//    var expect = chai.expect;
//    var sinon = require("sinon");
//    var sinonChai = require("sinon-chai");
//    chai.use(sinonChai);
//
//    var BookshelfModelWrapper = require("../orm/BookshelfModelWrapper");
//
//    var ImportTable = require("../../../domain/datadictionary/ImportTable");
//    var ImportTableRepository = require("../../../domain/datadictionary/ImportTableRepository");
//    var LayerRepository = require("../../../domain/datadictionary/LayerRepository");
//    var Category = require("../../../domain/datadictionary/Category");
//    var Attribute = require("../../../domain/datadictionary/Attribute");
//    var knex = require("../orm/ModelFactory").context.organisation.knex;
//    var registry = require("../orm/mappingRegistry");
//    var ImportTableDBMapping = registry.compile("ImportTableDBMapping");
//    var AttributeDBMapping = registry.compile("AttributeDBMapping");
//
//    var repository, wrapper, layerRepository, layerWrapper;
//    this.timeout(1000);
//
//    beforeEach(function () {
//        repository = new ImportTableRepository();
//        wrapper = repository.wrapper;
//        layerRepository = new LayerRepository();
//        layerWrapper = layerRepository.wrapper;
//    });
//
//    describe("wrap", function () {
//
//        it("should return null if item is null", function () {
//            var entity = wrapper.wrap(null);
//
//            expect(entity).to.be.eql(null);
//        });
//
//        describe("properties", function () {
//
//            it("should wrap Model in ImportTable", function () {
//                var item = ImportTableDBMapping.Model.forge({ name: "", label: "", srid: 1 });
//                item.set("name", "testName " + Date.now());
//                item.set("label", Date.now());
//
//                var entity = wrapper.wrap(item);
//
//                expect(entity).to.be.instanceof(ImportTable);
//                expect(entity.name).to.be.eql(item.get("name"));
//                expect(entity.label).to.be.eql(item.get("label"));
//            });
//
//            it("should add setters through ImportTable to Model", function () {
//                var item = ImportTableDBMapping.Model.forge({
//                    name: "",
//                    label: "",
//                    srid: 1
//                });
//                var entity = wrapper.wrap(item);
//
//                entity.name = "testName " + Date.now();
//                entity.label = Date.now();
//
//                expect(entity.name).to.be.eql(item.get("name"));
//                expect(entity.label).to.be.eql(item.get("label"));
//            });
//
//            it("should convert underscore_space to lowerCamelCase for column names", function () {
//                var entity = createImportTable();
//
//                expect("geometryType" in entity).to.be.eql(true);
//            });
//
//            it("should stringify JSON fileds through setter", function () {
//                var thing = { date: Date.now() };
//                var mapping = {
//                    columns: [{
//                        name: "thing",
//                        type: "json"
//                    }],
//                    Collection: sinon.stub()
//                };
//                var wrapper = new BookshelfModelWrapper(mapping, sinon.stub().returnsThis());
//                var item = {
//                    get: sinon.stub(),
//                    set: sinon.stub()
//                };
//                var entity = wrapper.wrap(item);
//
//                entity.thing = thing;
//
//                expect(item.set).to.have.been.calledWith("thing", JSON.stringify(thing));
//            });
//
//            it("should parse JSON fileds through getter", function () {
//                var thing = { date: Date.now() };
//                var mapping = {
//                    columns: [{
//                        name: "thing",
//                        type: "json"
//                    }],
//                    Collection: sinon.stub()
//                };
//                var wrapper = new BookshelfModelWrapper(mapping, sinon.stub().returnsThis());
//                var item = {
//                    get: sinon.stub().returns(JSON.stringify(thing)),
//                    set: sinon.stub()
//                };
//                var entity = wrapper.wrap(item);
//
//                var thingFromEntity = entity.thing;
//
//                expect(thingFromEntity).to.be.eql(thing);
//            });
//
//            it("should only parse JSON if value is a string", function () {
//                var thing = { date: Date.now() };
//                var mapping = {
//                    columns: [{
//                        name: "thing",
//                        type: "json"
//                    }],
//                    Collection: sinon.stub()
//                };
//                var wrapper = new BookshelfModelWrapper(mapping, sinon.stub().returnsThis());
//                var item = {
//                    get: sinon.stub().returns(thing),
//                    set: sinon.stub()
//                };
//                var entity = wrapper.wrap(item);
//
//                var thingFromEntity = entity.thing;
//
//                expect(thingFromEntity).to.be.eql(thing);
//            });
//
//        });
//
//        describe("relations", function () {
//
//            it("should add properties for relations", function () {
//                var item = ImportTableDBMapping.Model.forge({ name: "", label: "", srid: 1 });
//                var entity = wrapper.wrap(item);
//
//                expect("attributes" in entity).to.be.eql(true);
//            });
//
//            it("should add getter for related list", function (done) {
//                repository.save(createImportTable()).then(function (item) {
//                    return AttributeDBMapping.Model.forge({ imptable_id: item.id, name: "", label: "" }).save().then(function (attribute) {
//                        return repository.findOne(item.id).then(function (item) {
//                            expect(item.attributes).to.be.an("array");
//                            expect(item.attributes.length).to.be.eql(1);
//                            expect(item.attributes[0].id).to.be.eql(attribute.id);
//                            done();
//                        });
//                    });
//
//                }, done);
//            });
//
//            it("should wrap items in related list", function (done) {
//                repository.save(createImportTable()).then(function (item) {
//                    return AttributeDBMapping.Model.forge({ imptable_id: item.id, name: "", label: "" }).save().then(function () {
//                        return repository.findOne(item.id).then(function (item) {
//                            expect(item.attributes[0]).to.be.instanceof(Attribute);
//                            expect(wrapper.unwrap(item.attributes[0])).to.be.instanceof(AttributeDBMapping.Model);
//                            done();
//                        });
//                    });
//
//                }, done);
//            });
//
//            it("changes on returned related list should not reflect in inner entity state", function (done) {
//                repository.save(createImportTable()).then(function (item) {
//                    return repository.findOne(item.id).then(function (item) {
//                        item.attributes.push("foo");
//                        expect(item.attributes.length).to.be.eql(0);
//                        done();
//                    });
//
//                }, done);
//            });
//
//            it("should provide modifier methods for related list", function () {
//                var item = repository.newEntity();
//
//                expect(item.addAttributes).to.be.a("function");
//                expect(item.removeAttributes).to.be.a("function");
//            });
//
//            it("should return empty array for empty related list", function () {
//                var item = repository.newEntity();
//
//                expect(item.attributes).to.be.an("array");
//                expect(item.attributes.length).to.be.eql(0);
//            });
//
//            it("should remove removed item from related list", function (done) {
//                repository.save(createImportTable()).then(function (item) {
//                    return AttributeDBMapping.Model.forge({ imptable_id: item.id, name: "", label: "" }).save().then(function () {
//                        return repository.findOne(item.id).then(function (item) {
//                            item.removeAttributes(item.attributes[0]);
//                            expect(item.attributes.length).to.be.eql(0);
//                            done();
//                        });
//                    });
//
//                }, done);
//            });
//
//            it("should remove array of removed item from related list", function (done) {
//                repository.save(createImportTable()).then(function (item) {
//                    return AttributeDBMapping.Model.forge({ imptable_id: item.id, name: "", label: "" }).save().then(function () {
//                        return repository.findOne(item.id).then(function (item) {
//                            item.removeAttributes(item.attributes);
//                            expect(item.attributes.length).to.be.eql(0);
//                            done();
//                        });
//                    });
//
//                }, done);
//            });
//
//            it("should add added item to related list", function (done) {
//                repository.save(createImportTable()).then(function (item) {
//                    return AttributeDBMapping.Model.forge({ imptable_id: item.id, name: "", label: "" }).save().then(function () {
//                        return repository.findOne(item.id).then(function (item) {
//                            var attribute = item.attributes[0];
//                            item.removeAttributes(attribute);
//                            item.addAttributes(attribute);
//                            expect(item.attributes.length).to.be.eql(1);
//                            done();
//                        });
//                    });
//
//                }, done);
//            });
//
//            it("should link added item to this", function (done) {
//                repository.save(createImportTable()).then(function (item) {
//                    var attribute = item.newAttributes({ name: "", label: "" });
//                    item.addAttributes(attribute);
//
//                    expect(attribute.item.get("imptable_id")).to.be.eql(item.id);
//                    done();
//                }, done);
//            });
//
//            it("should unlink removed item", function (done) {
//                repository.save(createImportTable()).then(function (item) {
//                    var attribute = item.newAttributes({ name: "", label: "" });
//                    item.addAttributes(attribute);
//
//                    item.removeAttributes(attribute);
//
//                    expect(attribute.item.get("imptable_id")).to.be.eql(null);
//                    done();
//                }, done);
//            });
//
//            it("should add array of added item to related list", function (done) {
//                repository.save(createImportTable()).then(function (item) {
//                    return AttributeDBMapping.Model.forge({ imptable_id: item.id, name: "", label: "" }).save().then(function () {
//                        return repository.findOne(item.id).then(function (item) {
//                            var attributes = item.attributes;
//                            item.removeAttributes(attributes);
//                            item.addAttributes(attributes);
//                            expect(item.attributes.length).to.be.eql(1);
//                            done();
//                        });
//                    });
//
//                }, done);
//            });
//
//            it("should add getter for related Entity", function () {
//                var layer = layerRepository.newEntity();
//                var category = { id: Date.now() };
//                layerRepository.unwrap(layer).relations.relation_category = category;
//
//                expect(layer.category.item).to.be.equal(category);
//            });
//
//            it("should return null from getter if related Entity is not set", function () {
//                var layer = layerRepository.newEntity();
//
//                var category = layer.category;
//
//                expect(category).to.be.equal(null);
//            });
//
//            it("should add setter for related Entity", function () {
//                var layer = layerRepository.newEntity();
//                var category = layer.newCategory({ id: Date.now() });
//                layer.category = category;
//
//                var item = layerRepository.unwrap(layer);
//
//                expect(item.get("category_id")).to.be.eql(category.id);
//                expect(item.related("relation_category")).to.be.eql(category.item);
//            });
//
//            it("should allow to set null via setter for related Entity", function () {
//                var layer = layerRepository.newEntity();
//                layer.category = null;
//
//                var item = layerRepository.unwrap(layer);
//
//                expect(item.get("category_id")).to.be.eql(null);
//                expect(item.relations.relation_category).to.be.eql(null);
//            });
//
//            it("should throw error if relation type is not supported", function (done) {
//                try {
//                    wrapper.Mapping.relations.push({ type: "unsupported", references: {}, name: "unsupportedRelation" });
//                    createImportTable();
//                    wrapper.Mapping.relations.pop();
//                    fail(done)();
//                } catch (error) {
//                    expect(error.message).to.be.eql("Relation of type 'unsupported' not implemented");
//                    wrapper.Mapping.relations.pop();
//                    done();
//                }
//            });
//
//        });
//
//        describe("toJSON", function () {
//
//            it("should create nice JSON", function (done) {
//                repository.save(createImportTable()).then(function (importTable) {
//                    return AttributeDBMapping.Model.forge({
//                        imptable_id: importTable.id,
//                        name: "attrName",
//                        label: "attrLabel"
//                    }).save().then(function () {
//                        return repository.findOne(importTable.id).then(function (importTable) {
//                            importTable.name = "theName";
//                            importTable.label = "aLabel";
//
//                            var json = JSON.parse(JSON.stringify(importTable));
//
//                            expect(json.name).to.be.eql("theName");
//                            expect(json.label).to.be.eql("aLabel");
//                            expect("attributes" in json).to.be.eql(true);
//                            expect(json.attributes).to.be.an("array");
//                            expect(json.attributes[0].name).to.be.eql("attrName");
//                            expect(json.attributes[0].label).to.be.eql("attrLabel");
//
//                            done();
//                        });
//                    });
//                }, done);
//            });
//
//            it("should not include 'item' in JSON", function (done) {
//                repository.save(createImportTable()).then(function (importTable) {
//                    var json = JSON.parse(JSON.stringify(importTable));
//
//                    expect("item" in json).to.be.eql(false);
//
//                    done();
//                }, done);
//            });
//
//        });
//
//    });
//
//    describe("unwrap", function () {
//
//        it("should return Model for ImportTable", function () {
//            var item = ImportTableDBMapping.Model.forge({ name: "", label: "", srid: 1 });
//            var entity = wrapper.wrap(item);
//
//            var unwrappedItem = wrapper.unwrap(entity);
//
//            expect(item).to.be.equal(unwrappedItem);
//        });
//
//        it("should return array of Models for array of EntityClasses", function () {
//            var item = ImportTableDBMapping.Model.forge({ name: "", label: "", srid: 1 });
//            var entity = wrapper.wrap(item);
//
//            var unwrappedItem = wrapper.unwrap([entity]);
//
//            expect(item).to.be.equal(unwrappedItem[0]);
//        });
//
//        it("should stringify json fields", function () {
//            var thing = { date: Date.now() };
//            var mapping = {
//                columns: [{
//                    name: "thing",
//                    type: "json"
//                }],
//                Collection: sinon.stub()
//            };
//            var wrapper = new BookshelfModelWrapper(mapping, sinon.stub().returnsThis());
//            var item = {
//                get: sinon.stub().returns(thing),
//                set: sinon.stub()
//            };
//            var unrwapped = wrapper.unwrap(wrapper.wrap(item));
//
//            expect(unrwapped.set).to.have.been.calledWith("thing", JSON.stringify(thing));
//        });
//
//    });
//
//    describe("createNew", function () {
//
//        it("should return instanceof Entity", function () {
//            var item = wrapper.createNew();
//            expect(item).to.be.instanceof(ImportTable);
//        });
//
//        it("should set given properties on Entity", function () {
//            var flatModel = {
//                name: "name" + Date.now()
//            };
//
//            var item = wrapper.createNew(flatModel);
//
//            expect(item.name).to.be.eql(flatModel.name);
//        });
//
//        it("should set given related list of data on Entity", function () {
//            var flatModel = {
//                attributes: [{
//                    name: "name" + Date.now()
//                }]
//            };
//
//            var item = wrapper.createNew(flatModel);
//
//            expect(item.attributes[0].name).to.be.eql(flatModel.attributes[0].name);
//        });
//
//        it("should set given related single item of data on list in Entity", function () {
//            var flatModel = {
//                category: {
//                    name: "label" + Date.now()
//                }
//            };
//
//            var item = layerWrapper.createNew(flatModel);
//
//            expect(item.category).to.be.instanceof(Category);
//            expect(item.category.label).to.be.eql(flatModel.category.label);
//        });
//
//    });
//
//    function createImportTable() {
//        return wrapper.wrap(ImportTableDBMapping.Model.forge({ name: "", label: "" }));
//    }
//
//    afterEach(TestUtils.truncateDatabase.bind(null, knex));
//
//});

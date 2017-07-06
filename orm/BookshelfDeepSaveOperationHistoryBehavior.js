"use strict";

const RETURNING_PROPERTY_DESCRIPTOR = {
    get: () => "*",
    set: () => "*",
    enumerable: true,
    configurable: true
};



class BookshelfDeepSaveOperationHistoryBehavior {

    executeSaveOperation(item, options) {
        item.set("parent_id", item.get("revision_id"));
        item.unset("revision_id");

        this.addListenersForFixingReturningStatement(item);

        const insertOptions = Object.assign({}, options, { method: "insert" });
        return item.save(null, insertOptions);
    }

    addListenersForFixingReturningStatement(item) {
        // Hackisly fix returning SQL statement, Bookshelf.JS should fix this sometime
        // https://github.com/bookshelf/bookshelf/issues/507

        item.once("saving", (model, attributes, options) => {
            Object.defineProperty(options.query._single, "returning", RETURNING_PROPERTY_DESCRIPTOR);
        });

        item.once("saved", () => {
            item.set(item.parse(item.id));
        });
    }

}

module.exports = BookshelfDeepSaveOperationHistoryBehavior;

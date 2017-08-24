"use strict";

const RETURNING_PROPERTY_DESCRIPTOR = {
    get: () => "*",
    set: () => "*",
    enumerable: true,
    configurable: true
};



class BookshelfDeepSaveOperationHistoryBehavior {

    executeSaveOperation(item, options, mapping) {
        const { revisionId, parentId } = mapping.historyColumns;
        item.set(parentId, item.get(revisionId));
        item.unset(revisionId);

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

"use strict";

const { required } = require("./Annotations");


class BookshelfDeepSaveOperationHistoryBehavior {

    executeSaveOperation(item, mapping, options = required("options")) {
        const { revisionId, parentId } = mapping.historyColumns;
        item.set(parentId, item.get(revisionId) || null);
        item.unset(revisionId);

        const insertOptions = Object.assign({}, options, { method: "insert" });
        return item.save(null, insertOptions);
    }

}

module.exports = BookshelfDeepSaveOperationHistoryBehavior;

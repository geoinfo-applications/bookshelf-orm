"use strict";

const { required } = require("./Annotations");


class BookshelfDeepSaveOperationDefaultBehavior {

    executeSaveOperation(item, mapping, options = required("options")) {
        return item.save(null, options);
    }

}

module.exports = BookshelfDeepSaveOperationDefaultBehavior;

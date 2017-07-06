"use strict";


class BookshelfDeepSaveOperationDefaultBehavior {

    executeSaveOperation(item, options) {
        return item.save(null, options);
    }

}

module.exports = BookshelfDeepSaveOperationDefaultBehavior;

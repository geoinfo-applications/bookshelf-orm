"use strict";

import Bookshelf from "bookshelf";
import IBookshelfDeepSaveOperationBehavior from "./IBookshelfDeepSaveOperationBehavior";
import { required } from "./Annotations";
import BookshelfMapping from "./BookshelfMapping";
import IEntityRepositoryOptions from "./IEntityRepositoryOptions";


export default class BookshelfDeepSaveOperationHistoryBehavior implements IBookshelfDeepSaveOperationBehavior {

    public async executeSaveOperation(item: Bookshelf.Model, mapping: BookshelfMapping, options: IEntityRepositoryOptions = required("options")):
        Promise<Bookshelf.Model> {

        const { revisionId, parentId } = mapping.historyColumns;
        item.set(parentId, item.get(revisionId) || null);
        item.unset(revisionId);

        const insertOptions = Object.assign({}, options, { method: "insert" });
        return item.save(null, insertOptions);
    }

}


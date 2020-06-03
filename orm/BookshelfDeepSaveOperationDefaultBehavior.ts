"use strict";

import Bookshelf from "bookshelf";
import IBookshelfDeepSaveOperationBehavior from "./IBookshelfDeepSaveOperationBehavior";
import { required } from "./Annotations";
import BookshelfMapping from "./BookshelfMapping";
import IEntityRepositoryOptions from "./IEntityRepositoryOptions";


export default class BookshelfDeepSaveOperationDefaultBehavior implements IBookshelfDeepSaveOperationBehavior {

    public async executeSaveOperation(item: Bookshelf.Model<any>, _mapping: BookshelfMapping,
        options: IEntityRepositoryOptions = required("options")): Promise<Bookshelf.Model<any>> {
        return item.save(undefined, options);
    }

}


"use strict";

import Bookshelf from "bookshelf";
import IBookshelfDeepSaveOperationBehavior from "./IBookshelfDeepSaveOperationBehavior";
import { required } from "./Annotations";
import BookshelfMapping from "./BookshelfMapping";
import IEntityRepositoryOptions from "./IEntityRepositoryOptions";


export default class BookshelfDeepSaveOperationDefaultBehavior<M extends Bookshelf.Model<any>> implements IBookshelfDeepSaveOperationBehavior<M> {

    public async executeSaveOperation(item: M, _mapping: BookshelfMapping, options: IEntityRepositoryOptions = required("options")): Promise<M> {
        return item.save(undefined, options);
    }

}


"use strict";

import Bookshelf from "bookshelf";
import BookshelfMapping from "./BookshelfMapping";
import IEntityRepositoryOptions from "./IEntityRepositoryOptions";


export default interface IBookshelfDeepSaveOperationBehavior {

    executeSaveOperation(item: Bookshelf.Model, mapping: BookshelfMapping, options: IEntityRepositoryOptions): Promise<Bookshelf.Model>;

}

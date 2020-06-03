"use strict";

import Bookshelf from "bookshelf";
import BookshelfMapping from "./BookshelfMapping";
import IEntityRepositoryOptions from "./IEntityRepositoryOptions";


export default interface IBookshelfDeepSaveOperationBehavior {

    executeSaveOperation(item: Bookshelf.Model<any>, mapping: BookshelfMapping, options: IEntityRepositoryOptions): Promise<Bookshelf.Model<any>>;

}

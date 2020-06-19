"use strict";

import Bookshelf from "bookshelf";
import BookshelfMapping from "./BookshelfMapping";
import IEntityRepositoryOptions from "./IEntityRepositoryOptions";


export default interface IBookshelfDeepSaveOperationBehavior<M extends Bookshelf.Model<any>> {

    executeSaveOperation(item: M, mapping: BookshelfMapping, options: IEntityRepositoryOptions): Promise<M>;

}

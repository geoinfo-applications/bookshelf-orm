"use strict";

import Bookshelf = require("bookshelf");


export default interface IEntityType {
    readonly item?: Bookshelf.Model<any>;
}

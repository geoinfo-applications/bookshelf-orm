"use strict";

import Bookshelf from "bookshelf";
import { required } from "./Annotations";
import BookshelfMapping from "./BookshelfMapping";
import { IColumnDescriptor } from "./typedef/IColumnDescriptor";
import IEntityRepositoryOptions from "./IEntityRepositoryOptions";
import IBookshelfDeepSaveOperationBehavior from "./IBookshelfDeepSaveOperationBehavior";


export default class BookshelfDeepSaveOperationHistoryBehavior<M extends Bookshelf.Model<any>> implements IBookshelfDeepSaveOperationBehavior<M> {

    public async executeSaveOperation(item: M, mapping: BookshelfMapping, options: IEntityRepositoryOptions = required("options")): Promise<M> {
        if (!await this.didHistoryChange(item, mapping, options)) {
            return item;
        }

        const { revisionId, parentId } = mapping.historyColumns;
        item.set(parentId, item.get(revisionId) || null);
        item.unset(revisionId);

        const insertOptions = Object.assign({}, options, { method: "insert" });
        return item.save(undefined, insertOptions);
    }

    private async didHistoryChange(item: M, mapping: BookshelfMapping, options: IEntityRepositoryOptions): Promise<boolean> {
        if (!this.hasHistoryCheck(item, mapping)) {
            return true;
        }

        const query = mapping.createQuery<M, Partial<M>>(item, options);

        for (const columnMapping of mapping.columnMappings) {
            if (!this.isReadonlyColumns(columnMapping)) {
                query.andWhere(columnMapping.name, item.get(columnMapping.name));
            }
        }

        const { count } = await query.count().first();
        return +count === 0;
    }

    private hasHistoryCheck(item: M, mapping: BookshelfMapping): boolean {
        return mapping.historyChangeCheck && !!item.attributes[mapping.identifiedBy];
    }

    private isReadonlyColumns(columnMapping: IColumnDescriptor): boolean {
        return columnMapping.type === "sql" && !columnMapping.set;
    }

}


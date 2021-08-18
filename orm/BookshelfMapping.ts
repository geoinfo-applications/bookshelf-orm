"use strict";

import Knex from "knex";
import Bookshelf from "bookshelf";
import StringUtils from "./StringUtils";
import { required } from "./Annotations";
import IEntityRepositoryOptions from "./IEntityRepositoryOptions";
import { IDbMapping } from "./typedef/IDbMapping";
import { IColumnDescriptor } from "./typedef/IColumnDescriptor";
import { IRelationDescriptor } from "./typedef/IRelationDescriptor";
import {
    IJsonColumnDescriptor,
    IRegularColumnDescriptor,
    ISqlColumnDescriptor,
    IWritableSqlColumnDescriptor,
    IReadableSqlColumnDescriptor
} from "./typedef/IColumnDescriptor";


export default class BookshelfMapping {

    public readonly dbContext: Bookshelf;
    public readonly tableName: string;
    public readonly identifiedBy: string;
    public readonly relations: Array<IRelationDescriptor<unknown>>;
    public readonly relationNames: string[];
    public columns: Array<string | IColumnDescriptor>;
    public discriminator: object | ((q: Knex.QueryBuilder) => void);
    public readonly onDelete: object | ((q: Knex.QueryBuilder) => void);
    public readonly keepHistory: boolean;
    public readonly historyColumns: { revisionId: string; parentId: string };
    public readonly historyChangeCheck: boolean;

    public Model: typeof Bookshelf.Model;
    public Collection: typeof Bookshelf.Collection;
    public startTransaction: <T>(callback: (q: Knex.Transaction) => Promise<T>) => Promise<T>;

    public columnMappings: IColumnDescriptor[];
    public columnNames: string[];
    public regularColumns: Array<IJsonColumnDescriptor | IRegularColumnDescriptor>;
    public regularColumnNames: string[];
    public sqlColumns: ISqlColumnDescriptor[];
    public writeableSqlColumns: IWritableSqlColumnDescriptor[];
    public readableSqlColumns: IReadableSqlColumnDescriptor[];
    public qualifiedRegularColumnNames: string[];
    public isNew?: () => boolean;

    public constructor(dbContext: Bookshelf, config: IDbMapping) {
        this.dbContext = dbContext;
        this.tableName = config.tableName!;
        this.identifiedBy = BookshelfMapping.getOptionOrDefault(config.identifiedBy, "id");
        this.relations = BookshelfMapping.getOptionOrDefault(config.relations, [] as Array<IRelationDescriptor<unknown>>);
        this.relationNames = BookshelfMapping.getOptionOrDefault(this.relations, []).map((r) => r.name);
        this.columns = BookshelfMapping.getOptionOrDefault(config.columns, [] as string[]);
        this.discriminator = config.discriminator;
        this.onDelete = config.onDelete;
        this.keepHistory = BookshelfMapping.getOptionOrDefault(config.keepHistory, false);
        this.historyColumns = BookshelfMapping.getOptionOrDefault(config.historyColumns, { revisionId: "revision_id", parentId: "parent_id" });
        this.historyChangeCheck = BookshelfMapping.getOptionOrDefault(config.historyChangeCheck, false);
        this.isNew = config.isNew;

        this.configureHistory();

        this.Model = this.createModel();
        this.Collection = this.createCollection();
        this.startTransaction = dbContext.transaction.bind(dbContext) as any;

        this.deriveColumnAccessors();
        this.provideForeignKeyColumnsToRelatedMappings();
    }

    private static getOptionOrDefault<T>(configProperty: T | undefined, defaultValue: T): T {
        return configProperty || defaultValue;
    }

    private configureHistory() {
        if (this.keepHistory) {
            this.discriminator = this.addHistoryDiscriminator();

            const columns = new Set(this.columns).add(this.historyColumns.revisionId).add(this.historyColumns.parentId);
            this.columns = [...columns];
        }
    }

    private addHistoryDiscriminator() {
        const discriminator = this.discriminator;
        const { revisionId, parentId } = this.historyColumns;

        return (q) => {
            q.whereNotIn(revisionId, (q) => q.from(this.tableName).whereNotNull(parentId).select(parentId));
            q.andWhere(discriminator);
        };
    }

    private deriveColumnAccessors() {
        this.columnMappings = this.columns.map((column) => typeof column === "string" ? { name: column, type: undefined } : column);
        this.columnNames = this.columnMappings.map((column) => column.name);
        this.regularColumns = this.columnMappings.filter((c) => c.type !== "sql") as Array<IJsonColumnDescriptor | IRegularColumnDescriptor>;
        this.regularColumnNames = this.regularColumns.map((column) => column.name);
        this.sqlColumns = this.columnMappings.filter((c) => c.type === "sql") as ISqlColumnDescriptor[];
        this.writeableSqlColumns = this.sqlColumns.filter((c) => c.set) as IWritableSqlColumnDescriptor[];
        this.readableSqlColumns = this.sqlColumns.filter((c) => c.get) as IReadableSqlColumnDescriptor[];

        this.qualifiedRegularColumnNames = this.relations
            .filter((r) => r.type === "belongsTo")
            .map((r) => r.references.mappedBy)
            .concat(this.regularColumnNames)
            .map((name) => `${this.tableName}.${name}`);
    }

    private provideForeignKeyColumnsToRelatedMappings() {
        this.relations.filter((r) => r.type === "hasMany" || r.type === "hasOne").forEach((r) => {
            (r.references.mapping as BookshelfMapping).qualifiedRegularColumnNames.push(r.references.mappedBy);
        });
    }

    private createModel(): typeof Bookshelf.Model {
        const prototype: { tableName: string; idAttribute: string; isNew?(): boolean; } = {
            tableName: this.tableName,
            idAttribute: this.identifiedBy
        };

        if (this.isNew) {
            prototype.isNew = this.isNew;
        }

        this.relations.forEach(this.addRelation.bind(this, prototype));
        return this.dbContext.Model.extend(prototype) as any;
    }

    private createCollection(): typeof Bookshelf.Collection {
        return this.dbContext.Collection.extend({ model: this.Model }) as any;
    }

    private addRelation(prototype, relation) {
        const relationName = StringUtils.camelToSnakeCase(relation.name);
        const fkName = relation.references.mappedBy || `${relationName}_id`;
        relation.references.mappedBy = fkName;

        prototype[`relation_${relation.name}`] = function () {
            if (!(relation.type in this)) {
                throw new Error(`Relation of type '${relation.type}' doesn't exist`);
            }

            const referencedColumnName = relation.references.identifies || relation.references.mapping.Model.identifiedBy;
            return this[relation.type](relation.references.mapping.Model, fkName, referencedColumnName);
        };
    }

    public createQuery<TRecord extends {} = any, TResult = Array<Partial<TRecord>>>(item, options: IEntityRepositoryOptions = required("options")):
        Knex.QueryBuilder<TRecord, TResult> {
        /* eslint complexity: 0 */
        const query = this.dbContext.knex(this.tableName);

        if (item) {
            if (item.get(this.identifiedBy) === undefined) {
                query.whereRaw(`${(query as any).client.wrapIdentifier(this.identifiedBy)} = NULL`);
            } else {
                query.where(this.identifiedBy, item.get(this.identifiedBy));
            }
        }

        if (this.discriminator) {
            query.andWhere(this.discriminator);
        }

        if (options && options.transacting) {
            query.transacting(options.transacting as any);
        }

        return query as any;
    }

    public raw<TResult = any>(arg1, ...args): Knex.Raw<TResult> {
        return this.dbContext.knex.raw(arg1, ...args) as any;
    }

}

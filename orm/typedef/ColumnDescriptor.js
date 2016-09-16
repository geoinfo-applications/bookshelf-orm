"use strict";

/**
 * Describes a Column in BookshelfMapping
 * @property {string} name - name of the column
 * @property {string} type - type of the column: "sql" or "json"
 * @property {Function} get - for type sql, this getter creates an sql snipped to get the value
 * @property {Function} set - for type sql, this setter creates an sql snipped to set the value
 */
class ColumnDescriptor {

}

module.exports = ColumnDescriptor;

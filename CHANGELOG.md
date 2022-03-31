# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### BREAKING CHANGES

  - Now the correct type (QueryBuilder) is used for the knex where condition callback parameter.
    - e.g. `findWhere(q: (q: Knex.QueryInterface) => void ...` => `findWhere(q: (q: Knex.QueryBuilder) => void ...`

### Noteworthy

  -

## [4.10.0] - 2022-01-11

### BREAKING CHANGES

  -

### Noteworthy

  - added `discriminator` to `IEntityRepositoryOptions` which should allow limiting number of sequentially scanned
    entries
  - added return type to `DBMappingRegistry.getInstance()`

## [4.9.0] - 2021-11-10

### BREAKING CHANGES

-

### Noteworthy

-

## [4.8.0] - 2021-10-13

### BREAKING CHANGES

  -

### Noteworthy

  - introduced `EntityRepository#paginate` method

## [4.3.0] - 2021-01-06

### BREAKING CHANGES

  -

### Noteworthy

  - Added the `historyChangeCheck` option which prevents creating new states, if there are no changes in the entity.
  - Fixed `orphanRemoval` in combination with `identifies` option.
  - Added `isNew` option for saving attributes with a custom id.

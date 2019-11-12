# Bookshelf ORM
An OR-Mapping tool which features Bookshelf, the Repository Pattern an Persistence Ignorance.


## Basics
One of the key goals of this OR-Mapper is Persistence Ignorance, meaning, have clear separation from Business Logic code and infrastructure code. 
For this reason, description of DB columns and relations is separate from Domain Model classes. This is the **Mapping**.
The idea of the accompanying **Repository** is to encapsulate all DB related operations and specialized queries.    

## Examples
First, you need an instance of the MappingRegistry:
```javascript
const { DBMappingRegistry } = require("@geoinfo/bookshelf-orm");
const registry = DBMappingRegistry.getInstance();
```

In this registry, you register your DB-Tables and fields:
```javascript
registry.register("CarDBMapping", "test", {
    tableName: "myschema.car",
    columns: ["id", "name", "model_name"]
});
```

Since we want to separate Mapping and DB related stuff from Domain Objects, you might want to create a separate Class to hold additional logic. 
This class does not have to "know" anything about the OR-Mapper, and does **not** have to extend a certain base class. You are free to do whatever you wish:
```javascript
class Car {

    accelecate() {
        // ...
    }

}
```

In order to fetch and save entities, you need a Repository. Here you have to extend the base implementation `EntityRepository` and specify your domain class (or `Object` if you don't need one):
```javascript
const { EntityRepository, DBMappingRegistry } = require("@geoinfo/bookshelf-orm");
const registry = DBMappingRegistry.getInstance();

class CarRepository extends EntityRepository {
  
    constructor() {
        super(Car, registry.compile("CarDBMapping"))
    }

}

```

### Basic usage
The base repository implementation has a number of useful methods, mainly simple CRUD.
```javascript
const carRepository = new CarRepository();

const allCars = await carRepository.findAll();
const carNumberOne = await carRepository.findOne(3);

const myCar = await carRepository.newEntity();
myCar.name = "Little red corvette";
await carRepository.save(myCar);

await carRepository.remove(myCar);
``` 

Specialized queries can be added to the repository, in order to encapsulate all DB access. 
The query callback argument is a preinitialized [knex](http://www.knexjs.org) instance:
```javascript
class CarRepository extends EntityRepository {
  
    // ...
    
    async findAllCorvettes() {
        return this.findAllWhere((q) => q.where("name", "like", "%corvette%"))
    }

}
```

A more direct option to access the DB with knex is `Mapping.createQuery`:
```javascript
class CarRepository extends EntityRepository {
  
    // ...
    
    async findAllCorvettes() {
        return this.Mapping.createQuery().where("name", "like", "%corvette%").select("name");
    }

}
```  

These are the basics, for extended documentation see [EntityRepository class documentation](./EntityRepository.html) and 
the [DBMappingRegistry documentation](./DBMappingRegistry.html).

### Cascading save and remove operations
Only operating on one table is no fun. This OR-Mapper supports loading, saving and removing deep relations:
```javascript
registry.register("CarDBMapping", "test", {
    tableName: "myschema.car",
    columns: ["id", "name", "model_name"],
    
    relations: [{
        name: "parts",
        type: "hasMany",
        references: {
            type: Part,
            mapping: "PartDBMapping",
            mappedBy: "car_id",
            orphanRemoval: true,
            cascade: true
        }
    }]
});


registry.register("PartDBMapping", "test", {
    tableName: "datadictionary.part",
    columns: ["id", "name"]
});
```

Anything thats modified in parts will now be saved to DB and loaded when a car is fetched. 
Helpermethods to instantiate and add/remove relations are injected to the domain class:
```javascript
const part = car.newParts();
part.name = "Engine";
car.addParts(part);

console.log(car.parts); // [{ id: 2, carId: 1, name: "Engine" }]
```

Changes to the original array are *not* reflected in the internal state. 
It can safely be forwarded to services etc. and is a regular JS array without magic.

This kind of mapping, `"hasMany"`, is the most complicated. There are two other types: `"hasOne"` and `"belongsTo"`.
Both of them reference only one object, and can be modified with simple assignment. 
The difference between the two is, in which table the foreign key is located.

A `"hasOne"` mapping expects the FK column in the *related* table:
```javascript
registry.register("CarDBMapping", "test", {
    tableName: "datadictionary.car",
    columns: ["id", "name", "model_name"],

    relations: [{
        name: "parkingSpace",
        type: "hasOne",
        references: {
            mapping: "ParkingSpaceDBMapping",
            mappedBy: "car_id"
        }
    }]
});

registry.register("ParkingSpaceDBMapping", "test", {
    tableName: "datadictionary.parking_space",
    columns: ["id", "name", "car_id"]
});
```
 
While `"belongsTo"` assumes the FK to be in the table where the relation is started on:
```javascript
registry.register("CarDBMapping", "test", {
    tableName: "datadictionary.car",
    columns: ["id", "name", "model_name", "owner_id"],

    relations: [{
        name: "owner",
        type: "belongsTo",
        references: {
            mapping: "OwnerDBMapping"
        }
    }]
});

registry.register("OwnerDBMapping", "test", {
    tableName: "datadictionary.owner",
    columns: ["id", "name"]
});
``` 

For more about mappings see [BookshelfMapping documentation](./BookshelfMapping.html)
Or have a look at the unit tests and mocks, all examples are copied from `/test/db/mappings.js`.

### SQL Columns
Sometimes it is convenient to transform or calculate columns. This can be done directly in the mapping:
```javascript
registry.register("CarDBMapping", "test", {
    tableName: "datadictionary.car",
    columns: ["id", "name", "model_name", {
        name: "description",
        type: "sql",
        get: "lower(coalesce(car.name, '') || '::' || coalesce(model_name))"
    }, {
        name: "serial_number",
        type: "sql",
        get: () => "upper(car.serial_number)",
        set: (v) => "lower('" + v + "')"
    }]
});
```

### JSON Columns
PostgreSQL has support for JSON. For the OR-Mapper to correctly parse and serialize JSON, you must mark these columns in the mapping:
```javascript
registry.register("PersonDBMapping", "test", {
    tableName: "datadictionary.person",
    identifiedBy: "name",
    columns: ["name", "age", {
        name: "things",
        type: "json"
    }]
});
```

### Transactions
Generally all operations should support transactions for safety. 
Most of the time Transaction Control should be left to the "client", meaning outside of the repository. 
This is supported by passing `{ transactional: true }` in options or wrapping multiple calls in `repository.executeTransactional`:
```javascript
await carRepository.save(myCar, { transactional: true });
```
Or the more complex case
```javascript
const options = { transactional: true };
await carRepository.executeTransactional(() => {
    await carRepository.save(myCar, { transactional: true });
    myCar.name = "new name";
    await carRepository.save(myCar, { transactional: true });
}, options);
```

If anything in the call fails, be it DB or an error in the code, the transaction will be rolled back. 
Once all promises resolve, the transaction will be committed.

### Circular references
Not supported. Generally advised against.

"use strict";


export function required(name): never {
    throw new Error(`'${name}' is required!`);
}

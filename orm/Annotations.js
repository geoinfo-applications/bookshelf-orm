"use strict";

class Annotations {

    static required(name) {
        throw new Error(`'${name}' is required!`);
    }

}

module.exports = Annotations;

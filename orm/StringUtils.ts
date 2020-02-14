"use strict";


class StringUtils {

    static snakeToCamelCase(string) {
        let out = "";
        for (let i = 0; i < string.length; i++) {
            if (string[i] === "_") {
                i = i + 1;
                out = out + string[i].toUpperCase();
            } else {
                out = out + string[i];
            }
        }
        return out;
    }

    static camelToSnakeCase(string) {
        return string.replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase();
    }

    static firstLetterUp(string) {
        return string[0].toUpperCase() + string.substr(1);
    }

}

module.exports = StringUtils;

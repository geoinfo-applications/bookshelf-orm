"use strict";


class StringUtils {

    static snakeToCamelCase(string) {
        var out = "";
        for (var i = 0; i < string.length; i++) {
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
        return string.replace(/([a-z][A-Z])/g, (match) => match[0] + "_" + match[1].toLowerCase());
    }

    static firstLetterUp(string) {
        return string[0].toUpperCase() + string.substr(1);
    }


}

module.exports = StringUtils;

"use strict";


export default class StringUtils {

    public static snakeToCamelCase(string: string): string {
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

    public static camelToSnakeCase(string: string): string {
        return string.replace(StringUtils.camelCaseRegex, "$1_$2").toLowerCase();
    }

    public static get camelCaseRegex(): RegExp {
        return /([a-z])([A-Z])/g;
    }

    public static firstLetterUp(string: string): string {
        return string[0].toUpperCase() + string.substr(1);
    }

}


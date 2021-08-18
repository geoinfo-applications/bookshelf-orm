"use strict";

import { Dictionary } from "ts-essentials";
import StringUtils from "../orm/StringUtils";

const SNAKE_CASE_REGEX = /([-_][a-z])/g;


export default class EntityCaseConverter {

    public static snakeToCamelCase<TSnake = Dictionary<unknown>, TCamel = Dictionary<unknown>>(snakeCaseEntity: TSnake,
        shouldReplace: boolean): TCamel {
        return EntityCaseConverter.convert<TSnake, TCamel>(snakeCaseEntity, shouldReplace, SNAKE_CASE_REGEX,
            StringUtils.snakeToCamelCase.bind(StringUtils));
    }

    public static camelToSnakeCase<TCamel = Dictionary<unknown>, TSnake = Dictionary<unknown>>(caseCaseEntity: TCamel,
        shouldReplace: boolean): TSnake {
        return EntityCaseConverter.convert<TCamel, TSnake>(caseCaseEntity, shouldReplace, StringUtils.camelCaseRegex,
            StringUtils.camelToSnakeCase.bind(StringUtils));
    }

    private static convert<TInput = Dictionary<unknown>, TOutput = Dictionary<unknown>>(entity: TInput, shouldReplace: boolean, regex: RegExp,
        callback: (key: string) => string): TOutput {
        for (const name in entity) {
            if (name && name.match(regex)) {
                const camelName = callback(name);
                entity[camelName] = entity[name];

                if (shouldReplace) {
                    delete entity[name];
                }
            }
        }

        return entity as unknown as TOutput;
    }

}

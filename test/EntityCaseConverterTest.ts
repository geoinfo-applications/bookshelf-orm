"use strict";

import chai, { expect } from "chai";
import sinonChai from "sinon-chai";
import EntityCaseConverter from "../orm/EntityCaseConverter";

/* eslint-disable camelcase */
interface ISnake {
    this_should_be_camel_case: string;
    my_reference_should_stay_the_same: string[];
}

interface ICamel {
    thisShouldBeCamelCase: string;
    myReferenceShouldStayTheSame: string[];
}

describe("EntityCaseConverterUtils Test", () => {
    chai.use(sinonChai);

    describe("snakeToCamelCase", () => {

        it("should replace snake case property names with camel case", () => {
            const entity: ISnake = {
                this_should_be_camel_case: "I'm a String",
                my_reference_should_stay_the_same: new Array(10).fill("Na")
            };
            const expected: ICamel = {
                thisShouldBeCamelCase: entity.this_should_be_camel_case,
                myReferenceShouldStayTheSame: entity.my_reference_should_stay_the_same
            };

            const actual: ICamel = EntityCaseConverter.snakeToCamelCase<ISnake, ICamel>(entity, true);

            expect(actual).to.be.eql(expected);
            expect(actual.thisShouldBeCamelCase).to.be.equal(expected.thisShouldBeCamelCase);
            expect(actual.myReferenceShouldStayTheSame).to.be.equal(expected.myReferenceShouldStayTheSame);
        });

        it("should copy snake case property names to camel case", () => {
            const entity: ISnake = {
                this_should_be_camel_case: "I'm a String",
                my_reference_should_stay_the_same: new Array(1).fill("Batman")
            };
            const expected: ICamel & ISnake = {
                thisShouldBeCamelCase: entity.this_should_be_camel_case,
                myReferenceShouldStayTheSame: entity.my_reference_should_stay_the_same,
                ...entity
            };

            const actual: ICamel & ISnake = EntityCaseConverter.snakeToCamelCase<ISnake, ICamel & ISnake>(entity, false);

            expect(actual).to.be.eql(expected);
            expect(actual.thisShouldBeCamelCase).to.be.equal(expected.thisShouldBeCamelCase);
            expect(actual.this_should_be_camel_case).to.be.equal(expected.thisShouldBeCamelCase);
            expect(actual.myReferenceShouldStayTheSame).to.be.equal(expected.myReferenceShouldStayTheSame);
            expect(actual.my_reference_should_stay_the_same).to.be.equal(expected.myReferenceShouldStayTheSame);
        });

    });

    describe("camelToSnakeCase", () => {

        it("should replace camel case property names with snake case", () => {
            const entity: ICamel = {
                thisShouldBeCamelCase: "I'm a String",
                myReferenceShouldStayTheSame: new Array(10).fill("Na")
            };
            const expected: ISnake = {
                this_should_be_camel_case: entity.thisShouldBeCamelCase,
                my_reference_should_stay_the_same: entity.myReferenceShouldStayTheSame
            };

            const actual: ISnake = EntityCaseConverter.camelToSnakeCase<ICamel, ISnake>(entity, true);

            expect(actual).to.be.eql(expected);
            expect(actual.this_should_be_camel_case).to.be.equal(expected.this_should_be_camel_case);
            expect(actual.my_reference_should_stay_the_same).to.be.equal(expected.my_reference_should_stay_the_same);
        });

        it("should copy camel case property names to snake case", () => {
            const entity: ICamel = {
                thisShouldBeCamelCase: "I'm a String",
                myReferenceShouldStayTheSame: new Array(10).fill("Na")
            };
            const expected: ISnake = {
                this_should_be_camel_case: entity.thisShouldBeCamelCase,
                my_reference_should_stay_the_same: entity.myReferenceShouldStayTheSame,
                ...entity
            };
            const actual: ICamel & ISnake = EntityCaseConverter.camelToSnakeCase<ICamel, ICamel & ISnake>(entity, false);

            expect(actual).to.be.eql(expected);
            expect(actual.thisShouldBeCamelCase).to.be.equal(expected.this_should_be_camel_case);
            expect(actual.this_should_be_camel_case).to.be.equal(expected.this_should_be_camel_case);
            expect(actual.myReferenceShouldStayTheSame).to.be.equal(expected.my_reference_should_stay_the_same);
            expect(actual.my_reference_should_stay_the_same).to.be.equal(expected.my_reference_should_stay_the_same);
        });

    });

});

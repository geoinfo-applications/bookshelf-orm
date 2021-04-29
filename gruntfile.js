"use strict";

const path = require("path");

module.exports = (grunt) => {
    /* eslint camelcase: 0 */
    require("time-grunt")(grunt);

    const srcFiles = [
        "orm/**/!(*.d).ts",
        "test/**/!(*.d).ts",
        "index.ts",
        "gruntfile.js"
    ];

    grunt.initConfig({

        eslint: {
            options: { fix: grunt.option("fix") },
            src: srcFiles
        },

        tslint: {
            options: { configuration: require("./tslint.js"), fix: grunt.option("fix") },
            orm: ["orm/**/*.ts"],
            test: ["test/**/*.ts"]
        },

        david: {
            check: {
                options: {
                    warn404: true
                }
            }
        },

        todo: {
            src: srcFiles
        },

        jsdoc: {
            doc: {
                src: ["orm/**/*.js", "readme-doc.md"],
                options: {
                    destination: "docs",
                    template: "node_modules/ink-docstrap/template",
                    configure: "jsdoc.conf.json"
                }
            }
        },

        mochaTest: {
            options: {
                reporter: "spec",
                require: ["source-map-support/register"]
            },
            src: ["./test/**/*.js"]
        },

        mocha_istanbul: {
            coverage: {
                src: ["./test/**/*.js"],
                options: {
                    reporter: "mocha-multi",
                    reportFormats: ["lcov", "clover"],
                    recursive: true,
                    coverageFolder: "./coverage",
                    require: ["source-map-support/register"]
                }
            }
        },

        env: {
            build: {
                NODE_ENV: "unit_test",
                multi: "spec=- mocha-bamboo-reporter=-"
            },
            development: {
                NODE_ENV: "development"
            },
            production: {
                NODE_ENV: "production"
            },
            test: {
                NODE_ENV: "test"
            },
            unit_test: {
                NODE_ENV: "unit_test",
                TESTSERVER_HOST: "192.168.110.5",
                multi: "spec=- mocha-bamboo-reporter=-"
            }
        },

        clean: {
            reports: ["./mocha.json", "./coverage/server/clover.xml"],
            ts: [
                "*.tsbuildinfo",
                ...srcFiles
                    .filter((s) => s.endsWith(".ts"))
                    .map((s) => [s.replace(/\.ts$/, ".js"), s.replace(/\.ts/, ".js.map"), s.replace(/\.ts/, ".d.ts")])
                    .reduce((a, b) => [...a, ...b])
            ]
        },

        exec: {
            tsc: {
                command: `${path.resolve(__dirname, "node_modules/.bin/tsc")}`
            }
        }

    });

    require("load-grunt-tasks")(grunt);

    grunt.registerTask("code-check", ["eslint", "todo"]);
    grunt.registerTask("update", ["npm-install", "clean", "david"]);
    grunt.registerTask("update-development", ["env:unit_test", "update", "env:development"]);
    grunt.registerTask("test", ["env:unit_test", "code-check", "exec:tsc", "mochaTest"]);
    grunt.registerTask("build", ["env:build", "code-check", "exec:tsc", "mochaTest", "jsdoc"]);
};

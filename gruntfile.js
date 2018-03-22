"use strict";

module.exports = function (grunt) {
    require("time-grunt")(grunt);

    var jsFiles = [
        "orm/**/*.js",
        "test/**/*.js",
        "index.js",
        "gruntfile.js"
    ];

    grunt.initConfig({

        jshint: {
            all: {
                src: jsFiles
            },
            options: {
                jshintrc: true
            }
        },

        jscs: {
            src: jsFiles,
            options: {
                config: "./.jscsrc"
            }
        },

        plato: {
            reports: {
                options: {
                    jshint: false,
                    exclude: /^(node_modules|coverage|reports)\//
                },
                files: {
                    reports: ["**/*.js"]
                }
            }
        },

        david: {
            check: {
                options: {
                    warn404: true
                }
            }
        },

        todo: {
            src: jsFiles
        },

        jsdoc: {
            doc: {
                src: ["orm/**/*.js", "readme.md"],
                options: {
                    destination: "doc",
                    template: "node_modules/ink-docstrap/template",
                    configure: "jsdoc.conf.json"
                }
            }
        },

        mochaTest: {
            options: {
                reporter: "spec"
            },
            src: ["./test/**/*.js"]
        },

        mocha_istanbul: {
            coverage: {
                src: "./test/**",
                options: {
                    reporter: "mocha-multi",
                    reportFormats: ["lcov", "clover"],
                    recursive: true,
                    coverageFolder: "./coverage"
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

        clean: ["./mocha.json", "./coverage/clover.xml"],

        release: {
            options: {
                npm: true,
                remote: "--no-verify",
                tagName: "release-<%= version %>",
                commitMessage: "[grunt release plugin] release <%= version %>",
                tagMessage: "[grunt release plugin] version <%= version %>"
            }
        }

    });

    require("load-grunt-tasks")(grunt);

    grunt.registerTask("code-check", ["jshint", "jscs", "todo"]);
    grunt.registerTask("update", ["npm-install", "clean", "david"]);
    grunt.registerTask("update-development", ["env:unit_test", "update", "env:development"]);
    grunt.registerTask("test", ["env:unit_test", "code-check", "mochaTest"]);
    grunt.registerTask("build", ["env:build", "code-check", "update", "mocha_istanbul", "plato", "jsdoc"]);

};

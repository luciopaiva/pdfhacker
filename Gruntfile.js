module.exports = function (grunt) {
    "use strict";

    var
        all_js_files = ['*.js', 'lib/**/*.js', 'test/**/*.js'];

    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-mocha-istanbul');

    grunt.initConfig({

        pkg: grunt.file.readJSON('package.json'),

        jshint: {
            src: all_js_files,
            options: {
                jshintrc: '.jshintrc'
            }
        },

        mocha_istanbul: {
            src: 'test',
            options: {
                reporter: 'dot'
            }
        },

        watch: {
            files: all_js_files,
            options: {
                atBegin: true
            },
            tasks: ['jshint', 'mocha_istanbul']
        }
    });

    grunt.registerTask('default', ['jshint', 'mocha_istanbul']);
};

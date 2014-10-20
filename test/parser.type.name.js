"use strict";

var
    assert = require('assert'),
    Parser = require('../lib/parser');

describe('PDF parser', function () {

    describe('Basic types', function () {

        describe('Name', function () {

            it('should parse a name value', function () {
                var
                    name = 'Testing';

                var result = parse('/' + name).getName();
                assert.strictEqual(typeof result, 'string', 'Invalid name value');
                assert.strictEqual(result, name, 'Name "' + result + '" should be "' + name + '"');
            });

        });
    });

    function parse(script) {
        return new Parser(new Buffer(script));
    }

});

"use strict";

var
    assert = require('assert'),
    Parser = require('../lib/parser');

describe('PDF parser', function () {

    describe('Basic types', function () {

        describe('Null', function () {

            it('should parse a null value', function () {
                var result = parse('null').getNull();
                assert.strictEqual(result, null, 'Value should be null');
            });
        });
    });

    function parse(script) {
        return new Parser(Buffer.from(script, "utf-8"));
    }

});

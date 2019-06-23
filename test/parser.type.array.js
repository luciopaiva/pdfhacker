"use strict";

var
    assert = require('assert'),
    Parser = require('../lib/parser');

describe('PDF parser', function () {

    describe('Basic types', function () {

        describe('Array', function () {

            it('should parse an empty array value', function () {
                var result = parse('[]').getArray();
                assert.strictEqual(result.length, 0, 'Array length should be zero');
            });

            it('should parse an empty array value with embedded spaces', function () {
                var result = parse('[   ]').getArray();
                assert.strictEqual(result.length, 0, 'Array length should be zero');
            });

            it('should parse an array of integers value', function () {
                var result = parse('[ 1 2 3 ]').getArray();
                assert.strictEqual(result.length, 3, 'Array length should be 3');
                assert.strictEqual(result[0], 1, 'Value at position 0 should be 1');
                assert.strictEqual(result[1], 2, 'Value at position 1 should be 2');
                assert.strictEqual(result[2], 3, 'Value at position 2 should be 3');
            });

            it('should parse a mixed array value', function () {
                var result = parse('[ 1 /Test (Testing embedded string) ]').getArray();
                assert.strictEqual(result.length, 3, 'Array length should be 3');
                assert.strictEqual(result[0], 1, 'Value at position 0 should be 1');
                assert.strictEqual(result[1], 'Test', 'Value at position 1 should be "Test"');
                assert.strictEqual(result[2], 'Testing embedded string', 'Value at position 2 should be "Testing embedded string"');
            });
        });
    });

    function parse(script) {
        return new Parser(Buffer.from(script, "utf-8"));
    }

});

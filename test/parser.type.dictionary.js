"use strict";

var
    assert = require('assert'),
    Parser = require('../lib/parser');

describe('PDF parser', function () {

    describe('Basic types', function () {

        describe('Dictionary', function () {

            it('should parse a dictionary value', function () {
                var result = parse('<</This/Test/Should/Pass>>').getDictionary();
                assert.strictEqual(result.This, 'Test', 'dict.This should be "Test"');
                assert.strictEqual(result.Should, 'Pass', 'dict.Should should be "Pass"');
            });

            it('should reject a malformed dictionary value', function () {
                assert.throws(function () {
                    parse('<</This/Test/Should/NotPass').getDictionary();
                }, 'Should reject a malformed dictionary value');
            });

            it('should parse a dictionary value with an embedded dictionary', function () {
                var result = parse('<< /inner <</value 42>> >>').getDictionary();
                assert.strictEqual(result.inner.value, 42, 'dict.inner.value should equal 42');
            });

            it('should parse a dictionary value referencing all types of objects', function () {
                var
                    result = parse('<</bool true/number 1/string(my test)/name/aName/array[1 2 3]/dict<</value 42>>/NULL null/indobjref 4 0 R/hexstr <>>>').getDictionary();
                assert.strictEqual(result.bool, true, 'dict.bool should be true');
                assert.strictEqual(result.number, 1, 'dict.number should be 1');
                assert.strictEqual(result.string, 'my test', 'dict.string should be "my test"');
                assert.strictEqual(result.name, 'aName', 'dict.name should be aName');
                assert.deepEqual(result.array, [1, 2, 3], 'dict.array should be [1, 2, 3]');
                assert.strictEqual(result.dict.value, 42, 'dict.dict.value should be 42');
                assert.strictEqual(result.NULL, null, 'dict.hexstr should be ""');
                assert.strictEqual(result.indobjref.id, 4, 'dict.indobjref.id should be 4');
                assert.strictEqual(result.indobjref.rev, 0, 'dict.indobjref.id should be 0');
                assert.strictEqual(result.hexstr, '', 'dict.hexstr should be ""');
            });
        });
    });

    function parse(script) {
        return new Parser(Buffer.from(script, "utf-8"));
    }

});

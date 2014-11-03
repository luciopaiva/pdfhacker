"use strict";

var
    assert = require('assert'),
    Parser = require('../lib/parser');

describe('PDF parser', function () {

    describe('Basic types', function () {

        describe('String', function () {

            it('should throw a malformed string value', function () {
                assert.throws(function () {
                    parse('malformed literal string)').getString();
                }, 'Should not accept a malformed literal string');
            });

            it('should not accept an empty literal string value', function () {
                assert.throws(function () {
                    parse('()').getString();
                }, 'Should not accept an empty literal string');
            });

            it('should parse a literal string value', function () {
                var
                    str = 'this test should pass';

                var result = parse('(' + str + ')').getString();
                assert.strictEqual(typeof result, 'string', 'Invalid literal string value');
                assert.strictEqual(result, str, 'String "' + result + '" should equal "' + str + '"');
            });

            it('should parse a literal string value with embedded parenthesis', function () {
                var
                    str = 'this test should (also) pass';

                var result = parse('(' + str + ')').getString();
                assert.strictEqual(typeof result, 'string', 'Invalid literal string value');
                assert.strictEqual(result, str, 'String "' + result + '" should equal "' + str + '"');
            });

            it('should parse a literal string value with escaped parenthesis', function () {
                var
                    str = 'this test should also\\) pass';

                var result = parse('(' + str + ')').getString();
                assert.strictEqual(typeof result, 'string', 'Invalid literal string value');
                assert.strictEqual(result, str, 'String "' + result + '" should equal "' + str + '"');
            });

            it('should parse a literal string value with an embedded octal', function () {
                var
                    str = 'this test should p\\141ss';

                var result = parse('(' + str + ')').getString();
                assert.strictEqual(typeof result, 'string', 'Invalid literal string value');
                assert.strictEqual(result, str, 'String "' + result + '" should equal "' + str + '"');
            });

            it('should parse a literal string value with an embedded escaped MacOS newline', function () {
                var
                    str = 'this test should\\\rpass';

                var result = parse('(' + str + ')').getString();
                assert.strictEqual(typeof result, 'string', 'Invalid literal string value');
                assert.strictEqual(result, str, 'String "' + result + '" should equal "' + str + '"');
            });

            it('should parse a literal string value with an embedded escaped Windows newline', function () {
                var
                    str = 'this test should\\\r\npass';

                var result = parse('(' + str + ')').getString();
                assert.strictEqual(typeof result, 'string', 'Invalid literal string value');
                assert.strictEqual(result, str, 'String "' + result + '" should equal "' + str + '"');
            });

            it('should parse an hexadecimal string value', function () {
                var
                    str = '012',
                    hex = '303132';

                var result = parse('<' + hex + '>').getString();
                assert.strictEqual(typeof result, 'string', 'Invalid hexadecimal string value');
                assert.strictEqual(result, str, 'String "' + result + '" should equal "' + str + '"');
            });

            it('should accept an empty hexadecimal string value', function () {
                var result = parse('<>').getString();
                assert.strictEqual(typeof result, 'string', 'Invalid hexadecimal string value');
                assert.strictEqual(result, '', 'String "' + result + '" should be empty');
            });

            it('should parse an hexadecimal string value with embedded white spaces', function () {
                var
                    str = '012',
                    hex = '3 031 32';

                var result = parse('<' + hex + '>').getString();
                assert.strictEqual(typeof result, 'string', 'Invalid hexadecimal string value');
                assert.strictEqual(result, str, 'String "' + result + '" should equal "' + str + '"');
            });

            it('should parse an odd length hexadecimal string value', function () {
                var
                    str = '0120',
                    hex = '3031323';

                var result = parse('<' + hex + '>').getString();
                assert.strictEqual(typeof result, 'string', 'Invalid hexadecimal string value');
                assert.strictEqual(result, str, 'String "' + result + '" should equal "' + str + '"');
            });
        });
    });

    function parse(script) {
        return new Parser(new Buffer(script));
    }

});

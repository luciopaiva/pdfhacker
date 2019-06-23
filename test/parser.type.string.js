
const
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
                const str = 'this test should pass';
                const result = parse('(' + str + ')').getString();
                assert.strictEqual(typeof result, 'string', 'Invalid literal string value');
                assert.strictEqual(result, str, 'String "' + result + '" should equal "' + str + '"');
            });

            it('should parse a literal string value with embedded parenthesis', function () {
                const str = 'this test should (also) pass';
                const result = parse('(' + str + ')').getString();
                assert.strictEqual(typeof result, 'string', 'Invalid literal string value');
                assert.strictEqual(result, str, 'String "' + result + '" should equal "' + str + '"');
            });

            it('should parse a literal string value with escaped parenthesis', function () {
                const str = 'this test should also\\) pass';
                const result = parse('(' + str + ')').getString();
                assert.strictEqual(typeof result, 'string', 'Invalid literal string value');
                assert.strictEqual(result, str, 'String "' + result + '" should equal "' + str + '"');
            });

            it('should parse a literal string value with an embedded octal', function () {
                const str = 'this test should p\\141ss';
                const result = parse('(' + str + ')').getString();
                assert.strictEqual(typeof result, 'string', 'Invalid literal string value');
                assert.strictEqual(result, str, 'String "' + result + '" should equal "' + str + '"');
            });

            it('should parse a literal string value with an embedded escaped MacOS newline', function () {
                const str = 'this test should\\\rpass';
                const result = parse('(' + str + ')').getString();
                assert.strictEqual(typeof result, 'string', 'Invalid literal string value');
                assert.strictEqual(result, str, 'String "' + result + '" should equal "' + str + '"');
            });

            it('should parse a literal string value with an embedded escaped Windows newline', function () {
                const str = 'this test should\\\r\npass';
                const result = parse('(' + str + ')').getString();
                assert.strictEqual(typeof result, 'string', 'Invalid literal string value');
                assert.strictEqual(result, str, 'String "' + result + '" should equal "' + str + '"');
            });

            it('should parse an hexadecimal string value', function () {
                const
                    str = '012',
                    hex = '303132';

                const result = parse('<' + hex + '>').getString();
                assert.strictEqual(typeof result, 'string', 'Invalid hexadecimal string value');
                assert.strictEqual(result, str, 'String "' + result + '" should equal "' + str + '"');
            });

            it('should accept an empty hexadecimal string value', function () {
                const result = parse('<>').getString();
                assert.strictEqual(typeof result, 'string', 'Invalid hexadecimal string value');
                assert.strictEqual(result, '', 'String "' + result + '" should be empty');
            });

            it('should parse an hexadecimal string value with embedded white spaces', function () {
                const
                    str = '012',
                    hex = '3 031 32';

                const result = parse('<' + hex + '>').getString();
                assert.strictEqual(typeof result, 'string', 'Invalid hexadecimal string value');
                assert.strictEqual(result, str, 'String "' + result + '" should equal "' + str + '"');
            });

            it('should parse an odd length hexadecimal string value', function () {
                const
                    str = '0120',
                    hex = '3031323';

                const result = parse('<' + hex + '>').getString();
                assert.strictEqual(typeof result, 'string', 'Invalid hexadecimal string value');
                assert.strictEqual(result, str, 'String "' + result + '" should equal "' + str + '"');
            });
        });
    });

    function parse(script) {
        return new Parser(Buffer.from(script, "utf-8"));
    }

});

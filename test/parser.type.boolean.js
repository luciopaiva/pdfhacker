
var
    assert = require('assert'),
    Parser = require('../lib/parser');

describe('PDF parser', function () {

    describe('Basic types', function () {

        describe('Boolean', function () {

            it('should parse boolean true value', function () {

                var result = parse('true').getBoolean();
                assert.strictEqual(typeof result, 'boolean', 'Invalid boolean value');
                assert.strictEqual(result, true, 'Boolean should be true');
            });

            it('should parse boolean false value', function () {

                var result = parse('false').getBoolean();
                assert.strictEqual(typeof result, 'boolean', 'Invalid boolean value');
                assert.strictEqual(result, false, 'Boolean should be false');
            });
        });
    });

    function parse(script) {
        return new Parser(Buffer.from(script, "utf-8"));
    }

});

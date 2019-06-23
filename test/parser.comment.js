
const
    assert = require('assert'),
    Parser = require('../lib/parser');

describe('PDF parser', function () {

    describe('Comments', function () {

        it('should parse a comment line', function () {
            const
                str = 'this is a comment',
                result = parse('%' + str).getComment();

            assert.strictEqual(result, str, 'Comment string "' + result + '" should be "' + str + '"');
        });

        it('should reject a malformed comment line', function () {

            assert.throws(function () {
                parse('! some invalid comment').getComment();
            }, 'Should not accept an invalid comment line');
        });
    });

    function parse(script) {
        return new Parser(Buffer.from(script, "utf-8"));
    }
});

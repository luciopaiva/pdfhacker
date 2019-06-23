
const
    assert = require('assert'),
    IndirectObject = require('../lib/objects/indobjref'),
    Parser = require('../lib/parser');

describe('PDF parser', function () {

    describe('PDF features', function () {

        describe('Trailer', function () {

            it('should reject a malformed trailer', function () {
                assert.throws(function () {
                    parse('').getTrailer(0);
                }, 'Should reject a malformed trailer');
            });

            it('should correctly parse an empty trailer', function () {
                const result = parse('trailer\n<<>>').getTrailer(0);

                assert.strictEqual(typeof result, 'object',
                    'Trailer should have been parsed correctly');
            });

            it('should correctly find the root node reference', function () {
                const result = parse('trailer\n<</Size 19/Root 17 0 R>>').getTrailer(0);

                assert(result.Root instanceof IndirectObject,
                    'Root node should be of type IndirectObjectReference, but was "' + typeof result.Root + '"');
            });
        });
    });

    function parse(script) {
        return new Parser(Buffer.from(script, "utf-8"));
    }
});

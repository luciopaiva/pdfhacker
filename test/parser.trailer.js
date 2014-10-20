"use strict";

var
    assert = require('assert'),
    Parser = require('../lib/parser');

describe('PDF parser', function () {

    describe('PDF features', function () {

        describe('Trailer', function () {

            it('should reject a malformed trailer', function () {
                assert.throws(function () {
                    parse('').getTrailer(0);
                }, 'Should reject a malformed trailer');
            });

            it('should correctly parse a trailer', function () {
                var
                    result = parse('trailer\n<<>>').getTrailer(0);

                assert.strictEqual(typeof result, 'object', 'Trailer should have been parsed correctly');

            });
        });
    });

    function parse(script) {
        return new Parser(new Buffer(script));
    }

});

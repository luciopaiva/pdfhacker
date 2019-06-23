"use strict";

var
    assert = require('assert'),
    Parser = require('../lib/parser');

describe('PDF parser', function () {

    describe('Basic types', function () {

        describe('Indirect Object Reference', function () {

            it('should parse an indirect object reference', function () {
                var result = parse('2 1 R').getIndirectObjectRef();

                assert.strictEqual(result.id, 2, 'Indirect object reference ID should be 2');
                assert.strictEqual(result.rev, 1, 'Indirect object reference revision should be 1');
            });
        });
    });

    function parse(script) {
        return new Parser(Buffer.from(script, "utf-8"));
    }

});

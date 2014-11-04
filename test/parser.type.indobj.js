"use strict";

var
    assert = require('assert'),
    IndirectObject = require('../lib/objects/indobj'),
    Parser = require('../lib/parser');

describe('PDF parser', function () {

    describe('Basic types', function () {

        describe('Indirect Object', function () {

            it('should parse an indirect object', function () {
                var result = parse('1 0 obj\n<</Length 3>>\nstream\n123\nendstream\nendobj').readIndirectObject(0);
                assert(result instanceof IndirectObject, 'Invalid indirect object');
            });

            it('should reject a malformed indirect object (no "obj" delimiter)', function () {
                assert.throws(function () {
                    parse('1 0 \n<</Length 3>>\nstream\n123\nendstream\nendobj').readIndirectObject(0);
                });
            });

            it('should reject a malformed indirect object (no "endobj" delimiter)', function () {
                assert.throws(function () {
                    parse('1 0 obj\n<</Length 3>>\nstream\n123\nendstream\n').readIndirectObject(0);
                });
            });
        });
    });

    function parse(script) {
        return new Parser(new Buffer(script));
    }

});

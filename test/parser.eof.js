"use strict";

var
    assert = require('assert'),
    Parser = require('../lib/parser');

describe('PDF parser', function () {

    describe('End of file checks', function () {

        it('should throw if next() reaches EOF', function () {

            assert.throws(function () {
                parse('').next();
            }, 'next() should have thrown');
        });

        it('should throw if forward() reaches EOF', function () {

            assert.throws(function () {
                parse('').forward(2);
            }, 'forward() should have thrown');
        });

        it('should throw if getChar() reaches EOF', function () {

            assert.throws(function () {
                parse('').getChar();
            }, 'getChar() should have thrown');
        });

        it('should skip newlines when asked to', function () {
            var
                parser = parse('\n');

            parser.skipNewLine();

            assert.strictEqual(parser.position, 1, 'Did not skip newline');
        });

        it('should be able to move to a specific file position', function () {
            var
                parser = parse('\n\n\n\n\n\n');

            parser.moveTo(5);

            assert.strictEqual(parser.position, 5, 'Did not move as expected');
        });

        it('should not move beyond EOF', function () {

            assert.throws(function () {
                parse('\n\n\n\n\n\n').moveTo(6);
            }, 'moveTo() should have thrown');
        });

    });

    function parse(script) {
        return new Parser(Buffer.from(script, "utf-8"));
    }

});

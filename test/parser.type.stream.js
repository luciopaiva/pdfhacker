"use strict";

var
    assert = require('assert'),
    Parser = require('../lib/parser');

describe('PDF parser', function () {

    describe('Basic types', function () {

        describe('Stream', function () {

            it('should parse a stream value', function () {
                var result = parse('<</Length 10>>\nstream\n1234567890\nendstream\n').getStream();
                assert.strictEqual(result.dict.Length, 10, 'Stream dictionary should have a property Length with value 10');
            });

            it('should parse a stream value with Windows newline', function () {
                var result = parse('<</Length 10>>\r\nstream\r\n1234567890\r\nendstream\r\n').getStream();
                assert.strictEqual(result.dict.Length, 10, 'Stream dictionary should have a property Length with value 10');
            });

            it('should parse a stream value with MacOS newline', function () {
                var result = parse('<</Length 10>>\rstream\r1234567890\rendstream\r').getStream();
                assert.strictEqual(result.dict.Length, 10, 'Stream dictionary should have a property Length with value 10');
            });

            it('should throw a malformed stream value', function () {
                assert.throws(function () {
                    parse('<</Length 10>>\n1234567890\nendstream\n').getStream();
                }, 'Should not accept a malformed stream value');
            });

            it('should throw another malformed stream value', function () {
                assert.throws(function () {
                    parse('<</Length 10>>\nstream\n1234567890').getStream();
                }, 'Should not accept a malformed stream value');
            });
        });
    });

    function parse(script) {
        return new Parser(new Buffer(script));
    }

});

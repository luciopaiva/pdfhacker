"use strict";

var
    assert = require('assert'),
    Parser = require('../lib/parser');

describe('PDF parser', function () {

    describe('PDF features', function () {

        describe('Version', function () {

            it('should successfully read a PDF\'s version', function () {
                var
                    result = parse('%PDF-1.6\n').getVersion();

                assert.strictEqual(result.major, 1, 'Major version should be 1');
                assert.strictEqual(result.minor, 6, 'Minor version should be 1');
            });

            it('should reject a malformed version', function () {

                assert.throws(function () {
                    parse('%PDF 1.6\n').getVersion();
                }, 'Should reject a malformed version');
            });
        });
    });

    function parse(script) {
        return new Parser(Buffer.from(script, "utf-8"));
    }

});

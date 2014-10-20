"use strict";

var
    assert = require('assert'),
    Parser = require('../lib/parser');

describe('PDF parser', function () {

    describe('Basic types', function () {

        describe('Misc', function () {

            it('should not accept an invalid value', function () {

                assert.throws(function () {
                    parse('!garbage').getValue();
                }, 'Should not accept an invalid value');
            });
        });
    });

    function parse(script) {
        return new Parser(new Buffer(script));
    }

});

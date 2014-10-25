"use strict";

var
    assert = require('assert'),
    DictionaryObject = require('../lib/objects/dictionary'),
    CatalogObject = require('../lib/objects/catalog'),
    docbuilder = require('../lib/docbuilder');

describe('Document structure', function () {
    var
        pdfFilename = 'test/assets/test.pdf',
        doc;

    describe('Basic structure', function () {

        before(function () {
            doc = docbuilder(pdfFilename);
        });

        it('should have a dictionary of object entries', function () {
            var
                expectedLength = 19,
                keys = Object.keys(doc.xref);

            assert.strictEqual(keys.length, expectedLength, 'Dictionary length does not match (' + keys.length + ', should be ' + expectedLength + ')');

            keys.forEach(function (key) {
                assert.strictEqual(typeof doc.xref[key].position, 'number', 'dict[' + key + '].position is not valid');
                assert.strictEqual(typeof doc.xref[key].revision, 'number', 'dict[' + key + '].revision is not valid');
                assert.strictEqual(typeof doc.xref[key].isInUse, 'boolean', 'dict[' + key + '].isInUse is not valid');
            });
        });

        it('should find the document\'s catalog', function () {

            assert(doc.catalog instanceof DictionaryObject, 'Catalog object type was expected, but found "' + Object.prototype.toString.call(doc.catalog) + '")');
        });
    });
});

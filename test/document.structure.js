"use strict";

var
    assert = require('assert'),
    DictionaryObject = require('../lib/objects/dictionary'),
    CatalogObject = require('../lib/objects/catalog'),
    docbuilder = require('../lib/docbuilder');

describe('Document structure', function () {
    var
        filePrefix = 'test/assets/',
        testFiles = {
            'test.pdf': {
                xrefLength: 19,
                pageCount: 1
            },
            '3_pages.pdf': {
                xrefLength: 20,
                pageCount: 3
            },
            'collier.pdf': {
                xrefLength: 634,
                pageCount: 161
            }
        };

    Object.keys(testFiles).forEach(function (filename) {
        var
            cur = testFiles[filename],
            doc;

        describe('Basic structure (' + filename + ')', function () {

            before(function () {
                doc = docbuilder(filePrefix + filename);
            });

            it('should read a valid cross reference table', function () {
                var
                    expectedLength = cur.xrefLength,
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

            it('should find all pages', function () {

                assert.strictEqual(doc.pages.length, cur.pageCount, 'Wrong number of pages read (' + doc.pages.length + ', should be ' + cur.pageCount + ')');
            });
        });
    });
});

"use strict";

var
    pdfhacker = require('../pdfhacker'),
    assert = require('assert');

describe('pdfhacker', function () {
    var
        invalidPdfFilename = 'test/assets/test.odt',
        validPdfFilename = 'test/assets/test.pdf',
        pdf;

    describe('Basic PDF validation', function () {

        it('should indicate a non-PDF file as invalid', function () {

            assert.throws(loadPdf, 'File was mistakenly recognized as a valid PDF');

            function loadPdf() {
                return pdfhacker(invalidPdfFilename);
            }
        });

        it('should open a valid PDF file', function () {

            assert.doesNotThrow(loadPdf, "File wasn't understood as a valid PDF");

            function loadPdf() {
                pdf = pdfhacker(validPdfFilename);
            }
        });

        it('should read a valid PDF filename', function () {

            assert.strictEqual(typeof pdf.filename, 'string', 'Filename is not valid');

            assert(pdf.filename, validPdfFilename);
        });

        it('should read a valid PDF version', function () {

            assert.strictEqual(typeof pdf.version.major, 'number', 'Version major is not valid');
            assert.strictEqual(typeof pdf.version.minor, 'number', 'Version minor is not valid');

            assert.strictEqual(pdf.version.major, 1, 'Version major does not match');
            assert.strictEqual(pdf.version.minor, 4, 'Version minor does not match');
        });
    });

    describe('Cross reference table', function () {

        it('should read a valid xref start position', function () {
            var
                expectedPosition = 13555;

            assert.strictEqual(typeof pdf.xref.position, 'number', 'startxref is not valid');
            assert.strictEqual(pdf.xref.position, expectedPosition, 'startxref does not match');
        });

        it('should correctly parse the xref table', function () {
            var
                expectedCount = 19;

            assert.strictEqual(pdf.xref.objects.length, expectedCount, 'Objects found: ' + pdf.xref.objects.length + ', should be ' + expectedCount);
        });

        it('should find a trailer section', function () {

            assert.strictEqual(typeof pdf.trailer, 'object', 'Trailer section is not valid (type "' + typeof pdf.trailer + '")');
        });
    });

});

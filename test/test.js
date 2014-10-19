"use strict";

var
    util = require('util'),
    assert = require('assert'),
    pdfhacker = require('../pdfhacker'),
    Parser = require('../lib/parser');

describe('PDF parser', function () {

    describe('Sanity checks', function () {

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

        it('should move beyond EOF', function () {

            assert.throws(function () {
                parse('\n\n\n\n\n\n').moveTo(6);
            }, 'moveTo() should have thrown');
        });

    });

    describe('Basic types', function () {

        describe('Boolean', function () {

            it('should parse boolean true value', function () {

                var result = parse('true').getBoolean();
                assert.strictEqual(typeof result, 'boolean', 'Invalid boolean value');
                assert.strictEqual(result, true, 'Boolean should be true');
            });

            it('should parse boolean false value', function () {

                var result = parse('false').getBoolean();
                assert.strictEqual(typeof result, 'boolean', 'Invalid boolean value');
                assert.strictEqual(result, false, 'Boolean should be false');
            });
        });

        describe('Number', function () {

            it('should parse an integer value', function () {

                var result = parse('42').getNumber();
                assert.strictEqual(typeof result, 'number', 'Invalid integer value');
                assert.strictEqual(result, 42, 'Number should be 42');
            });

            it('should parse a real value', function () {

                var result = parse('4.2').getNumber();
                assert.strictEqual(typeof result, 'number', 'Invalid real value');
                assert.strictEqual(result, 4.2, 'Number should be 4.2');
            });

            it('should parse a real value with a missing integer part', function () {

                var result = parse('.2').getNumber();
                assert.strictEqual(typeof result, 'number', 'Invalid real value');
                assert.strictEqual(result, 0.2, 'Number should be 0.2');
            });
        });

        describe('String', function () {

            it('should throw a malformed string value', function () {
                assert.throws(function () {
                    parse('malformed literal string)').getString();
                }, 'Should not accept a malformed literal string');
            });

            it('should accept an empty literal string value', function () {
                var result = parse('()').getString();
                assert.strictEqual(typeof result, 'string', 'Invalid literal string value');
                assert.strictEqual(result, '', 'String "' + result + '" should be empty');
            });

            it('should parse a literal string value', function () {
                var
                    str = 'this test should pass';

                var result = parse('(' + str + ')').getString();
                assert.strictEqual(typeof result, 'string', 'Invalid literal string value');
                assert.strictEqual(result, str, 'String "' + result + '" should equal "' + str + '"');
            });

            it('should parse a literal string value with embedded parenthesis', function () {
                var
                    str = 'this test should (also) pass';

                var result = parse('(' + str + ')').getString();
                assert.strictEqual(typeof result, 'string', 'Invalid literal string value');
                assert.strictEqual(result, str, 'String "' + result + '" should equal "' + str + '"');
            });

            it('should parse a literal string value with escaped parenthesis', function () {
                var
                    str = 'this test should also\\) pass';

                var result = parse('(' + str + ')').getString();
                assert.strictEqual(typeof result, 'string', 'Invalid literal string value');
                assert.strictEqual(result, str, 'String "' + result + '" should equal "' + str + '"');
            });

            it('should parse a literal string value with an embedded octal', function () {
                var
                    str = 'this test should p\\141ss';

                var result = parse('(' + str + ')').getString();
                assert.strictEqual(typeof result, 'string', 'Invalid literal string value');
                assert.strictEqual(result, str, 'String "' + result + '" should equal "' + str + '"');
            });

            it('should parse a literal string value with an embedded escaped MacOS newline', function () {
                var
                    str = 'this test should\\\rpass';

                var result = parse('(' + str + ')').getString();
                assert.strictEqual(typeof result, 'string', 'Invalid literal string value');
                assert.strictEqual(result, str, 'String "' + result + '" should equal "' + str + '"');
            });

            it('should parse a literal string value with an embedded escaped Windows newline', function () {
                var
                    str = 'this test should\\\r\npass';

                var result = parse('(' + str + ')').getString();
                assert.strictEqual(typeof result, 'string', 'Invalid literal string value');
                assert.strictEqual(result, str, 'String "' + result + '" should equal "' + str + '"');
            });

            it('should parse an hexadecimal string value', function () {
                var
                    str = '012',
                    hex = '303132';

                var result = parse('<' + hex + '>').getString();
                assert.strictEqual(typeof result, 'string', 'Invalid hexadecimal string value');
                assert.strictEqual(result, str, 'String "' + result + '" should equal "' + str + '"');
            });

            it('should accept an empty hexadecimal string value', function () {
                var result = parse('<>').getString();
                assert.strictEqual(typeof result, 'string', 'Invalid hexadecimal string value');
                assert.strictEqual(result, '', 'String "' + result + '" should be empty');
            });

            it('should parse an hexadecimal string value with embedded white spaces', function () {
                var
                    str = '012',
                    hex = '3 031 32';

                var result = parse('<' + hex + '>').getString();
                assert.strictEqual(typeof result, 'string', 'Invalid hexadecimal string value');
                assert.strictEqual(result, str, 'String "' + result + '" should equal "' + str + '"');
            });

            it('should parse an odd length hexadecimal string value', function () {
                var
                    str = '0120',
                    hex = '3031323';

                var result = parse('<' + hex + '>').getString();
                assert.strictEqual(typeof result, 'string', 'Invalid hexadecimal string value');
                assert.strictEqual(result, str, 'String "' + result + '" should equal "' + str + '"');
            });
        });

        describe('Name', function () {

            it('should parse a name value', function () {
                var
                    name = 'Testing';

                var result = parse('/' + name).getName();
                assert.strictEqual(typeof result, 'string', 'Invalid name value');
                assert.strictEqual(result, name, 'Name "' + result + '" should be "' + name + '"');
            });

        });

        describe('Array', function () {

            it('should parse an empty array value', function () {
                var result = parse('[]').getArray();
                assert.strictEqual(result.length, 0, 'Array length should be zero');
            });

            it('should parse an empty array value with embedded spaces', function () {
                var result = parse('[   ]').getArray();
                assert.strictEqual(result.length, 0, 'Array length should be zero');
            });

            it('should parse an array of integers value', function () {
                var result = parse('[ 1 2 3 ]').getArray();
                assert.strictEqual(result.length, 3, 'Array length should be 3');
                assert.strictEqual(result[0], 1, 'Value at position 0 should be 1');
                assert.strictEqual(result[1], 2, 'Value at position 1 should be 2');
                assert.strictEqual(result[2], 3, 'Value at position 2 should be 3');
            });

            it('should parse a mixed array value', function () {
                var result = parse('[ 1 /Test (Testing embedded string) ]').getArray();
                assert.strictEqual(result.length, 3, 'Array length should be 3');
                assert.strictEqual(result[0], 1, 'Value at position 0 should be 1');
                assert.strictEqual(result[1], 'Test', 'Value at position 1 should be "Test"');
                assert.strictEqual(result[2], 'Testing embedded string', 'Value at position 2 should be "Testing embedded string"');
            });
        });

        describe('Dictionary', function () {

            it('should parse a dictionary value', function () {
                var result = parse('<</This/Test/Should/Pass>>').getDictionary();
                assert.strictEqual(result.This, 'Test', 'dict.This should be "Test"');
                assert.strictEqual(result.Should, 'Pass', 'dict.Should should be "Pass"');
            });

            it('should reject a malformed dictionary value', function () {
                assert.throws(function () {
                    parse('<</This/Test/Should/NotPass').getDictionary();
                }, 'Should reject a malformed dictionary value');
            });

            it('should parse a dictionary value with an embedded dictionary', function () {
                var result = parse('<< /inner <</value 42>> >>').getDictionary();
                assert.strictEqual(result.inner.value, 42, 'dict.inner.value should equal 42');
            });

            it('should parse a dictionary value referencing all types of objects', function () {
                var
                    stream = '<</Length 3>>\nstream\n123\nendstream\n',
                    result = parse('<</bool true/number 1/string(my test)/name/aName/array[1 2 3]/dict<</value 42>>/NULL null/stream ' +
                        stream + '/indobjref 4 0 R/hexstr <>>>').getDictionary();
                assert.strictEqual(result.bool, true, 'dict.bool should be true');
                assert.strictEqual(result.number, 1, 'dict.number should be 1');
                assert.strictEqual(result.string, 'my test', 'dict.string should be "my test"');
                assert.strictEqual(result.name, 'aName', 'dict.name should be aName');
                assert.deepEqual(result.array, [1, 2, 3], 'dict.array should be [1, 2, 3]');
                assert.strictEqual(result.dict.value, 42, 'dict.dict.value should be 42');
                assert.strictEqual(result.NULL, null, 'dict.hexstr should be ""');
                assert.strictEqual(result.stream.dict.Length, 3, 'dict.stream.dict.Length should be 3');
                assert.strictEqual(result.indobjref.id, 4, 'dict.indobjref.id should be 4');
                assert.strictEqual(result.indobjref.rev, 0, 'dict.indobjref.id should be 0');
                assert.strictEqual(result.hexstr, '', 'dict.hexstr should be ""');
            });
        });

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

        describe('Null', function () {

            it('should parse a null value', function () {
                var result = parse('null').getNull();
                assert.strictEqual(result, null, 'Value should be null');
            });
        });

        describe('Indirect Object Reference', function () {

            it('should parse an indirect object reference', function () {
                var result = parse('2 1 R').getIndirectObjectRef();

                assert.strictEqual(result.id, 2, 'Indirect object reference ID should be 2');
                assert.strictEqual(result.rev, 1, 'Indirect object reference revision should be 1');
            });
        });

        describe('Misc', function () {

            it('should not accept an invalid value', function () {

                assert.throws(function () {
                    parse('!garbage').getValue();
                }, 'Should not accept an invalid value');
            });
        });
    });

    describe('PDF features', function () {

        describe('Comments', function () {

            it('should parse a comment line', function () {
                var
                    str = 'this is a comment',
                    result = parse('%' + str).getComment();

                assert.strictEqual(result, str, 'Comment string "' + result + '" should be "' + str + '"');
            });

            it('should reject a malformed comment line', function () {

                assert.throws(function () {
                    parse('! some invalid comment').getComment();
                }, 'Should not accept an invalid comment line');
            });
        });

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

        describe('Cross Reference Table', function () {

            it('should be able to find an xref table', function () {
                var
                    script = 'startxref\n100\n%%EOF\n',
                    result = parse(script).findXRef();

                assert.strictEqual(result.startXRefPos, 0, "Wasn't able to find the 'startxref' directive");
                assert.strictEqual(result.xRefPos, 100, "Wasn't able to find the xref table");
            });

            it('should throw if startxref is not present', function () {
                assert.throws(function () {
                    parse('').findXRef();
                }, 'Should reject a malformed xref table');
            });

            it('should reject a malformed xref table', function () {
                assert.throws(function () {
                    parse('').readXRef(0);
                }, 'Should reject a malformed xref table');
            });

            it('should read an empty xref table', function () {
                var
                    script = 'xref\ntrailer\n',
                    result = parse(script).readXRef(0);

                assert.strictEqual(result.sections.length, 0, 'Should not have any sections');
            });

            it('should reject a malformed xref table', function () {
                var
                    script = 'xref\n0 3\ntrailer\n';

                assert.throws(function () {
                    parse(script).readXRef(0);
                }, 'Should reject a malformed xref table');
            });

            it('should correctly parse a single section xref table', function () {
                var
                    script = 'xref\n0 3\n0000000000 65535 f \n0000013041 00000 n \n0000000019 00001 n \n',
                    result = parse(script).readXRef(0);

                assert.strictEqual(result.sections.length, 1, 'Wrong number of sections found');
                assert.deepEqual(result.sections[0]['0'], { position: 0, revision: 65535, isInUse: false }, 'First object is wrong');
                assert.deepEqual(result.sections[0]['1'], { position: 13041, revision: 0, isInUse: true }, 'Second object is wrong');
                assert.deepEqual(result.sections[0]['2'], { position: 19, revision: 1, isInUse: true }, 'Thrid object is wrong');
                assert.deepEqual(result.trailerPosition, script.length, 'Trailer position should be ' + script.length);
            });
        });

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
});

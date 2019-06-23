
const
    assert = require('assert'),
    Parser = require('../lib/parser');

describe('PDF parser', function () {

    describe('PDF features', function () {

        describe('Cross Reference Table', function () {

            it('should be able to find an xref table', function () {
                const
                    script = 'startxref\n100\n%%EOF\n',
                    result = parse(script).findXRef();

                assert.strictEqual(result.startXRefPos, 0,
                    "Wasn't able to find the 'startxref' directive");
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
                const
                    script = 'xref\ntrailer\n',
                    result = parse(script).readXRef(0);

                assert.strictEqual(result.sections.length, 0, 'Should not have any sections');
            });

            it('should reject a malformed xref table', function () {
                const
                    script = 'xref\n0 3\ntrailer\n';

                assert.throws(function () {
                    parse(script).readXRef(0);
                }, 'Should reject a malformed xref table');
            });

            it('should correctly parse a single section xref table', function () {
                const
                    script = 'xref\n0 3\n0000000000 65535 f \n0000013041 00000 n \n0000000019 00001 n \n',
                    result = parse(script).readXRef(0);

                assert.strictEqual(result.sections.length, 1, 'Wrong number of sections found');
                assert.deepStrictEqual(result.sections[0]['0'], { position: 0, revision: 65535, isInUse: false },
                    'First object is wrong');
                assert.deepStrictEqual(result.sections[0]['1'], { position: 13041, revision: 0, isInUse: true },
                    'Second object is wrong');
                assert.deepStrictEqual(result.sections[0]['2'], { position: 19, revision: 1, isInUse: true },
                    'Thrid object is wrong');
                assert.deepStrictEqual(result.trailerPosition, script.length,
                    'Trailer position should be ' + script.length);
            });
        });
    });

    function parse(script) {
        return new Parser(Buffer.from(script, "utf-8"));
    }

});

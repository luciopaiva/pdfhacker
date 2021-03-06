
const
    assert = require('assert'),
    streamParser = require('../lib/streamparser'),
    docbuilder = require('../lib/docbuilder');

const
    filePrefix = 'test/assets/',
    testFile = 'test.pdf';

describe('Stream parser', function () {

    describe('General', function () {

        it('should be able to parse a simple stream content', function () {
            const
                content = "0.1 w q 0 0.1 595.2 841.8 re W* n q 0 0 0 rg BT 219.2 747.9 Td /F1 28 " +
                    "Tf[<01>-1<02>1<0304>-1<05>1<060708090A>]TJ ET Q q 0 0 0 rg BT 56.8 710.6 Td /F2 12 " +
                    "Tf[<01>2<0203>2<04>-2<0503>2<04>-2<0506>1<0507>2<08>1<04>-2<07>2<050903>2<0A>2<08>1<0B>]" +
                    "TJ ET Q Q ",
                program = streamParser(content);

            //console.dir(program);

            assert.strictEqual(program.length, 22, 'Should have found 22 instructions');
        });

        it('should accept valid operands', function () {
            const
                content = 'true null /name [1 2] (test) 42 <</Length 0>> BT',
                program = streamParser(content);

            assert.strictEqual(program[0].operands.length, 7, 'Operand count does not match (' +
                program[0].operands.length + ', should be 7)');
        });

        it('should reject an unknown operator', function () {
            const
                content = 'foo';

            assert.throws(function () {
                streamParser(content);
            }, 'should reject an unknown operator');
        });

        it('should be able to parse a simple page content in a PDF file', function () {
            const
                doc = docbuilder(filePrefix + testFile);

            assert.strictEqual(doc.pages[0].contents.length, 22, 'Should have found 22 instructions');
        });
    });
});

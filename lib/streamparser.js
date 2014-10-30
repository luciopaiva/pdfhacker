
var
    PdfParser = require('./parser');

module.exports = function parseStream(buffer) {
    var
        value,
        operands = [],
        program = [],
        parser = new PdfParser(buffer);

    while (!parser.eof()) {

        parser.skipWhite();

        if (parser.eof()) {
            break;
        }

        value = parser.tryOperand();

        if (value.success) {

            operands.push(value.result);

        } else {

            value = parser.tryOperator();

            if (value.success) {

                program.push({
                    operator: value.result,
                    operands: operands
                });

                operands = [];
            } else {

                throw new Error('Invalid token at "' + parser.peekRawString(10) + '"');
            }
        }
    }

    return program;
};

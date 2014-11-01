"use strict";

var
    DictionaryObject = require('./objects/dictionary'),
    IndirectObjectReference = require('./objects/indobjref'),
    IndirectObject = require('./objects/indobj'),
    PdfStreamObject = require('./stream');

var
    PDF_MAGIC = /PDF-(\d+)\.(\d+)/,
    STARTXREF = /startxref[\r\n]+(\d+)/,
    WHITE_CHARS = [0x00, 0x09, 0x0A, 0x0C, 0x0D, 0x20],
    NEWLINE = [0x0A, 0x0D],
    DELIMITER_CHARS = ['(', ')', '<', '>', '[', ']', '{', '}', '/', '%'].map(function (c) {
        return c.charCodeAt(0);
    }),
    IRREGULAR_CHARS = WHITE_CHARS.concat(NEWLINE).concat(DELIMITER_CHARS),
    // all valid stream operators, as of PDF reference v1.7
    OPERATORS = ['b', 'B', 'b*', 'B*', 'BDC', 'BI', 'BMC', 'BT', 'BX', 'c', 'cm', 'CS', 'cs', 'd', 'd0', 'd1', 'Do',
        'DP', 'EI', 'EMC', 'ET', 'EX', 'f', 'F', 'f*', 'G', 'g', 'gs', 'h', 'i', 'ID', 'j', 'J', 'K', 'k', 'l', 'm',
        'M', 'MP', 'n', 'q', 'Q', 're', 'RG', 'rg', 'ri', 's', 'S', 'SC', 'sc', 'SCN', 'scn', 'sh', 'T*', 'Tc', 'Td',
        'TD', 'Tf', 'Tj', 'TJ', 'TL', 'Tm', 'Tr', 'Ts', 'Tw', 'Tz', 'v', 'w', 'W', 'W*', 'y', '\'', '"']
        .sort(function desc(a, b) { return a.length < b.length ? 1 : -1; }),
    MAX_OPERATOR_LENGTH = OPERATORS[0].length;

exports = module.exports = PdfParser;

function PdfParser(buffer) {

    if (typeof(buffer) === 'string') {
        buffer = new Buffer(buffer);
    }

    this.content = buffer;
    this.reset();

}

PdfParser.prototype = {

    eof: function () {
        return this.position >= this.content.length;
    },

    next: function () {
        if (this.position + 1 <= this.content.length) {
            return ++this.position;
        } else {
            throw new Error('next() reached EOF');
        }
    },

    forward: function (hop) {
        if (this.position + hop <= this.content.length) {
            this.position += hop;
        } else {
            throw new Error('forward() reached EOF');
        }
    },

    reset: function () {
        this.position = 0;
    },

    /**
     * Return the character currently pointed to by this.position.
     *
     * @returns {string}
     */
    curChar: function() {
        return String.fromCharCode(this.content[this.position]);
    },

    /**
     * Consume and return a character.
     *
     * @returns {string}
     */
    getChar: function () {
        if (this.position < this.content.length) {
            var
                c = String.fromCharCode(this.content[this.position]);
            this.next();
            return c;
        } else {
            throw new Error('getChar() reached EOF');
        }
    },

    /**
     * Consume white spaces.
     */
    skipWhite: function () {
        while(!this.eof() && WHITE_CHARS.indexOf(this.curChar().charCodeAt(0)) !== -1) {
            this.next();
        }
    },

    /**
     * Consume newlines.
     */
    skipNewLine: function () {
        while(!this.eof() && NEWLINE.indexOf(this.curChar().charCodeAt(0)) !== -1) {
            this.next();
        }
    },

    /**
     * Move file caret position.
     *
     * @param newPosition
     */
    moveTo: function (newPosition) {

        if (newPosition < this.content.length) {
            this.position = newPosition;
        } else {
            throw new Error('New position exceeds buffer length!');
        }
    },

    peekRawString: function (length) {
        return this.content.toString('utf-8', this.position, this.position + length);
    },

    getRawString: function (length) {
        var
            result = this.peekRawString(length);
        this.position += result.length;
        return result;
    },

    /**
     * Consume a number and any whitespaces that comes before it.
     *
     * @returns {number}
     */
    getNumber: function () {
        var
            tempStr,
            result,
            tempResult,
            floatRe = /^[+-]?\d*\.\d+/,
            intRe = /^[+-]?\d+/;

        tempStr = this.peekRawString(256);
        tempResult = floatRe.exec(tempStr);

        if (tempResult) {

            result = parseFloat(tempResult[0]);
        } else {

            tempResult = intRe.exec(tempStr);

            if (tempResult) {

                result = parseInt(tempResult[0], 10);

            } else {

                throw Error('Invalid number: ' + tempStr.substr(0, 20));
            }
        }

        this.forward(tempResult[0].length);

        return result;
    },

    /**
     * Consume a name.
     *
     * @returns {string}
     */
    getName: function () {
        var
            delim,
            initialPosition;

        delim = this.getChar();

        if (delim !== '/') {
            throw Error('Character "' + delim + ' should be a "/" near "' + this.content.toString('utf-8', this.position-1, this.position+20) + '""');
        }

        initialPosition = this.position;

        while(!this.eof() && IRREGULAR_CHARS.indexOf(this.curChar().charCodeAt(0)) === -1) {
            this.next();
        }

        return this.content.toString('utf-8', initialPosition, this.position);
    },

    getBoolean: function () {
        var
            temp = this.peekRawString(5);

        if (temp.substr(0, 5) === 'false') {
            this.forward(5);
            return false;
        } else if (temp.substr(0, 4) === 'true') {
            this.forward(4);
            return true;
        } else {
            throw new Error('Invalid boolean type "' + temp + '"');
        }
    },

    getLiteralString: function () {
        var
            escapeNext = false,
            balance = 1,
            endString = false,
            initialPosition,
            c;

        c = this.getChar();

        // sanity check disabled because getString() always checks it first
//        if (c !== '(') {
//            throw new Error('Invalid literal string open delimiter "' + c + '"');
//        }

        initialPosition = this.position;

        do {

            c = this.getChar();

            // if last char was a escape char
            if (escapeNext) {

                if (c.charCodeAt(0) === 0x0D) {
                    // found a \r\n newline, check if it really has \n following and consume it too
                    if (this.content[this.position] === 0x0A) {
                        this.next();
                    }
                } else if ('0123456789'.indexOf(c) !== -1) {
                    // found an octal \ddd, so consume two more chars
                    this.getRawString(2);
                }

                // if c was 0x0A or anything else, it should be already consumed with the first getChar(), so just continue
                escapeNext = false;
                continue;
            }

            switch(c) {
                case '\\':
                    escapeNext = true;
                    break;
                case '(':
                    balance++;
                    break;
                case ')':
                    balance--;
                    if (balance === 0) {
                        endString = true;
                    }
                    break;
            }

        } while (!this.eof() && !endString);

        return this.content.toString('utf-8', initialPosition, this.position-1);
    },

    getHexadecimalString: function () {
        var
            result = '',
            pendingChar = '',
            isOdd = false,
            c;

        c = this.getChar();

        // sanity check disabled because getString() always checks it first
//        if (c !== '<') {
//            throw new Error('Invalid hexadecimal string open delimiter "' + c + '"');
//        }

        do {
            c = this.getChar();

            if (c === '>') {

                if (isOdd) {

                    // from the docs: if it ends with an odd number of chars, append a trailing zero
                    pendingChar += '0';
                    result += convertChar();
                }

                break;

            } else if ('0123456789ABCDEFabcdef'.indexOf(c) !== -1) {

                if (isOdd) {

                    pendingChar += c;
                    result += convertChar();
                    isOdd = false;

                } else {

                    pendingChar = c;
                    isOdd = true;
                }

            } else if (WHITE_CHARS.indexOf(c.charCodeAt(0)) !== -1) {

                // ignore and continue to next char

            } else {

                // strict mode: throw if find extraneous char
                throw new Error('Invalid hexadecimal string character "' + c + '"');
            }

        } while (!this.eof());

        return result;

        function convertChar() {
            return String.fromCharCode(parseInt(pendingChar, 16));
        }
    },

    getString: function () {

        if (this.curChar() === '(') {

            // try literal string
            return this.getLiteralString();

        } else if (this.curChar() == '<') {

            // try hex string
            return this.getHexadecimalString();

        } else {
            throw new Error('Invalid string');
        }
    },

    getArray: function () {
        var
            result = [];

        // sanity check
        if (this.curChar() !== '[') {
            throw new Error('Invalid array open delimiter "' + this.curChar() + '"');
        }

        // consume open delimiter
        this.getChar();

        this.skipWhite();

        while (!this.eof() && (this.curChar() !== ']')) {

            result.push(this.getValue());
            this.skipWhite();
        }

        // consume close delimiter
        this.getChar();

        return result;
    },

    getStream: function (xref) {
        var
            result,
            delim,
            curPosition,
            content,
            dict;

        dict = this.getDictionary();

        if (dict.Length instanceof IndirectObjectReference) {

            curPosition = this.position;

            // if Length is not a number, it must be an indirect object reference
            dict.Length = this.readIndirectObject(xref[dict.Length.id].position, xref).data;

            this.position = curPosition;

        } else if (typeof dict.Length != 'number') {

            throw new Error('Invalid stream dictionary: "Length" field missing');
        }

        this.skipWhite();

        delim = this.getRawString('stream'.length);

        if (delim !== 'stream') {
            throw new Error('Invalid stream open delimiter "' + delim + '"');
        }

        if (this.content[this.position] === 0x0D) {
            this.next();
        }

        if (this.content[this.position] === 0x0A) {
            this.next();
        }

        content = this.content.slice(this.position, this.position + dict.Length);

        result = new PdfStreamObject(dict, content);

        this.forward(dict.Length);

        this.skipWhite();

        delim = this.getRawString('endstream'.length);

        if (delim !== 'endstream') {
            throw new Error('Invalid stream close delimiter "' + delim + '"');
        }

        return result;
    },

    getNull: function () {
        var
            directive = this.getRawString('null'.length);

        if (directive !== 'null') {
            throw new Error('invalid null directive "' + directive + '"');
        }

        return null;
    },

    getIndirectObjectRef: function () {
        var
            objId, objRev, keyword;

        objId = this.getNumber();
        this.skipWhite();
        objRev = this.getNumber();
        this.skipWhite();
        keyword = this.getChar();

        if (keyword !== 'R') {
            throw new Error('Invalid indirect object reference keyword "' + keyword + '"');
        }

        return new IndirectObjectReference(objId, objRev);
    },

    readIndirectObject: function (position, xref) {
        var
            objId, objRev, delim, data, value;

        this.position = position;

        this.skipWhite();
        objId = this.getNumber();
        this.skipWhite();
        objRev = this.getNumber();
        this.skipWhite();

        delim = this.getRawString('obj'.length);

        if (delim !== 'obj') {
            throw new Error('Invalid indirect object definition open delimiter "' + delim + '"');
        }

        this.skipWhite();

        // try to read a stream first
        value = this.tryStream(xref);

        if (value.success) {
            data = value.result;
        } else {
            // otherwise try other types
            data = this.getValue();
        }

        this.skipWhite();
        delim = this.getRawString('endobj'.length);

        if (delim !== 'endobj') {
            throw new Error('Invalid indirect object definition close delimiter "' + delim + '"');
        }

        return new IndirectObject(objId, objRev, data);
    },

    tryValue: function (parserFunction) {
        var
            initialPosition = this.position,
            success,
            result;

        try {
            result = parserFunction();
            success = true;
        } catch (e) {
            success = false;
            this.position = initialPosition;
        }

        return {
            success: success,
            result: result
        };
    },

    tryBoolean: function () {
        return this.tryValue(this.getBoolean.bind(this));
    },

    tryNumber: function () {
        return this.tryValue(this.getNumber.bind(this));
    },

    tryString: function () {
        return this.tryValue(this.getString.bind(this));
    },

    tryName: function () {
        return this.tryValue(this.getName.bind(this));
    },

    tryArray: function () {
        return this.tryValue(this.getArray.bind(this));
    },

    tryStream: function (xref) {
        return this.tryValue(this.getStream.bind(this, xref));
    },

    tryDictionary: function () {
        return this.tryValue(this.getDictionary.bind(this));
    },

    tryNull: function () {
        return this.tryValue(this.getNull.bind(this));
    },

    tryIndirectObjectRef: function () {
        return this.tryValue(this.getIndirectObjectRef.bind(this));
    },

    tryOperand: function () {
        return this.tryValue(this.getOperand.bind(this));
    },

    tryOperator: function () {
        return this.tryValue(this.getOperator.bind(this));
    },

    getOperator: function () {
        var
            self = this,
            result = null,
            peek,
            subs = {};

        peek = this.peekRawString(MAX_OPERATOR_LENGTH);

        while (peek.length > 0) {

            subs[peek.length] = peek;
            peek = peek.substr(0, peek.length-1);
        }

        OPERATORS.some(function (operator) {

            if (subs[operator.length] && (operator === subs[operator.length])) {

                result = operator;
                self.forward(operator.length);
                return true;
            }

            return false;
        });

        if (!result) {
            throw new Error('Unable to find a valid operator at #' + this.position + '. "' + peek + '" did not match any known operator.');
        }

        return result;
    },

    getOperand: function () {
        var
            value;

        // boolean
        value = this.tryBoolean();
        if (value.success) {
            return value.result;
        }

        // null
        value = this.tryNull();
        if (value.success) {
            return value.result;
        }

        // name
        value = this.tryName();
        if (value.success) {
            return value.result;
        }

        // array
        value = this.tryArray();
        if (value.success) {
            return value.result;
        }

        // string
        value = this.tryString();
        if (value.success) {
            return value.result;
        }

        // number
        value = this.tryNumber();
        if (value.success) {
            return value.result;
        }

        // dictionary
        value = this.tryDictionary();
        if (value.success) {
            return value.result;
        }

        throw new Error('Could not find a valid operand at stream position #' + this.position + ' ("' + this.content.toString('utf-8', this.position, this.position + 20) + ' ...")');
    },

    getValue: function () {
        var
            value;

        // boolean
        value = this.tryBoolean();
        if (value.success) {
            return value.result;
        }

        // null
        value = this.tryNull();
        if (value.success) {
            return value.result;
        }

        // name
        value = this.tryName();
        if (value.success) {
            return value.result;
        }

        // array
        value = this.tryArray();
        if (value.success) {
            return value.result;
        }

        // string
        value = this.tryString();
        if (value.success) {
            return value.result;
        }

        // indirect object - must come before number!
        value = this.tryIndirectObjectRef();
        if (value.success) {
            return value.result;
        }

        // number
        value = this.tryNumber();
        if (value.success) {
            return value.result;
        }

        // dictionary
        value = this.tryDictionary();
        if (value.success) {
            return value.result;
        }

        throw new Error('Could not find a valid value at file position #' + this.position + ' ("' + this.content.toString('utf-8', this.position, this.position + 20) + ' ...")');
    },

    getDictionary: function () {
        var
            name,
            dict = new DictionaryObject(),
            delim;

        delim = this.getRawString(2);
        if (delim !== '<<') {
            throw Error('Invalid dictionary open delimiter "' + delim + '"');
        }

        this.skipWhite();

        while (!this.eof() && (this.peekRawString(2) !== '>>')) {

            name = this.getName();

            this.skipWhite();

            dict[name] = this.getValue();

            this.skipWhite();
        }

        if (this.eof()) {
            throw new Error('Dictionary has no closing delimiter');
        }

        // consume closing delimiter
        this.getRawString(2);

        return dict;
    },

    getXRefEntry: function () {
        var
            entry = {};

        /*
         In-use entry
         ------------

         nnnnnnnnnn ggggg n (\r\n|\s\n)

         * nnnnnnnnnn is a 10-digit byte offset
         * ggggg is a 5-digit generation number
         * n is a literal keyword identifying this as an in-use entry

         Free entry
         ----------

         nnnnnnnnnn ggggg f (\r\n|\s\n)

         * nnnnnnnnnn is the 10-digit object number of the next free object
         * ggggg is a 5-digit generation number
         * f is a literal keyword identifying this as a free entry

         */

        entry.position = this.getNumber();
        this.skipWhite();
        entry.revision = this.getNumber();
        this.skipWhite();
        entry.isInUse = this.getChar() === 'n';

        return entry;
    },

    getXRefSectionHeader: function () {
        var
            objIndex,
            count;

        objIndex = this.getNumber();
        this.skipWhite();
        count = this.getNumber();
        this.skipWhite();

        return {
            objIndex: objIndex,
            count: count
        };
    },

    getXRefSectionBody: function (objIndex, count) {
        var
            i,
            objects = {};

        // collect object info
        for (i = 0; (i < count) && !this.eof(); i++) {
            objects[objIndex++] = this.getXRefEntry();
            this.skipWhite();
        }

        return objects;
    },

    tryGetXRefSectionHeader: function () {
        return this.tryValue(this.getXRefSectionHeader.bind(this));
    },

    readXRef: function (position) {
        var
            delim,
            value,
            sections = [];

        this.position = position;

        // consume 'xref' and do a sanity check
        delim = this.getRawString('xref'.length);

        if (delim !== 'xref') {
            throw new Error('Invalid xref directive "' + delim + '"');
        }

        this.skipWhite();

        // parse xref sections
        do {
            value = this.tryGetXRefSectionHeader();
            if (value.success) {
                sections.push(this.getXRefSectionBody(value.result.objIndex, value.result.count));
            } else {
                break;
            }
        } while (!this.eof());

        // move caret to trailer
        this.skipWhite();

        return {
            sections: sections,
            trailerPosition: this.position
        };
    },

    getTrailer: function (position) {
        var
            delim;

        this.position = position;

        delim = this.getRawString('trailer'.length);

        if (delim !== 'trailer') {
            throw new Error('Invalid trailer delimiter "' + delim + '"');
        }

        this.skipWhite();

        return this.getDictionary();
    },

    /**
     * Find the cross reference table and read its position in the file.
     */
    findXRef: function () {
        var
            LIMIT = Math.min(50, this.content.length),
            substr,
            match,
            curPos = this.content.length - 1;

        do {
            substr = this.content.toString('utf-8', curPos);
            match = substr.match(STARTXREF);

            if (match && match[1]) {
                // this is the xref's table position from the beginning of the file
                return {
                    startXRefPos: curPos,
                    xRefPos: parseInt(match[1], 10)
                };
            }

            curPos--;

            if (this.content.length - curPos > LIMIT) {
                throw new Error('Could not find startxref - not a valid PDF');
            }
        } while (true);
    },

    /**
     * Check for a valid PDF header and get its version.
     */
//    checkSignature: function () {
//        var
//            signature,
//            match,
//            LIMIT = 20,
//            i = 0;
//
//        while (NEWLINE.indexOf(this.content[i++]) === -1) {
//
//            if (i > LIMIT) {
//                this.content = null;
//                throw new Error('Could not find a valid PDF signature');
//            }
//        }
//
//        signature = this.content.toString('utf-8', 0, --i);
//        match = signature.match(PDF_MAGIC);
//
//        if (match && match[1] && match[2]) {
//            this.version = {
//                major: parseInt(match[1], 10),
//                minor: parseInt(match[2], 10)
//            };
//        } else {
//            throw new Error('Could not find a valid PDF signature');
//        }
//    },

    getComment: function () {
        var
            initialPosition,
            delim;

        delim = this.getChar();

        if (delim !== '%') {
            throw new Error('Invalid comment delimiter "' + delim + '"');
        }

        initialPosition = this.position;

        while (!this.eof() && NEWLINE.indexOf(this.curChar().charCodeAt(0)) === -1) {
            this.next();
        }

        return this.content.toString('utf-8', initialPosition, this.position);
    },

    getVersion: function () {
        var
            match,
            versionStr;

        this.skipWhite();

        versionStr = this.getComment();

        match = versionStr.match(PDF_MAGIC);

        if (match && match[1] && match[2]) {
            return {
                major: parseInt(match[1], 10),
                minor: parseInt(match[2], 10)
            };
        } else {
            throw new Error('Invalid PDF signature "' + versionStr + '"');
        }
    }
};

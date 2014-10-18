"use strict";

var
    fs = require('fs');

var
    PDF_MAGIC = /%PDF-(\d+)\.(\d+)/,
    STARTXREF = /startxref[\r\n]+(\d+)/,
    WHITE_CHARS = [0x00, 0x09, 0x0A, 0x0C, 0x0D, 0x20],
    NEWLINE = [0x0A, 0x0D],
    DELIMITER_CHARS = ['(', ')', '<', '>', '[', ']', '{', '}', '/', '%'].map(function (c) {
        return c.charCodeAt(0);
    }),
    IRREGULAR_CHARS = WHITE_CHARS.concat(NEWLINE).concat(DELIMITER_CHARS);

module.exports = openPdf;

/**
 * Factory function to create new PDF objects
 *
 * @param filename
 * @returns {object}
 */
function openPdf(filename) {
    var
        pdf = new Pdf(filename);

    return {
        filename: pdf.filename,
        objects: pdf.objects,
        xref: pdf.xref,
        trailer: pdf.trailer,
        version: pdf.version
    };
}

/**
 * Indirect object
 *
 * @param id
 * @param rev
 * @constructor
 */
function IndirectObject(id, rev) {
    this.id = id;
    this.rev = rev;
}

/**
 * Stream object
 *
 * @param dict
 * @param buffer
 * @constructor
 */
function StreamObject(dict, buffer) {
    this.dict = dict;
    this.buffer = buffer;
}

/**
 * Pdf
 *
 * Holds an instance of an open PDF file
 *
 * @param filename
 * @constructor
 */
function Pdf(filename) {

    this.filename = filename;
    this.content = fs.readFileSync(filename);
    this.position = 0;

    this.version = {
        major: -1,
        minor: -1
    };

    this.xref = {
        position: -1,
        objects: [],
        trailer: null
    };

    this.checkSignature();
    this.findXRef();
    this.readXRef();
}

Pdf.prototype = {

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
        return String.fromCharCode(this.content[this.position++]);
    },

    /**
     * Consume white spaces.
     */
    skipWhite: function () {
        while(WHITE_CHARS.indexOf(this.curChar().charCodeAt(0)) !== -1) {
            this.position++;
        }
    },

    /**
     * Consume newlines.
     */
    skipNewLine: function () {
        while(NEWLINE.indexOf(this.curChar().charCodeAt(0)) !== -1) {
            this.position++;
        }
    },

//    readText: function () {
//        var
//            initialPos = this.position;
//
//        while(WHITE_CHARS.indexOf(this.curChar()) === -1) {
//            this.position++;
//        }
//
//        return
//    },

    /**
     * Get a line of text, consuming EOL in the process.
     *
     * @returns {string}
     */
    getTextLine: function () {
        var
            initialPosition = this.position,
            finalPosition;

        while(NEWLINE.indexOf(this.curChar().charCodeAt(0)) === -1) {
            this.position++;
        }

        finalPosition = this.position;

        this.skipNewLine();

        return this.content.toString('utf-8', initialPosition, finalPosition);
    },

    /**
     * Move file caret position.
     *
     * @param newPosition
     */
    moveTo: function (newPosition) {
        this.position = newPosition;
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

        this.skipWhite();

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

        this.position += tempResult[0].length;

        return result;
    },

    /**
     * Consume a name.
     *
     * @returns {string}
     */
    getName: function () {
        var
            initialPosition;

        if (this.getChar() !== '/') {
            throw Error('invalid name (does not start with "/")');
        }

        initialPosition = this.position;

        while(IRREGULAR_CHARS.indexOf(this.curChar().charCodeAt(0)) === -1) {
            this.position++;
        }

        return this.content.toString('utf-8', initialPosition, this.position);
    },

    getBoolean: function () {
        var
            temp = this.getRawString(5);

        if (temp.substr(0, 5) === 'false') {
            return false;
        } else if (temp.substr(0, 4) === 'true') {
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

        // sanity check
        if (c !== '(') {
            throw new Error('Invalid literal string open delimiter "' + c + '"');
        }

        initialPosition = this.position;

        do {

            c = this.getChar();

            // if last char was a escape char
            if (escapeNext) {

                if (c.charCodeAt(0) === 0x0D) {
                    // found a \r\n newline, check if it really has \n following and consume it too
                    if (this.content[this.position] === 0x0A) {
                        this.position++;
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

        } while (!endString);

        return this.content.toString('utf-8', initialPosition, this.position);
    },

    getHexadecimalString: function () {
        var
            result = '',
            pendingChar = '',
            isOdd = false,
            c;

        c = this.getChar();

        if (c !== '<') {
            throw new Error('Invalid hexadecimal string open delimiter "' + c + '"');
        }

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

        } while (true);

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

        while (this.curChar() !== ']') {

            result.push(this.getValue());
            this.skipWhite();
        }

        // consume close delimiter
        this.getChar();

        return result;
    },

    getStream: function () {
        var
            result,
            delim,
            dict;

        dict = this.getDictionary();

        if (typeof dict.Length != 'number') {
            throw new Error('Invalid stream dictionary: "Length" field missing');
        }

        this.skipWhite();

        delim = this.getRawString('stream'.length);

        if (delim !== 'stream') {
            throw new Error('Invalid stream open delimiter "' + delim + '"');
        }

        if (this.content[this.position] === 0x0D) {
            this.position++;
        }

        if (this.content[this.position] === 0x0A) {
            this.position++;
        }

        result = new StreamObject(dict, this.content.slice(this.position, dict.Length));

        this.position += dict.Length;

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

        return new IndirectObject(objId, objRev);
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

    tryStream: function () {
        return this.tryValue(this.getStream.bind(this));
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

        // stream - must come before dictionary!
        value = this.tryStream();
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
            dict = {},
            delim;

        delim = this.getRawString(2);
        if (delim !== '<<') {
            throw Error('Invalid dictionary open delimiter "' + delim + '"');
        }

        this.skipWhite();

        while (this.peekRawString(2) !== '>>') {

            name = this.getName();

            this.skipWhite();

            dict[name] = this.getValue();

            this.skipWhite();
        }

        delim = this.getRawString(2);
        // sanity check
        if (delim !== '>>') {
            throw Error('Invalid dictionary close delimiter "' + delim + '"');
        }

        return dict;
    },

    readXRef: function () {
        var
            newObj;

        this.findXRef();

        this.moveTo(this.xref.position);

        this.xref.objects = [];

        // consume 'xref' and do a sanity check
        if (this.getTextLine() !== 'xref') {
            throw new Error('xref is not where it was supposed to be');
        }

        // index of the first object in the section
        this.getNumber();

        // number of objects in the section
        this.getNumber();

        this.skipWhite();

        // objects list
        while(this.peekRawString('trailer'.length) !== 'trailer') {

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

            newObj = {};
            newObj.position = this.getNumber();
            newObj.revision = this.getNumber();

            this.skipWhite();

            newObj.isInUse = this.getChar() === 'n';

            this.xref.objects.push(newObj);

            this.skipWhite();
        }

        this.parseTrailer();
    },

    parseTrailer: function () {

        this.getRawString('trailer'.length);

        this.skipWhite();

        this.trailer = this.getDictionary();
    },

    /**
     * Find the cross reference table and read its position in the file.
     */
    findXRef: function () {
        var
            LIMIT = 50,
            substr,
            match,
            i = this.content.length - 1;

        do {
            substr = this.content.toString('utf-8', i);
            match = substr.match(STARTXREF);

            if (match && match[1]) {
                // this is the xref's table position from the beginning of the file
                this.xref.position = parseInt(match[1], 10);
                break;
            }

            i--;

            if (this.content.length - i > LIMIT) {
                throw new Error('Could not find startxref - not a valid PDF');
            }
        } while (true);
    },

    /**
     * Check for a valid PDF header and get its version.
     */
    checkSignature: function () {
        var
            signature,
            match,
            LIMIT = 20,
            i = 0;

        while (NEWLINE.indexOf(this.content[i++]) === -1) {

            if (i > LIMIT) {
                this.content = null;
                throw new Error('Could not find a valid PDF signature');
            }
        }

        signature = this.content.toString('utf-8', 0, --i);
        match = signature.match(PDF_MAGIC);

        if (match && match[1] && match[2]) {
            this.version = {
                major: parseInt(match[1], 10),
                minor: parseInt(match[2], 10)
            };
        } else {
            throw new Error('Could not find a valid PDF signature');
        }
    }
};

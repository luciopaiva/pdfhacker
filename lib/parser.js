
const
    willie = require('willie'),
    DictionaryObject = require('./objects/dictionary'),
    IndirectObjectReference = require('./objects/indobjref'),
    IndirectObject = require('./objects/indobj'),
    PdfStreamObject = require('./stream');

const
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


class PdfParser {
    
    constructor (buffer) {
        if (typeof(buffer) === 'string') {
            buffer = Buffer.from(buffer, "utf-8");
        }

        this.content = buffer;
        this.reset();
    }

    eof() {
        return this.position >= this.content.length;
    }

    next() {
        if (this.position + 1 <= this.content.length) {
            return ++this.position;
        } else {
            const err = 'next() reached EOF';
            willie.error(err);
            throw new Error(err);
        }
    }

    forward(hop) {
        if (this.position + hop <= this.content.length) {
            this.position += hop;
        } else {
            const err = 'forward() reached EOF';
            willie.error(err);
            throw new Error(err);
        }
    }

    reset() {
        this.position = 0;
    }

    /**
     * Return the character currently pointed to by this.position.
     *
     * @returns {string}
     */
    curChar() {
        return String.fromCharCode(this.content[this.position]);
    }

    /**
     * Consume and return a character.
     *
     * @returns {string}
     */
    getChar() {
        if (this.position < this.content.length) {
            const c = String.fromCharCode(this.content[this.position]);
            this.next();
            return c;

        } else {
            const err = 'getChar() reached EOF';
            willie.error(err);
            throw new Error(err);
        }
    }

    /**
     * Consume white spaces.
     */
    skipWhite() {
        while(!this.eof() && WHITE_CHARS.indexOf(this.curChar().charCodeAt(0)) !== -1) {
            this.next();
        }
    }

    /**
     * Consume newlines.
     */
    skipNewLine() {
        while(!this.eof() && NEWLINE.indexOf(this.curChar().charCodeAt(0)) !== -1) {
            this.next();
        }
    }

    /**
     * Move file caret position.
     *
     * @param newPosition
     */
    moveTo(newPosition) {
        if (newPosition < this.content.length) {
            this.position = newPosition;
        } else {
            const err = 'New position exceeds buffer length!';
            willie.error(err);
            throw new Error(err);
        }
    }

    peekRawString(length) {
        return this.content.toString('utf-8', this.position, this.position + length);
    }

    getRawString(length) {
        const result = this.peekRawString(length);
        this.position += result.length;
        return result;
    }

    /**
     * Consume a number and any whitespaces that comes before it.
     *
     * @returns {number}
     */
    getNumber() {
        const
            floatRe = /^[+-]?\d*\.\d+/,
            intRe = /^[+-]?\d+/;
        let
            result,
            tempResult;

        const tempStr = this.peekRawString(256);
        tempResult = floatRe.exec(tempStr);

        if (tempResult) {

            result = parseFloat(tempResult[0]);

        } else {

            tempResult = intRe.exec(tempStr);

            if (tempResult) {
                result = parseInt(tempResult[0], 10);
            } else {
                const err = 'FAIL number: Invalid number at #' + this.position;
                willie.error(err);
                throw Error(err);
            }
        }

        this.forward(tempResult[0].length);

        return result;
    }

    /**
     * Consume a name.
     *
     * @returns {string}
     */
    getName() {
        const delim = this.getChar();

        if (delim !== '/') {
            const err = 'FAIL name: Character "' + delim + '" should be a "/" at #' + (this.position-1);
            willie.error(err);
            throw Error(err);
        }

        const initialPosition = this.position;

        while(!this.eof() && IRREGULAR_CHARS.indexOf(this.curChar().charCodeAt(0)) === -1) {
            this.next();
        }

        return this.content.toString('utf-8', initialPosition, this.position);
    }

    getBoolean() {
        const temp = this.peekRawString(5);

        if (temp.substr(0, 5) === 'false') {
            this.forward(5);
            return false;
        } else if (temp.substr(0, 4) === 'true') {
            this.forward(4);
            return true;
        } else {
            const err = 'FAIL boolean: Invalid boolean type at #' + this.position;
            willie.error(err);
            throw new Error(err);
        }
    }

    getLiteralString() {
        let
            escapeNext = false,
            balance = 1,
            endString = false,
            c;

        c = this.getChar();

        // sanity check disabled because getString() always checks it first
//        if (c !== '(') {
//            throw new Error('Invalid literal string open delimiter "' + c + '"');
//        }

        const initialPosition = this.position;

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

        const finalPosition = this.position - 1;

        if (initialPosition === finalPosition) {
            const err = 'FAIL literal string: Empty literal string';
            willie.error(err);
            throw new Error(err);
        }

        return this.content.toString('utf-8', initialPosition, finalPosition);
    }

    getHexadecimalString() {
        let
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

                const err = 'FAIL hexadecimal string: Invalid hexadecimal string character "' + c + '"';
                willie.error(err);
                // strict mode: throw if find extraneous char
                throw new Error(err);
            }

        } while (!this.eof());

        return result;

        function convertChar() {
            return String.fromCharCode(parseInt(pendingChar, 16));
        }
    }

    getString() {
        if (this.curChar() === '(') {
            // try literal string
            return this.getLiteralString();
        } else if (this.curChar() === '<') {
            // try hex string
            return this.getHexadecimalString();
        } else {
            const err = 'FAIL string: Invalid string at #' + this.position;
            willie.error(err);
            throw new Error(err);
        }
    }

    getArray() {
        const result = [];

        // sanity check
        if (this.curChar() !== '[') {
            const err = 'FAIL array: Invalid array open delimiter "' + this.curChar() + '" at #' + this.position;
            willie.error(err);
            throw new Error(err);
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
    }

    getStream(xref) {
        let delim;

        willie
            .info('Read stream')
            .indent()
            .info('Read stream dictionary');

        const dict = this.getDictionary();

        if (dict.Length instanceof IndirectObjectReference) {

            const curPosition = this.position;

            // if Length is not a number, it must be an indirect object reference
            dict.Length = this.readIndirectObject(xref[dict.Length.id].position, xref).data;

            this.position = curPosition;

        } else if (typeof dict.Length != 'number') {

            const err = 'FAIL stream: Invalid stream dictionary: "Length" field missing';
            willie
                .error(err)
                .dedent();
            throw new Error(err);
        }

        this.skipWhite();

        willie
            .info('Stream dictionary done')
            .info('Read stream body');

        delim = this.getRawString('stream'.length);

        if (delim !== 'stream') {

            const err = 'FAIL stream: Invalid stream open delimiter "' + delim + '"';
            willie
                .error(err)
                .dedent();
            throw new Error(err);
        }

        if (this.content[this.position] === 0x0D) {
            this.next();
        }

        if (this.content[this.position] === 0x0A) {
            this.next();
        }

        const content = this.content.slice(this.position, this.position + dict.Length);

        const result = new PdfStreamObject(dict, content);

        this.forward(dict.Length);

        this.skipWhite();

        delim = this.getRawString('endstream'.length);

        if (delim !== 'endstream') {

            const err = 'FAIL stream: Invalid stream close delimiter "' + delim + '"';
            willie
                .error(err)
                .dedent();
            throw new Error(err);
        }

        willie
            .info('Stream body done')
            .dedent();

        return result;
    }

    getNull() {
        const initialPosition = this.position;
        const directive = this.getRawString('null'.length);

        if (directive !== 'null') {
            const err = 'FAIL null: invalid null directive at #' + initialPosition;
            willie.error(err);
            throw new Error(err);
        }

        return null;
    }

    getIndirectObjectRef() {
        const objId = this.getNumber();
        this.skipWhite();
        const objRev = this.getNumber();
        this.skipWhite();
        const keyword = this.getChar();

        if (keyword !== 'R') {
            const err = 'FAIL indirect object: Invalid indirect object reference keyword "' + keyword + '"';
            willie.error(err);
            throw new Error(err);
        }

        return new IndirectObjectReference(objId, objRev);
    }

    readIndirectObject(position, xref) {
        willie
            .info('Read indirect object')
            .indent();

        this.position = position;

        this.skipWhite();
        const objId = this.getNumber();
        this.skipWhite();
        const objRev = this.getNumber();
        this.skipWhite();

        let delim = this.getRawString('obj'.length);

        if (delim !== 'obj') {
            const err = 'Invalid indirect object definition open delimiter "' + delim + '"';

            willie
                .error(err)
                .dedent();

            throw new Error(err);
        }

        this.skipWhite();

        willie
            .info('Try to read a stream object');

        // try to read a stream first
        const value = this.tryStream(xref);

        let data;
        if (value.success) {
            data = value.result;
        } else {

            willie
                .info('Object is not a stream. Try other types of objects.');

            // otherwise try other types
            data = this.getValue();
        }

        this.skipWhite();
        delim = this.getRawString('endobj'.length);

        if (delim !== 'endobj') {

            const err = 'Invalid indirect object definition close delimiter "' + delim + '"';

            willie
                .error(err)
                .dedent();

            throw new Error(err);
        }

        willie
            .info('Done')
            .dedent();

        return new IndirectObject(objId, objRev, data);
    }

    tryValue(parserFunction) {
        const initialPosition = this.position;
        let success, result;

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
    }

    tryBoolean() {
        return this.tryValue(this.getBoolean.bind(this));
    }

    tryNumber() {
        return this.tryValue(this.getNumber.bind(this));
    }

    tryString() {
        return this.tryValue(this.getString.bind(this));
    }

    tryName() {
        return this.tryValue(this.getName.bind(this));
    }

    tryArray() {
        return this.tryValue(this.getArray.bind(this));
    }

    tryStream(xref) {
        return this.tryValue(this.getStream.bind(this, xref));
    }

    tryDictionary() {
        return this.tryValue(this.getDictionary.bind(this));
    }

    tryNull() {
        return this.tryValue(this.getNull.bind(this));
    }

    tryIndirectObjectRef() {
        return this.tryValue(this.getIndirectObjectRef.bind(this));
    }

    tryOperand() {
        return this.tryValue(this.getOperand.bind(this));
    }

    tryOperator() {
        return this.tryValue(this.getOperator.bind(this));
    }

    getOperator() {
        let result = null;
        let peek;
        const subs = {};

        peek = this.peekRawString(MAX_OPERATOR_LENGTH);

        while (peek.length > 0) {

            subs[peek.length] = peek;
            peek = peek.substr(0, peek.length-1);
        }

        OPERATORS.some(operator => {

            if (subs[operator.length] && (operator === subs[operator.length])) {

                result = operator;
                this.forward(operator.length);
                return true;
            }

            return false;
        });

        if (!result) {
            throw new Error('Unable to find a valid operator at #' + this.position + '. "' + peek + '" did not match any known operator.');
        }

        return result;
    }

    getOperand() {
        let value;

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

        throw new Error('Could not find a valid operand at stream position #' + this.position + ' ("' +
            this.content.toString('utf-8', this.position, this.position + 20) + ' ...")');
    }

    getValue() {
        let value;

        willie
            .info('Get a value at #' + this.position)
            .indent();

        // boolean
        value = this.tryBoolean();
        if (value.success) {
            willie
                .info('HIT boolean')
                .dedent();
            return value.result;
        }

        // null
        value = this.tryNull();
        if (value.success) {
            willie
                .info('HIT null')
                .dedent();
            return value.result;
        }

        // name
        value = this.tryName();
        if (value.success) {
            willie
                .info('HIT name')
                .dedent();
            return value.result;
        }

        // array
        value = this.tryArray();
        if (value.success) {
            willie
                .info('HIT array')
                .dedent();
            return value.result;
        }

        // string
        value = this.tryString();
        if (value.success) {
            willie
                .info('HIT string')
                .dedent();
            return value.result;
        }

        // indirect object - must come before number!
        value = this.tryIndirectObjectRef();
        if (value.success) {
            willie
                .info('HIT indirect object reference')
                .dedent();
            return value.result;
        }

        // number
        value = this.tryNumber();
        if (value.success) {
            willie
                .info('HIT number')
                .dedent();
            return value.result;
        }

        // dictionary
        value = this.tryDictionary();
        if (value.success) {
            willie
                .info('HIT dictionary')
                .dedent();
            return value.result;
        }

        throw new Error('Could not find a valid value at file position #' + this.position + ' ("' +
            this.content.toString('utf-8', this.position, this.position + 20) + ' ...")');
    }

    getDictionary() {
        const dict = new DictionaryObject();

        const delim = this.getRawString(2);
        if (delim !== '<<') {
            const err = 'FAIL dictionary: Invalid dictionary open delimiter "' + delim + '"';
            willie.error(err);
            throw Error(err);
        }

        this.skipWhite();

        while (!this.eof() && (this.peekRawString(2) !== '>>')) {

            const name = this.getName();

            this.skipWhite();

            willie.info('Get value for key "' + name + '"');

            dict[name] = this.getValue();

            this.skipWhite();
        }

        if (this.eof()) {
            const err = 'FAIL dictionary: Dictionary has no closing delimiter';
            willie.error(err);
            throw new Error(err);
        }

        // consume closing delimiter
        this.getRawString(2);

        return dict;
    }

    getXRefEntry() {
        const entry = {};

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

        willie.info('Object at #%d with rev %d', entry.position, entry.revision);

        return entry;
    }

    getXRefSectionHeader() {
        const objIndex = this.getNumber();
        this.skipWhite();
        const count = this.getNumber();
        this.skipWhite();

        return {
            objIndex: objIndex,
            count: count
        };
    }

    getXRefSectionBody(objIndex, count) {
        const objects = {};

        willie.indent();

        // collect object info
        for (let i = 0; (i < count) && !this.eof(); i++) {
            objects[objIndex++] = this.getXRefEntry();
            this.skipWhite();
        }

        willie.dedent();

        return objects;
    }

    tryGetXRefSectionHeader() {
        return this.tryValue(this.getXRefSectionHeader.bind(this));
    }

    readXRef(position) {
        const sections = [];

        this.position = position;

        willie
            .hr()
            .info('Read XREF table')
            .indent();

        // consume 'xref' and do a sanity check
        const delim = this.getRawString('xref'.length);

        if (delim !== 'xref') {
            const err = 'Invalid xref directive "' + delim + '"';
            willie
                .error(err)
                .dedent();
            throw new Error(err);
        }

        this.skipWhite();

        // parse xref sections
        do {
            willie
                .info('Try to find a section')
                .indent();

            const value = this.tryGetXRefSectionHeader();
            if (value.success) {

                willie.info('Found section with %d objects with indexes in the range %d..%d', value.result.count, value.result.objIndex, value.result.objIndex + value.result.count - 1);

                sections.push(this.getXRefSectionBody(value.result.objIndex, value.result.count));
            } else {

                willie.info('No more sections found');
                break;
            }

            willie.dedent();

        } while (!this.eof());

        // move caret to trailer
        this.skipWhite();

        willie
            .dedent()
            .info('XREF done')
            .dedent();

        return {
            sections: sections,
            trailerPosition: this.position
        };
    }

    getTrailer(position) {
        willie
            .hr()
            .info('Read trailer')
            .indent();

        this.position = position;

        const delim = this.getRawString('trailer'.length);

        if (delim !== 'trailer') {
            const err = 'Invalid trailer delimiter "' + delim + '" at #' + position;
            willie
                .error(err)
                .dedent();
            throw new Error(err);
        }

        this.skipWhite();

        willie
            .info('Read trailer dictionary');

        const dict = this.getDictionary();

        willie
            .info('Ok dictionary read')
            .dedent();

        return dict;
    }

    /**
     * Find the cross reference table and read its position in the file.
     */
    findXRef() {
        const LIMIT = Math.min(50, this.content.length);
        let match;
        let curPos = this.content.length - 1;

        willie
            .hr()
            .info('Find XREF table')
            .indent();

        do {
            const substr = this.content.toString('utf-8', curPos);
            match = substr.match(STARTXREF);

            if (match && match[1]) {
                break;
            }

            curPos--;

            if (this.content.length - curPos > LIMIT) {
                const err = 'Could not find startxref - not a valid PDF';
                willie
                    .error(err)
                    .dedent();
                throw new Error(err);
            }
        } while (true);

        willie
            .info('Found XREF table at #%d', curPos)
            .dedent();

        // this is the xref's table position from the beginning of the file
        return {
            startXRefPos: curPos,
            xRefPos: parseInt(match[1], 10)
        };
    }

    /**
     * Check for a valid PDF header and get its version.
     */
//    checkSignature() {
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
//    }

    getComment() {
        const delim = this.getChar();

        if (delim !== '%') {
            throw new Error('Invalid comment delimiter "' + delim + '"');
        }

        const initialPosition = this.position;

        while (!this.eof() && NEWLINE.indexOf(this.curChar().charCodeAt(0)) === -1) {
            this.next();
        }

        return this.content.toString('utf-8', initialPosition, this.position);
    }

    getVersion() {
        willie
            .hr()
            .info('Find PDF version')
            .indent();

        this.skipWhite();

        const versionStr = this.getComment();

        const match = versionStr.match(PDF_MAGIC);

        if (match && match[1] && match[2]) {

            const major = parseInt(match[1], 10);
            const minor = parseInt(match[2], 10);

            willie
                .info('PDF version %d.%d', major, minor)
                .dedent();

            return {
                major: major,
                minor: minor
            };
        } else {
            const err = 'Invalid PDF signature "' + versionStr + '"';
            willie
                .error(err)
                .dedent();
            throw new Error(err);
        }
    }
}

exports = module.exports = PdfParser;

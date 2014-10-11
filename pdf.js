"use strict";

var
    fs = require('fs');

var
    PDF_MAGIC = /%PDF-(\d+)\.(\d+)/,
    STARTXREF = /startxref[\r\n]+(\d+)/,
    NEWLINE = [0x0A, 0x0D];

module.exports = openPdf;

/**
 * Factory function to create new PDF objects
 *
 * @param filename
 * @returns {{close: (function(this:Pdf)), readComment: (function(this:Pdf)), filename: *}}
 */
function openPdf(filename) {
    var
        pdf = new Pdf(filename);

    return {
        filename: pdf.filename,
        objects: pdf.objects,
        startxref: pdf.startxref,
        version: pdf.version
    };
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

    this.checkSignature();
    this.findXRef();
    this.readXRef();
}

Pdf.prototype = {

    readXRef: function () {
        var
            substr = this.content.toString('utf-8', this.startxref),
            line,
            len,
            match,
            re = /(.*?)[\r\n]+/g;

        this.objects = [];

        // xref
        if (getLine() !== 'xref') {
            throw new Error('xref is not where it was supposed to be');
        }

        // <number> <number>
        len = parseInt(getLine().split(' ')[1], 10);

        // objects list
        while ((line = re.exec(substr)) !== null) {

            line = line[1];

            if (line === 'trailer') {
                break;
            }

            match = line.match(/(\d+)\s(\d+)\s([fn])/);

            if (!match || (match.length !== 4)) {
                throw new Error('xref: invalid table entry (' + line + ')');
            } else {
                this.objects.push({
                    position: parseInt(match[1], 10),
                    revision: parseInt(match[2], 10),
                    nf: match[3]
                });
            }
        }

        if (this.objects.length !== len) {
            throw new Error('xref: incorrect number of objects');
        }

        function getLine() {
            var
                result = re.exec(substr);

            return result && result[1];
        }
    },

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
                this.startxref = parseInt(match[1], 10);
                break;
            }

            i--;

            if (this.content.length - i > LIMIT) {
                throw new Error('Could not find startxref - not a valid PDF');
            }
        } while (true);
    },

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

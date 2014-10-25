"use strict";

var
    PdfParser = require('./parser');

module.exports = function (filename) {
    return new Document(filename);
};

function Document(filename) {

    this.filename = filename;
    this.buffer = require('fs').readFileSync(filename);
    this.parser = new PdfParser(this.buffer);

    this.parse();
}

Document.prototype = {

    parse: function () {
        var
            parser = this.parser,
            xRefInfo;

        this.version = parser.getVersion();
        xRefInfo = parser.findXRef();
        this.startXRefPosition = xRefInfo.startXRefPos;
        this.xrefPosition = xRefInfo.xRefPos;
        xRefInfo = parser.readXRef(this.xrefPosition);
        this.trailerPosition = xRefInfo.trailerPosition;
        this.xrefSections = xRefInfo.sections;
        this.trailer = parser.getTrailer(this.trailerPosition);

        this.mergeXRefSections();

//        this.getCatalog();
    },

    /**
     * Iterate over all sections and merge all objects found into one single dictionary.
     */
    mergeXRefSections: function () {
        var
            self = this;

        self.xref = {};

        // for each section found in the cross reference table
        self.xrefSections.forEach(function (section) {
            // for each object referenced in the section
            Object.keys(section).forEach(function (objIdx) {
                self.xref[objIdx] = section[objIdx];
            });
        });
    },

    getObjectByRef: function (parser, pdf, indRef) {

        pdf.xrefSections.forEach(function (section) {
            Object.keys(section).forEach(function (objIdx) {
                if (objIdx === indRef.id) {
                    return parser.readObj(section[objIdx].position);
                }
            });
        });

        return null;
    },

    getCatalog: function () {
        return getObjectByRef(parser, pdf, pdf.trailer.Root);
    }

};

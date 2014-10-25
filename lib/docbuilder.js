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

        // startxref
        xRefInfo = parser.findXRef();
        this.startXRefPosition = xRefInfo.startXRefPos;
        this.xrefPosition = xRefInfo.xRefPos;

        // xref and trailer
        xRefInfo = parser.readXRef(this.xrefPosition);
        this.trailerPosition = xRefInfo.trailerPosition;
        this.xrefSections = xRefInfo.sections;
        this.trailer = parser.getTrailer(this.trailerPosition);

        // compose dictionary of object references
        this.mergeXRefSections();

        // build document tree
        this.getCatalog();
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

    /**
     * Fetch an object by an indirect reference.
     *
     * @param indRef
     * @returns {*}
     */
    getObjectByRef: function (indRef) {
        var
            filePosition = this.xref[indRef.id].position;

        return this.parser.readIndirectObject(filePosition);
    },

    getCatalog: function () {
        this.catalog = this.getObjectByRef(this.trailer.Root);
    }

};

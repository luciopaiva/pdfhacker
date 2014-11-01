"use strict";

var
    IndirectObject = require('./objects/indobj'),
    DictionaryObject = require('./objects/dictionary'),
    Page = require('./objects/page'),
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

        this.getPages();
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

    getAllObjects: function () {
        var
            self = this,
            result = {};

        Object.keys(self.xref).forEach(function (entryKey) {
            var
                position = self.xref[entryKey].position;

            if (position === 0) {
                return;
            }

            result[entryKey] = self.parser.readIndirectObject(position, self.xref).data;
        });

        return result;
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

        return this.parser.readIndirectObject(filePosition, this.xref).data;
    },

    getCatalog: function () {
        var
            catalog;

        catalog = this.getObjectByRef(this.trailer.Root);

        if (!(catalog instanceof DictionaryObject)) {
            throw new Error('Invalid catalog prototype "' + catalog.prototype.toString() + '"');
        }

        if (catalog.Type !== 'Catalog') {
            throw new Error('Invalid catalog object of type "' + catalog.Type + '"');
        }

        this.catalog = catalog;
    },

    getPages: function () {
        var
            self = this,
            curPage,
            openNodes = [];

        openNodes = [self.getObjectByRef(self.catalog.Pages)];

        self.pages = [];

        // while there are nodes to visit
        while (openNodes.length > 0) {

            curPage = openNodes.shift();

            if (curPage.Type === 'Pages') {

                curPage.Kids.forEach(iterSubnodeRef);

            } else if (curPage.Type === 'Page') {

                // insert children at the top of the queue, depth first
                self.pages.push(new Page(curPage, self.getObjectByRef(curPage.Contents)));

            } else {

                throw new Error('Object ' + Object.prototype.toString.call(curPage) + ' is not a valid page node');
            }
        }

        function iterSubnodeRef(subnodeRef) {
            openNodes.push(self.getObjectByRef(subnodeRef));
        }
    }

};

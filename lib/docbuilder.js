"use strict";

var
    IndirectObject = require('./objects/indobj'),
    DictionaryObject = require('./objects/dictionary'),
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
        var
            catalog;

        catalog = this.getObjectByRef(this.trailer.Root);

        if (!(catalog instanceof IndirectObject)) {
            throw new Error('Invalid catalog prototype "' + catalog.prototype.toString() + '"');
        }

        if (!(catalog.data instanceof DictionaryObject)) {
            throw new Error('Invalid catalog prototype "' + catalog.data.prototype.toString() + '"');
        }

        if (catalog.data.Type !== 'Catalog') {
            throw new Error('Invalid catalog object of type "' + catalog.data.Type + '"');
        }

        this.catalog = catalog.data;
    },

    parsePageTree: function (pageRef) {
        var
            fetchedKids = [],
            page = this.getObjectByRef(pageRef);

        if (page.Type === 'Pages') {

            page.Kids.forEach(function (subnodeRef) {
                fetchedKids.push(this.parsePageTree(subnodeRef));
            });
            page.Kids = fetchedKids;

        } else if (page.Type === 'Page') {

            this.pages.push(page);
        }

        return page;
    },

    getPages: function () {
        var
            self = this,
            curPage,
            openNodes = [];

        openNodes = [this.getObjectByRef(this.catalog.Pages).data];

        this.pages = [];

        // while there are nodes to visit
        while (openNodes.length > 0) {

            curPage = openNodes.shift();

            if (curPage.Type === 'Pages') {

                curPage.Kids.forEach(iterSubnodeRef);

            } else if (curPage.Type === 'Page') {

                // insert children at the top of the queue, depth first
                this.pages.unshift(curPage);

            } else {

                throw new Error('Object ' + Object.prototype.toString.call(curPage) + ' is not a valid page node');
            }
        }

//        console.dir(this.pages);

        // TODO should get pages' Contents property now

        function iterSubnodeRef(subnodeRef) {
            openNodes.push(self.getObjectByRef(subnodeRef).data);
        }
    }

};

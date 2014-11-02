"use strict";

var
    willie = require('willie'),
    IndirectObject = require('./objects/indobj'),
    DictionaryObject = require('./objects/dictionary'),
    Page = require('./objects/page'),
    PdfParser = require('./parser');

module.exports = function (filename) {
    return new Document(filename);
};

function Document(filename) {

    willie
        .hr()
        .info('Parser started')
        .profile('parser')
        .indent()
        .info('File "%s"', filename);

    this.filename = filename;
    this.buffer = require('fs').readFileSync(filename);
    this.parser = new PdfParser(this.buffer);

    willie.info('%d bytes read into parser memory', this.buffer.length);

    this.parse();

    willie
        .profile('parser', 'Parser finished')
        .dedent();
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

        willie
            .hr()
            .info('Flattened XREF table sections into one dictionary with %d objects', Object.keys(self.xref).length);
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

            willie
                .hr()
                .info('Read object %d at #%d', entryKey, position)
                .indent();

            result[entryKey] = self.parser.readIndirectObject(position, self.xref).data;

            willie
                .dedent();
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
            indObj,
            filePosition = this.xref[indRef.id].position;

        willie
            .info('Get object %d by ref at #%d', indRef.id, filePosition)
            .indent();

        indObj = this.parser.readIndirectObject(filePosition, this.xref).data;

        willie
            .dedent();

        return indObj;
    },

    getCatalog: function () {
        var
            err,
            catalog;

        willie
            .hr()
            .info('Catalog')
            .indent();

        catalog = this.getObjectByRef(this.trailer.Root);

        if (!(catalog instanceof DictionaryObject)) {

            err = 'Invalid catalog prototype "' + catalog.prototype.toString() + '"';

            willie
                .error(err)
                .dedent();

            throw new Error(err);
        }

        if (catalog.Type !== 'Catalog') {

            err = 'Invalid catalog object of type "' + catalog.Type + '"';

            willie
                .error(err)
                .dedent(err);

            throw new Error();
        }

        willie
            .info('Catalog done')
            .dedent();

        this.catalog = catalog;
    },

    getPages: function () {
        var
            err,
            self = this,
            curPage,
            openNodes = [];

        willie
            .hr()
            .info('Get pages')
            .indent()
            .info('Get page tree root node');

        openNodes = [self.getObjectByRef(self.catalog.Pages)];

        self.pages = [];

        // while there are nodes to visit
        while (openNodes.length > 0) {

            curPage = openNodes.shift();

            if (curPage.Type === 'Pages') {

                willie.info('Found tree node with %d kid(s)', curPage.Kids.length);

                curPage.Kids.forEach(iterSubnodeRef);

            } else if (curPage.Type === 'Page') {

                willie.info('Found page');

                // insert children at the top of the queue, depth first
                self.pages.push(new Page(curPage, self.getObjectByRef(curPage.Contents)));

            } else {

                err = 'Object ' + Object.prototype.toString.call(curPage) + ' is not a valid page node';

                willie
                    .error(err)
                    .dedent();

                throw new Error(err);
            }
        }

        willie
            .info('Done. Pages found: %d', self.pages.length)
            .dedent();

        function iterSubnodeRef(subnodeRef) {
            openNodes.push(self.getObjectByRef(subnodeRef));
        }
    }

};

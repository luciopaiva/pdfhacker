
const
    willie = require('willie'),
    DictionaryObject = require('./objects/dictionary'),
    Page = require('./objects/page'),
    PdfParser = require('./parser');


class Document {

    constructor (filename) {
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

    parse() {
        const parser = this.parser;
        let xRefInfo;

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
    }

    /**
     * Iterate over all sections and merge all objects found into one single dictionary.
     */
    mergeXRefSections() {
        this.xref = {};

        // for each section found in the cross reference table
        this.xrefSections.forEach(section => {
            // for each object referenced in the section
            Object.keys(section).forEach(objIdx => {
                this.xref[objIdx] = section[objIdx];
            });
        });

        willie
            .hr()
            .info('Flattened XREF table sections into one dictionary with %d objects', Object.keys(this.xref).length);
    }

    getAllObjects() {
        const result = {};

        Object.keys(this.xref).forEach(entryKey => {
            const position = this.xref[entryKey].position;

            if (position === 0) {
                return;
            }

            willie
                .hr()
                .info('Read object %d at #%d', entryKey, position)
                .indent();

            result[entryKey] = this.parser.readIndirectObject(position, this.xref).data;

            willie.dedent();
        });

        return result;
    }

    /**
     * Fetch an object by an indirect reference.
     *
     * @param indRef
     * @returns {*}
     */
    getObjectByRef(indRef) {
        const filePosition = this.xref[indRef.id].position;

        willie
            .info('Get object %d by ref at #%d', indRef.id, filePosition)
            .indent();

        const indObj = this.parser.readIndirectObject(filePosition, this.xref).data;

        willie
            .dedent();

        return indObj;
    }

    getCatalog() {
        willie
            .hr()
            .info('Catalog')
            .indent();

        const catalog = this.getObjectByRef(this.trailer.Root);

        if (!(catalog instanceof DictionaryObject)) {
            const err = 'Invalid catalog prototype "' + catalog.prototype.toString() + '"';
            willie
                .error(err)
                .dedent();
            throw new Error(err);
        }

        if (catalog.Type !== 'Catalog') {
            const err = 'Invalid catalog object of type "' + catalog.Type + '"';
            willie
                .error(err)
                .dedent(err);
            throw new Error();
        }

        willie
            .info('Catalog done')
            .dedent();

        this.catalog = catalog;
    }

    getPages() {
        willie
            .hr()
            .info('Get pages')
            .indent()
            .info('Get page tree root node');

        const openNodes = [this.getObjectByRef(this.catalog.Pages)];

        this.pages = [];

        // while there are nodes to visit
        while (openNodes.length > 0) {

            const curPage = openNodes.shift();

            if (curPage.Type === 'Pages') {

                willie.info('Found tree node with %d kid(s)', curPage.Kids.length);

                curPage.Kids.forEach(subNodeRef => openNodes.push(this.getObjectByRef(subNodeRef)));

            } else if (curPage.Type === 'Page') {

                willie.info('Found page');

                // insert children at the top of the queue, depth first
                this.pages.push(new Page(curPage, this.getObjectByRef(curPage.Contents)));

            } else {
                const err = 'Object ' + Object.prototype.toString.call(curPage) + ' is not a valid page node';
                willie
                    .error(err)
                    .dedent();
                throw new Error(err);
            }
        }

        willie
            .info('Done. Pages found: %d', this.pages.length)
            .dedent();
    }
}

module.exports = function buildDocument(filename) {
    return new Document(filename);
};

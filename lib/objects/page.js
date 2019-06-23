
const parseStream = require('../streamparser');

class Page {

    constructor (pageObj, rawContents) {
        this._pageObj = pageObj;
        this._rawContents = rawContents;

        // lazy parsing
        this._contents = null;
    }

    get contents() {

        if (!this._contents) {

            this._contents = parseStream(this._rawContents.contents);
        }

        return this._contents;
    }
}

module.exports = Page;

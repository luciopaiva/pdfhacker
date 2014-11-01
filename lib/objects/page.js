"use strict";

var
    parseStream = require('../streamparser');

function Page(pageObj, rawContents) {

    this._pageObj = pageObj;
    this._rawContents = rawContents;

    // lazy parsing
    this._contents = null;
}

Page.prototype = {

    get contents() {

        if (!this._contents) {

            this._contents = parseStream(this._rawContents.buffer);
        }

        return this._contents;
    }
};

module.exports = Page;

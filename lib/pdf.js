"use strict";

exports = module.exports = Pdf;

/**
 * Pdf
 *
 * Holds an instance of an open PDF file
 *
 * @param document the output from the document builder
 * @constructor
 */
function Pdf(document) {

    return {
        get filename() {
            return document.filename;
        },
        get version() {
            return document.version;
        }
    };
}

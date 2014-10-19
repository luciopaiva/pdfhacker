"use strict";

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
    this.position = 0;

    this.version = {
        major: -1,
        minor: -1
    };

    this.xref = {
        position: -1,
        objects: [],
        trailer: null
    };
}

exports = module.exports = Pdf;

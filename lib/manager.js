"use strict";

var
    Pdf = require('./pdf'),
    docbuilder = require('./docbuilder');

exports = module.exports = openPdf;

/**
 * Factory function to create new PDF objects
 *
 * @param filename
 * @returns {object}
 */
function openPdf(filename) {

    return new Pdf(docbuilder(filename));
}

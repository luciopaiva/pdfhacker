
/**
 * Pdf
 *
 * Holds an instance of an open PDF file
 *
 * @param document the output from the document builder
 * @constructor
 */
class Pdf {

    filename;
    version;

    constructor (document) {
        this.filename = document.filename;
        this.version = document.version;
    }
}

module.exports = Pdf;

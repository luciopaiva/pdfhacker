"use strict";

var
    flateDecode = require('./filters/flatedecode');

/**
 * Stream object
 *
 * @param dict
 * @param contents
 * @constructor
 */
function StreamObject(dict, contents) {

    this.dict = dict;

    if (dict.Filter) {

        switch (dict.Filter) {
            case 'FlateDecode':
                this.contents = flateDecode(contents);
                break;

            case 'ASCIIHexDecode':
            case 'ASCII85Decode':
            case 'LZWDecode':
            case 'RunLengthDecode':
            case 'CCITTFaxDecode':
            case 'JBIG2Decode':
            case 'DCTDecode':
            case 'JPXDecode':
            case 'Crypt':
                // TODO implement each of these filters
                this.contents = '';
                break;

            default:
                throw new Error('Unknown stream filter "' + dict.Filter + '"');
        }

    } else {

        this.contents = contents;
    }
}

exports = module.exports = StreamObject;

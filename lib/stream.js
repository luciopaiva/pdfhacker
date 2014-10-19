"use strict";

exports = module.exports = StreamObject;

/**
 * Stream object
 *
 * @param dict
 * @param buffer
 * @constructor
 */
function StreamObject(dict, buffer) {
    this.dict = dict;
    this.buffer = buffer;
}

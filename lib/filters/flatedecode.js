"use strict";

var
    pako = require('pako');

module.exports = function flateDecode(buffer) {
    return pako.inflate(buffer, {to:'string'});
};

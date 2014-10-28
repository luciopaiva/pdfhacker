"use strict";

var
    pako = require('pako');

module.exports = function flateDecode(buffer) {
    return String.fromCharCode.apply(null, pako.inflate(toArrayBuffer(buffer)));
};

// http://stackoverflow.com/a/12101012/778272
function toArrayBuffer(buffer) {
    var ab = new ArrayBuffer(buffer.length);
    var view = new Uint8Array(ab);
    for (var i = 0; i < buffer.length; ++i) {
        view[i] = buffer[i];
    }
    return ab;
}

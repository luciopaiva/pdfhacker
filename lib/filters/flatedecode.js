
const pako = require('pako');

module.exports = function flateDecode(buffer) {
    return pako.inflate(buffer, {to:'string'});
};

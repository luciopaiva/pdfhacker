"use strict";

var
    util = require('util'),
    fs = require('fs'),
    zlib = require('zlib'),
    flate = require('../../lib/filters/flatedecode'),
    jsdiff = require('diff'),
    chalk = require('chalk');

var
    testFile = '../../test/assets/collier.pdf',
    testPosition = 0x4c4b,
    testLength = 2933;

function pakoInflate(buf) {
    return flate(buf);
}

function zlibInflate(buf, cb) {
    zlib.inflate(buf, function (err, data) {
        cb(data.toString('utf-8'));
    });
}

function getTestData() {
    var
        fd, buf;

    buf = new Buffer(testLength);

    try {
        fd = fs.openSync(testFile, 'r');

    } catch (e) {
        if (e.code === 'ENOENT') {
            console.error('File "%s" was not found or could not be opened.', filename);
        } else {
            console.error(e);
        }
    }

    // read sensitive data
    fs.readSync(fd, buf, 0, testLength, testPosition);
    fs.closeSync(fd);

    // persist to a file
    //fs.openSync(filename + '.bin', 'w');
    //fs.writeSync(fd, buf, 0, 2933, 0);
    //fs.closeSync(fd);

    return buf;
}

function compareInflates(pakoData, zlibData) {
    var
        parts = [],
        diff = jsdiff.diffChars(zlibData, pakoData);

    diff.forEach(function (part) {
        var
            color = part.added ? chalk.green : part.removed ? chalk.red : chalk.grey;

        parts.push({
            change: part.added ? 'added' : part.removed ? 'removed' : 'kept',
            color: color,
            length: part.value.length
        });

        process.stdout.write(color(part.value));
    });

    console.info();
    console.info(chalk.cyan('Diff result "zlib -> pako": %d parts'), parts.length);
    parts.forEach(function (part, index) {
        var
            df = part.color(util.format('%s %d chars', part.change, part.length));

        console.info(chalk.cyan('\tPart %d: %s'), index+1, df);
    });
}

function runInflates(data) {
    var
        pakoData = pakoInflate(data);

    zlibInflate(data, compareInflates.bind(null, pakoData));
}

function main() {
    var
        data = getTestData();

    runInflates(data);
}

main();

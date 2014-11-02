"use strict";

var
    willie = require('willie'),
    builder = require('../../lib/docbuilder');

var
    doc;


function printObjects() {
    var
        objs, keys;

    objs = doc.getAllObjects();
    keys = Object.keys(objs);

    keys.forEach(function (key) {

        console.info('\n# %s ###########################################################################', key);
        console.dir(objs[key]);
    });
}

function dump(filename) {

    try {
        doc = builder(filename, {
            logToFile: 'dump.log'
        });

        printObjects();

    } catch (e) {
        if (e.code === 'ENOENT') {
            console.error('File "%s" was not found or could not be opened.', filename);
        } else {
            console.error(e);
        }
    }
}

function main() {

    if (process.argv.length !== 3) {

        console.error('How to use:');
        console.error('\tnode dump <pdf_file>');

    } else {

        willie.logToFileWithTimestamp('dump');

        dump(process.argv[2]);
    }
}

main();

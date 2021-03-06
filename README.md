PDF Hacker
==========

[![Build Status](https://img.shields.io/travis/luciopaiva/pdfhacker/master.svg?style=flat)](https://travis-ci.org/luciopaiva/pdfhacker)
[![Coverage Status](https://img.shields.io/coveralls/luciopaiva/pdfhacker/master.svg?style=flat)](https://coveralls.io/r/luciopaiva/pdfhacker)

**Beware this is a WIP in its early stages!**

The goal of this project is to have a lib that allows you to programmatically read from (and possibly write to) PDF files. It is meant as a low-level PDF file editor API.

## Features

Basic PDF info:

    const pdf = pdfhacker('test.pdf');
       
    > console.dir(pdf.version);
    {
      major: 1,
      minor: 5
    }

Simple text replacement:

    pdf.replace('foo', 'bar').saveTo('out.pdf');

Will replace all occurrences of ``foo`` with ``bar``, finally saving to file ``out.pdf``.

Chaining:

    pdf
      .replace('foo', 'bar')
      .replace(/\d{3}/, '456')
      .saveTo('out.pdf');

Will replace all occurrences of ``foo`` with ``bar`` and will also replace all ``123`` with ``456``, finally saving to file ``out.pdf``.

Display object tree:

    > pdf.dumpTree();
    Root
    |- Catalog
       |- Page 1
       |- Page 2
       ...

Change specific objects:

    pdf('/Root/Catalog/Page 1/Text')[0].val('first text object will be affected');
    pdf('/Root/Catalog/Page 1/Text').val('all page 1 text objects will be affected');

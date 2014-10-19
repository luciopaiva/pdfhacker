PDF Hacker
==========

[![Build Status](https://img.shields.io/travis/luciopaiva/pdfhacker.svg?style=flat)](https://travis-ci.org/luciopaiva/pdfhacker)
[![Coverage Status](https://img.shields.io/coveralls/luciopaiva/pdfhacker.svg?style=flat)](https://coveralls.io/r/luciopaiva/pdfhacker?branch=master)

A low-level PDF file editor.

## Features

Basic PDF info:

    > console.info(pdfhacker('test.pdf').filename)
    test.pdf
    
    > console.dir(pdfhacker('test.pdf').version)
    {
      major: 1,
      minor: 5
    }

Simple text replacement:

    pdfhacker('test.pdf').replace('foo', 'bar').saveTo('out.pdf');

Will replace all occurrences of ``foo`` with ``bar`, finally saving to file ``out.pdf``.

Chaining:

    pdfhacker('test.pdf')
      .replace('foo', 'bar')
      .replace('123', '456')
      .saveTo('out.pdf')

Will replace all occurrences of ``foo`` with ``bar`` and will also replace all ``123`` with ``456``, finally saving to file ``out.pdf``.


Simple script to investigate what's wrong with pako. The script uses as input certain page contents from a test PDF file, inflating it with two different tools: the pako library and Node.js's zlib. At the end, it will compare both outputs using the diff library with chalk to color the changes.

From the investigations, I found that pako is truncating the data from the decompression, returning only the first 16384 chars from the result.

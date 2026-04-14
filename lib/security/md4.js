/*
 * MD4 hash function implementation in pure JavaScript
 * Adapted from various public domain implementations
 */

function md4(buffer) {
    var words = bufferToWords(buffer);
    var hash = [1732584193, -271733879, -1732584194, 271733878];

    words[buffer.length >> 2] |= (buffer.length % 4 === 0 ? 0x80 : 0x80 << (8 * (buffer.length % 4)));
    var nWords = ((buffer.length + 8) >> 6) * 16 + 14;
    while (words.length < nWords) words.push(0);
    words.push(buffer.length * 8);
    words.push(0);

    for (var i = 0; i < words.length; i += 16) {
        var a = hash[0], b = hash[1], c = hash[2], d = hash[3];

        a = ff(a, b, c, d, words[i + 0], 3);
        d = ff(d, a, b, c, words[i + 1], 7);
        c = ff(c, d, a, b, words[i + 2], 11);
        b = ff(b, c, d, a, words[i + 3], 19);
        a = ff(a, b, c, d, words[i + 4], 3);
        d = ff(d, a, b, c, words[i + 5], 7);
        c = ff(c, d, a, b, words[i + 6], 11);
        b = ff(b, c, d, a, words[i + 7], 19);
        a = ff(a, b, c, d, words[i + 8], 3);
        d = ff(d, a, b, c, words[i + 9], 7);
        c = ff(c, d, a, b, words[i + 10], 11);
        b = ff(b, c, d, a, words[i + 11], 19);
        a = ff(a, b, c, d, words[i + 12], 3);
        d = ff(d, a, b, c, words[i + 13], 7);
        c = ff(c, d, a, b, words[i + 14], 11);
        b = ff(b, c, d, a, words[i + 15], 19);

        a = gg(a, b, c, d, words[i + 0], 3);
        d = gg(d, a, b, c, words[i + 4], 5);
        c = gg(c, d, a, b, words[i + 8], 9);
        b = gg(b, c, d, a, words[i + 12], 13);
        a = gg(a, b, c, d, words[i + 1], 3);
        d = gg(d, a, b, c, words[i + 5], 5);
        c = gg(c, d, a, b, words[i + 9], 9);
        b = gg(b, c, d, a, words[i + 13], 13);
        a = gg(a, b, c, d, words[i + 2], 3);
        d = gg(d, a, b, c, words[i + 6], 5);
        c = gg(c, d, a, b, words[i + 10], 9);
        b = gg(b, c, d, a, words[i + 14], 13);
        a = gg(a, b, c, d, words[i + 3], 3);
        d = gg(d, a, b, c, words[i + 7], 5);
        c = gg(c, d, a, b, words[i + 11], 9);
        b = gg(b, c, d, a, words[i + 15], 13);

        a = hh(a, b, c, d, words[i + 0], 3);
        d = hh(d, a, b, c, words[i + 8], 9);
        c = hh(c, d, a, b, words[i + 4], 11);
        b = hh(b, c, d, a, words[i + 12], 15);
        a = hh(a, b, c, d, words[i + 2], 3);
        d = hh(d, a, b, c, words[i + 10], 9);
        c = hh(c, d, a, b, words[i + 6], 11);
        b = hh(b, c, d, a, words[i + 14], 15);
        a = hh(a, b, c, d, words[i + 1], 3);
        d = hh(d, a, b, c, words[i + 9], 9);
        c = hh(c, d, a, b, words[i + 5], 11);
        b = hh(b, c, d, a, words[i + 13], 15);
        a = hh(a, b, c, d, words[i + 3], 3);
        d = hh(d, a, b, c, words[i + 11], 9);
        c = hh(c, d, a, b, words[i + 7], 11);
        b = hh(b, c, d, a, words[i + 15], 15);

        hash[0] = add(hash[0], a);
        hash[1] = add(hash[1], b);
        hash[2] = add(hash[2], c);
        hash[3] = add(hash[3], d);
    }

    return wordsToBuffer(hash);
}

function bufferToWords(buffer) {
    var words = [];
    for (var i = 0; i < buffer.length * 8; i += 8) {
        words[i >> 5] |= (buffer[i / 8] & 0xFF) << (i % 32);
    }
    return words;
}

function wordsToBuffer(words) {
    var buffer = new Buffer(words.length * 4);
    for (var i = 0; i < words.length * 32; i += 8) {
        buffer[i / 8] = (words[i >> 5] >>> (i % 32)) & 0xFF;
    }
    return buffer;
}

function add(x, y) {
    return (x + y) | 0;
}

function rol(v, s) {
    return (v << s) | (v >>> (32 - s));
}

function ff(a, b, c, d, x, s) {
    return rol(add(add(a, (b & c) | (~b & d)), x), s);
}

function gg(a, b, c, d, x, s) {
    return rol(add(add(a, (b & c) | (b & d) | (c & d)), add(x, 1518500249)), s);
}

function hh(a, b, c, d, x, s) {
    return rol(add(add(a, b ^ c ^ d), add(x, 1859775393)), s);
}

module.exports = md4;

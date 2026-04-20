var spnego = require('../lib/protocol/spnego');
var assert = require('assert');
var { type } = require('../lib/core');

// Test NegTokenInit
var ntlmNegotiate = Buffer.from('NTLMSSP\0\x01\0\0\0\x07\x82\x08\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0', 'binary');
var tokenInit = new spnego.NegTokenInit(ntlmNegotiate);
var encodedInit = tokenInit.encode();

// Test NegTokenResp
var ntlmChallenge = Buffer.from('NTLMSSP\0\x02\0\0\0', 'binary');
var tokenResp = new spnego.NegTokenResp(ntlmChallenge);
var encodedResp = tokenResp.encode();

// Test decoding NegTokenResp
var stream = new type.Stream(encodedResp);
var decodedResp = spnego.decodeSpnegoToken(stream);
assert.deepEqual(decodedResp.responseToken, ntlmChallenge);

// Test decoding NegTokenInit
var streamInit = new type.Stream(encodedInit);
var decodedInit = spnego.decodeSpnegoToken(streamInit);
assert.deepEqual(decodedInit.mechToken, ntlmNegotiate);

console.log('SPNEGO tests passed');

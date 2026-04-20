var rdp = require('../lib/protocol/rdp');
var spnego = require('../lib/protocol/spnego');
var credssp = require('../lib/protocol/credssp');
var ntlm = require('../lib/security/ntlm');
var assert = require('assert');
var { type } = require('../lib/core');

// Mock a socket
var EventEmitter = require('events');
var mockSocket = new EventEmitter();
mockSocket.write = function(data) {
    this.emit('sent', data);
};

// Mock config
var config = {
    userName: 'user',
    password: 'password',
    domain: 'domain'
};

var client = rdp.createClient(config);
client.bufferLayer.socket = mockSocket;

// Test handshake initiation
var sentData = [];
mockSocket.on('sent', function(data) {
    sentData.push(data);
});

client.handshakeNLA(function(err) {
    if (err) {
        console.error('NLA Handshake failed:', err);
        process.exit(1);
    }
    console.log('NLA Handshake completed successfully!');
});

assert.equal(sentData.length, 1);
var tsRequest = credssp.decodeTSRequest(new type.Stream(sentData[0]));
assert.ok(tsRequest.negoData);
var spnegoInit = spnego.decodeSpnegoToken(new type.Stream(tsRequest.negoData.data));
assert.ok(spnegoInit);
assert.ok(spnegoInit.mechToken);
console.log('NLA initiation verified');

// Test challenge response
var realChallenge = Buffer.from('NTLMSSP\0\x02\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0', 'binary');
var spnegoResp = new spnego.NegTokenResp(realChallenge).encode();
var tsResponse = new credssp.TSRequest(2, new credssp.NegoData(spnegoResp));

client.bufferLayer.emit('raw-data', tsResponse.encode());

assert.equal(sentData.length, 2);
var tsAuth = credssp.decodeTSRequest(new type.Stream(sentData[1]));
assert.ok(tsAuth.negoData);
var spnegoAuth = spnego.decodeSpnegoToken(new type.Stream(tsAuth.negoData.data));
assert.ok(spnegoAuth);
assert.ok(spnegoAuth.responseToken);
console.log('NLA challenge response verified');

// Test completion
var tsComplete = new credssp.TSRequest(2);
client.bufferLayer.emit('raw-data', tsComplete.encode());

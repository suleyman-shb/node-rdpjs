/*
 * Copyright (c) 2024 Jules (AI)
 *
 * This file is part of node-rdpjs.
 *
 * node-rdpjs is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 */

var crypto = require('crypto');
var type = require('../core/type');
var md4 = require('./md4');

/**
 * NTLM authentication implementation
 * @see https://msdn.microsoft.com/en-us/library/cc236621.aspx
 */

var NTLMSSP_SIGNATURE = new Buffer('NTLMSSP\0', 'binary');

var NegotiateFlags = {
    NEGOTIATE_UNICODE : 0x00000001,
    NEGOTIATE_OEM : 0x00000002,
    REQUEST_TARGET : 0x00000004,
    NEGOTIATE_SIGN : 0x00000010,
    NEGOTIATE_SEAL : 0x00000020,
    NEGOTIATE_DATAGRAM : 0x00000040,
    NEGOTIATE_LM_KEY : 0x00000080,
    NEGOTIATE_NTLM : 0x00000200,
    NEGOTIATE_ANONYMOUS : 0x00000800,
    NEGOTIATE_OEM_DOMAIN_SUPPLIED : 0x00001000,
    NEGOTIATE_OEM_WORKSTATION_SUPPLIED : 0x00002000,
    NEGOTIATE_ALWAYS_SIGN : 0x00008000,
    TARGET_TYPE_DOMAIN : 0x00010000,
    TARGET_TYPE_SERVER : 0x00020000,
    NEGOTIATE_EXTENDED_SESSIONSECURITY : 0x00080000,
    NEGOTIATE_IDENTIFY : 0x00100000,
    REQUEST_NON_NT_SESSION_KEY : 0x00400000,
    NEGOTIATE_TARGET_INFO : 0x00800000,
    NEGOTIATE_VERSION : 0x02000000,
    NEGOTIATE_128 : 0x20000000,
    NEGOTIATE_KEY_EXCH : 0x40000000,
    NEGOTIATE_56 : (0x80000000 >>> 0)
};

function createNegotiateMessage() {
    var self = {
        signature : new type.BinaryString(NTLMSSP_SIGNATURE),
        type : new type.UInt32Le(1),
        flags : new type.UInt32Le(
            (NegotiateFlags.NEGOTIATE_UNICODE |
            NegotiateFlags.NEGOTIATE_OEM |
            NegotiateFlags.REQUEST_TARGET |
            NegotiateFlags.NEGOTIATE_NTLM |
            NegotiateFlags.NEGOTIATE_ALWAYS_SIGN |
            NegotiateFlags.NEGOTIATE_EXTENDED_SESSIONSECURITY |
            NegotiateFlags.NEGOTIATE_128 |
            NegotiateFlags.NEGOTIATE_56) >>> 0
        ),
        domainNameLen : new type.UInt16Le(0),
        domainNameMaxLen : new type.UInt16Le(0),
        domainNameBufferOffset : new type.UInt32Le(0),
        workstationLen : new type.UInt16Le(0),
        workstationMaxLen : new type.UInt16Le(0),
        workstationBufferOffset : new type.UInt32Le(0)
    };
    return new type.Component(self).toStream().buffer;
}

function decodeChallengeMessage(buffer) {
    var s = new type.Stream(buffer);
    var signature = new type.BinaryString(null, { readLength : new type.CallableValue(8) }).read(s);
    var messageType = new type.UInt32Le().read(s).value;

    if (signature.value.toString() !== NTLMSSP_SIGNATURE.toString() || messageType !== 2) {
        throw new Error('Invalid NTLM challenge message');
    }

    var targetNameLen = new type.UInt16Le().read(s).value;
    var targetNameMaxLen = new type.UInt16Le().read(s).value;
    var targetNameOffset = new type.UInt32Le().read(s).value;
    var flags = new type.UInt32Le().read(s).value;
    var serverChallenge = new type.BinaryString(null, { readLength : new type.CallableValue(8) }).read(s).value;
    var reserved = new type.BinaryString(null, { readLength : new type.CallableValue(8) }).read(s);
    var targetInfoLen = new type.UInt16Le().read(s).value;
    var targetInfoMaxLen = new type.UInt16Le().read(s).value;
    var targetInfoOffset = new type.UInt32Le().read(s).value;

    var targetName = buffer.slice(targetNameOffset, targetNameOffset + targetNameLen);
    var targetInfo = buffer.slice(targetInfoOffset, targetInfoOffset + targetInfoLen);

    return {
        flags : flags,
        serverChallenge : serverChallenge,
        targetName : targetName,
        targetInfo : targetInfo
    };
}

function createAuthenticateMessage(userName, password, domain, challenge) {
    var domainBuf = new Buffer(domain || '', 'ucs2');
    userName = userName || '';
    var userBuf = new Buffer(userName, 'ucs2');
    var workstationBuf = new Buffer('WORKSTATION', 'ucs2');

    var ntlmResponse = calculateNTLMv2Response(domain, userName, password, challenge.serverChallenge, challenge.targetInfo);
    var lmResponse = new Buffer(24);
    lmResponse.fill(0);

    var flags = (challenge.flags & (
        NegotiateFlags.NEGOTIATE_UNICODE |
        NegotiateFlags.NEGOTIATE_OEM |
        NegotiateFlags.NEGOTIATE_NTLM |
        NegotiateFlags.NEGOTIATE_EXTENDED_SESSIONSECURITY |
        NegotiateFlags.NEGOTIATE_128 |
        NegotiateFlags.NEGOTIATE_56
    )) >>> 0;

    var self = {
        signature : new type.BinaryString(NTLMSSP_SIGNATURE),
        type : new type.UInt32Le(3),
        lmResponseLen : new type.UInt16Le(lmResponse.length),
        lmResponseMaxLen : new type.UInt16Le(lmResponse.length),
        lmResponseOffset : new type.UInt32Le(0),
        ntResponseLen : new type.UInt16Le(ntlmResponse.length),
        ntResponseMaxLen : new type.UInt16Le(ntlmResponse.length),
        ntResponseOffset : new type.UInt32Le(0),
        domainNameLen : new type.UInt16Le(domainBuf.length),
        domainNameMaxLen : new type.UInt16Le(domainBuf.length),
        domainNameOffset : new type.UInt32Le(0),
        userNameLen : new type.UInt16Le(userBuf.length),
        userNameMaxLen : new type.UInt16Le(userBuf.length),
        userNameOffset : new type.UInt32Le(0),
        workstationLen : new type.UInt16Le(workstationBuf.length),
        workstationMaxLen : new type.UInt16Le(workstationBuf.length),
        workstationOffset : new type.UInt32Le(0),
        sessionKeyLen : new type.UInt16Le(0),
        sessionKeyMaxLen : new type.UInt16Le(0),
        sessionKeyOffset : new type.UInt32Le(0),
        flags : new type.UInt32Le(flags)
    };

    var headerSize = 64; // size of the above fields
    self.domainNameOffset.value = headerSize;
    self.userNameOffset.value = self.domainNameOffset.value + domainBuf.length;
    self.workstationOffset.value = self.userNameOffset.value + userBuf.length;
    self.lmResponseOffset.value = self.workstationOffset.value + workstationBuf.length;
    self.ntResponseOffset.value = self.lmResponseOffset.value + lmResponse.length;
    self.sessionKeyOffset.value = self.ntResponseOffset.value + ntlmResponse.length;

    var message = new type.Component(self).toStream().buffer;
    return Buffer.concat([message, domainBuf, userBuf, workstationBuf, lmResponse, ntlmResponse]);
}

function calculateNTLMv2Response(domain, user, password, serverChallenge, targetInfo) {
    var ntlmHash = md4(new Buffer(password, 'ucs2'));
    var ntlmRev2Hash = crypto.createHmac('md5', ntlmHash).update(new Buffer(user.toUpperCase() + domain.toUpperCase(), 'ucs2')).digest();

    var clientNonce = crypto.randomBytes(8);
    var timestamp = new Buffer(8);
    // Rough timestamp implementation, for a real one we'd need a 64-bit int.
    // This is milliseconds since 1601.
    var now = Date.now();
    var msSince1601 = (now + 11644473600000) * 10000;
    timestamp.writeUInt32LE(msSince1601 % 0x100000000, 0);
    timestamp.writeUInt32LE(Math.floor(msSince1601 / 0x100000000), 4);

    var temp = Buffer.concat([
        new Buffer([1, 1, 0, 0]), // respType, hiRespType, reserved1, reserved2
        new Buffer([0, 0, 0, 0]), // reserved3
        timestamp,
        clientNonce,
        new Buffer([0, 0, 0, 0]), // reserved4
        targetInfo,
        new Buffer([0, 0, 0, 0]) // reserved5
    ]);

    var ntProofStr = crypto.createHmac('md5', ntlmRev2Hash).update(Buffer.concat([serverChallenge, temp])).digest();
    return Buffer.concat([ntProofStr, temp]);
}

module.exports = {
    createNegotiateMessage : createNegotiateMessage,
    decodeChallengeMessage : decodeChallengeMessage,
    createAuthenticateMessage : createAuthenticateMessage
};

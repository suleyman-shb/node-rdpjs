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

var asn1 = require('../asn1');

var NTLM_SSP_OID = Buffer.from([0x2b, 0x06, 0x01, 0x04, 0x01, 0x82, 0x37, 0x02, 0x02, 0x0a]);
var SPNEGO_OID = Buffer.from([0x2b, 0x06, 0x01, 0x05, 0x05, 0x02]);

/**
 * NegTokenInit SPNEGO structure
 * @see https://tools.ietf.org/html/rfc4178#section-4.2.1
 */
function NegTokenInit(mechToken) {
    this.mechToken = mechToken;
}

NegTokenInit.prototype.encode = function() {
    var fields = [
        new asn1.univ.SequenceOf(function() { return new asn1.univ.ObjectIdentifier(); }, [new asn1.univ.ObjectIdentifier(NTLM_SSP_OID)])
            .explicitTag(new asn1.spec.Asn1Tag(asn1.spec.TagClass.Context, asn1.spec.TagFormat.Constructed, 0))
    ];

    if (this.mechToken) {
        fields.push(new asn1.univ.OctetString(this.mechToken)
            .explicitTag(new asn1.spec.Asn1Tag(asn1.spec.TagClass.Context, asn1.spec.TagFormat.Constructed, 2)));
    }

    var negTokenInit = new asn1.univ.Sequence(fields).explicitTag(new asn1.spec.Asn1Tag(asn1.spec.TagClass.Context, asn1.spec.TagFormat.Constructed, 0));

    var initialContextToken = new asn1.univ.Sequence([
        new asn1.univ.ObjectIdentifier(SPNEGO_OID),
        negTokenInit
    ]).explicitTag(new asn1.spec.Asn1Tag(asn1.spec.TagClass.Application, asn1.spec.TagFormat.Constructed, 0));

    return initialContextToken.encode(asn1.ber).toStream().buffer;
};

/**
 * NegTokenResp SPNEGO structure
 * @see https://tools.ietf.org/html/rfc4178#section-4.2.2
 */
function NegTokenResp(responseToken) {
    this.responseToken = responseToken;
}

NegTokenResp.prototype.encode = function() {
    var fields = [];

    if (this.responseToken) {
        fields.push(new asn1.univ.OctetString(this.responseToken)
            .explicitTag(new asn1.spec.Asn1Tag(asn1.spec.TagClass.Context, asn1.spec.TagFormat.Constructed, 2)));
    }

    var negTokenResp = new asn1.univ.Sequence(fields).explicitTag(new asn1.spec.Asn1Tag(asn1.spec.TagClass.Context, asn1.spec.TagFormat.Constructed, 1));

    return negTokenResp.encode(asn1.ber).toStream().buffer;
};

function decodeSpnegoToken(s) {
    var tag = s.buffer[s.offset];

    if (tag === 0x60) { // [APPLICATION 0] (NegTokenInit)
        var mechToken = new asn1.univ.OctetString();
        var negTokenInitSpec = new asn1.univ.Sequence([
            new asn1.univ.ObjectIdentifier(),
            new asn1.univ.Sequence([
                new asn1.univ.SequenceOf(function() { return new asn1.univ.ObjectIdentifier(); }).explicitTag(new asn1.spec.Asn1Tag(asn1.spec.TagClass.Context, asn1.spec.TagFormat.Constructed, 0)).optional(),
                new asn1.univ.BitString().explicitTag(new asn1.spec.Asn1Tag(asn1.spec.TagClass.Context, asn1.spec.TagFormat.Constructed, 1)).optional(),
                (function() {
                    var spec = mechToken.explicitTag(new asn1.spec.Asn1Tag(asn1.spec.TagClass.Context, asn1.spec.TagFormat.Constructed, 2)).optional();
                    var originalDecode = spec.decode;
                    spec.decode = function(s, decoder) {
                        originalDecode.call(this, s, decoder);
                        mechToken.isRead = true;
                    };
                    return spec;
                })(),
                new asn1.univ.OctetString().explicitTag(new asn1.spec.Asn1Tag(asn1.spec.TagClass.Context, asn1.spec.TagFormat.Constructed, 3)).optional()
            ]).explicitTag(new asn1.spec.Asn1Tag(asn1.spec.TagClass.Context, asn1.spec.TagFormat.Constructed, 0))
        ]).explicitTag(new asn1.spec.Asn1Tag(asn1.spec.TagClass.Application, asn1.spec.TagFormat.Constructed, 0));

        negTokenInitSpec.decode(s, asn1.ber);
        return new NegTokenInit(mechToken.isRead ? mechToken.value : null);
    }

    if (tag === 0xa1) { // [1] Constructed (NegTokenResp)
        var responseToken = new asn1.univ.OctetString();
        var negTokenRespSpec = new asn1.univ.Sequence([
            new asn1.univ.Enumerate().explicitTag(new asn1.spec.Asn1Tag(asn1.spec.TagClass.Context, asn1.spec.TagFormat.Constructed, 0)).optional(),
            new asn1.univ.ObjectIdentifier().explicitTag(new asn1.spec.Asn1Tag(asn1.spec.TagClass.Context, asn1.spec.TagFormat.Constructed, 1)).optional(),
            (function() {
                var spec = responseToken.explicitTag(new asn1.spec.Asn1Tag(asn1.spec.TagClass.Context, asn1.spec.TagFormat.Constructed, 2)).optional();
                var originalDecode = spec.decode;
                spec.decode = function(s, decoder) {
                    originalDecode.call(this, s, decoder);
                    responseToken.isRead = true;
                };
                return spec;
            })(),
            new asn1.univ.OctetString().explicitTag(new asn1.spec.Asn1Tag(asn1.spec.TagClass.Context, asn1.spec.TagFormat.Constructed, 3)).optional()
        ]).explicitTag(new asn1.spec.Asn1Tag(asn1.spec.TagClass.Context, asn1.spec.TagFormat.Constructed, 1));

        negTokenRespSpec.decode(s, asn1.ber);

        return new NegTokenResp(responseToken.isRead ? responseToken.value : null);
    }

    return null;
}

module.exports = {
    NegTokenInit : NegTokenInit,
    NegTokenResp : NegTokenResp,
    decodeSpnegoToken : decodeSpnegoToken
};

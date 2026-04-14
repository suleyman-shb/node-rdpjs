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

var inherits = require('util').inherits;
var events = require('events');
var type = require('../core').type;
var asn1 = require('../asn1');

/**
 * CredSSP TSRequest ASN.1 structure
 * @see https://msdn.microsoft.com/en-us/library/cc226780.aspx
 */
function TSRequest(version, negoData, authInfo, pubKeyAuth) {
    this.version = version;
    this.negoData = negoData;
    this.authInfo = authInfo;
    this.pubKeyAuth = pubKeyAuth;
}

TSRequest.prototype.encode = function() {
    var fields = [
        new asn1.univ.Integer(this.version).explicitTag(new asn1.spec.Asn1Tag(asn1.spec.TagClass.Context, asn1.spec.TagFormat.Constructed, 0))
    ];

    if (this.negoData) {
        fields.push(this.negoData.encode().explicitTag(new asn1.spec.Asn1Tag(asn1.spec.TagClass.Context, asn1.spec.TagFormat.Constructed, 1)));
    }

    if (this.authInfo) {
        fields.push(new asn1.univ.OctetString(this.authInfo).explicitTag(new asn1.spec.Asn1Tag(asn1.spec.TagClass.Context, asn1.spec.TagFormat.Constructed, 2)));
    }

    if (this.pubKeyAuth) {
        fields.push(new asn1.univ.OctetString(this.pubKeyAuth).explicitTag(new asn1.spec.Asn1Tag(asn1.spec.TagClass.Context, asn1.spec.TagFormat.Constructed, 3)));
    }

    return new asn1.univ.Sequence(fields).encode(asn1.ber).toStream().buffer;
};

function decodeTSRequest(s) {
    var version = new asn1.univ.Integer();
    var negoData = new NegoData();
    var authInfo = new asn1.univ.OctetString();
    var pubKeyAuth = new asn1.univ.OctetString();

    var tsRequestSpec = new asn1.univ.Sequence([
        version.explicitTag(new asn1.spec.Asn1Tag(asn1.spec.TagClass.Context, asn1.spec.TagFormat.Constructed, 0)),
        negoData.getSpec().explicitTag(new asn1.spec.Asn1Tag(asn1.spec.TagClass.Context, asn1.spec.TagFormat.Constructed, 1)).optional(),
        (function() {
            var spec = authInfo.explicitTag(new asn1.spec.Asn1Tag(asn1.spec.TagClass.Context, asn1.spec.TagFormat.Constructed, 2)).optional();
            var originalDecode = spec.decode;
            spec.decode = function(s, decoder) {
                originalDecode.call(this, s, decoder);
                authInfo.isRead = true;
            };
            return spec;
        })(),
        (function() {
            var spec = pubKeyAuth.explicitTag(new asn1.spec.Asn1Tag(asn1.spec.TagClass.Context, asn1.spec.TagFormat.Constructed, 3)).optional();
            var originalDecode = spec.decode;
            spec.decode = function(s, decoder) {
                originalDecode.call(this, s, decoder);
                pubKeyAuth.isRead = true;
            };
            return spec;
        })()
    ]);

    tsRequestSpec.decode(s, asn1.ber);

    return new TSRequest(
        version.value,
        negoData.isRead ? negoData : null,
        authInfo.isRead ? authInfo.value : null,
        pubKeyAuth.isRead ? pubKeyAuth.value : null
    );
}

/**
 * CredSSP NegoData ASN.1 structure
 */
function NegoData(data) {
    this.data = data;
    this.isRead = false;
}

NegoData.prototype.encode = function() {
    var negoDataItem = new asn1.univ.Sequence([
        new asn1.univ.OctetString(this.data).explicitTag(new asn1.spec.Asn1Tag(asn1.spec.TagClass.Context, asn1.spec.TagFormat.Constructed, 0))
    ]);
    return new asn1.univ.SequenceOf(function() { return negoDataItem; }, [negoDataItem]);
};

NegoData.prototype.getSpec = function() {
    var self = this;
    var specInstance = new asn1.univ.SequenceOf(function() {
        return new asn1.univ.Sequence([
            new asn1.univ.OctetString().explicitTag(new asn1.spec.Asn1Tag(asn1.spec.TagClass.Context, asn1.spec.TagFormat.Constructed, 0))
        ]);
    });
    var originalDecode = specInstance.decode;
    specInstance.decode = function(s, decoder) {
        originalDecode.call(this, s, decoder);
        if (this.value.length > 0) {
            var sequence = this.value[0];
            var taggedOctetString = sequence.value[0];
            self.data = taggedOctetString.spec.value;
            self.isRead = true;
        }
    };
    return specInstance;
};

module.exports = {
    TSRequest : TSRequest,
    decodeTSRequest : decodeTSRequest,
    NegoData : NegoData
};

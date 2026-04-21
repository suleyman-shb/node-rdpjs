/*
 * Copyright (c) 2014-2015 Sylvain Peyrefitte
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

var type = require('../../core').type;
var log = require('../../core').log;

var OrderType = {
    TS_NEG_DSTBLT_INDEX : 0x00,
    TS_NEG_PATBLT_INDEX : 0x01,
    TS_NEG_SCRBLT_INDEX : 0x02,
    TS_NEG_MEMBLT_INDEX : 0x03,
    TS_NEG_MEM3BLT_INDEX : 0x04,
    TS_NEG_DRAWNINEGRID_INDEX : 0x07,
    TS_NEG_LINETO_INDEX : 0x08,
    TS_NEG_MULTI_DRAWNINEGRID_INDEX : 0x09,
    TS_NEG_OPAQUERECT_INDEX : 0x0A,
    TS_NEG_SAVEBITMAP_INDEX : 0x0B,
    TS_NEG_W32_PDU_2_INDEX : 0x0C,
    TS_NEG_MULTIDSTBLT_INDEX : 0x0F,
    TS_NEG_MULTIPATBLT_INDEX : 0x10,
    TS_NEG_MULTISCRBLT_INDEX : 0x11,
    TS_NEG_MULTIOPAQUERECT_INDEX : 0x12,
    TS_NEG_FAST_INDEX_INDEX : 0x13,
    TS_NEG_POLYGON_SC_INDEX : 0x14,
    TS_NEG_POLYGON_CB_INDEX : 0x15,
    TS_NEG_POLYLINE_INDEX : 0x16,
    TS_NEG_FAST_GLYPH_INDEX : 0x18,
    TS_NEG_ELLIPSE_SC_INDEX : 0x19,
    TS_NEG_ELLIPSE_CB_INDEX : 0x1A,
    TS_NEG_INDEX_INDEX : 0x1B
};

var ControlFlags = {
    TS_STANDARD: 0x01,
    TS_SECONDARY: 0x02,
    TS_BOUNDS: 0x04,
    TS_TYPE_CHANGE: 0x08,
    TS_DELTA_COORDS: 0x10,
    TS_ZERO_BOUNDS_DELTAS: 0x20,
    TS_ZERO_FIELD_BYTE_BIT0: 0x40,
    TS_ZERO_FIELD_BYTE_BIT1: 0x80
};

var BoundsFlags = {
    TS_BOUNDS_LEFT: 0x01,
    TS_BOUNDS_TOP: 0x02,
    TS_BOUNDS_RIGHT: 0x04,
    TS_BOUNDS_BOTTOM: 0x08,
    TS_BOUNDS_DELTA_LEFT: 0x10,
    TS_BOUNDS_DELTA_TOP: 0x20,
    TS_BOUNDS_DELTA_RIGHT: 0x40,
    TS_BOUNDS_DELTA_BOTTOM: 0x80
};

var OrderFieldsCount = {};
OrderFieldsCount[OrderType.TS_NEG_DSTBLT_INDEX] = 5;
OrderFieldsCount[OrderType.TS_NEG_PATBLT_INDEX] = 12;
OrderFieldsCount[OrderType.TS_NEG_SCRBLT_INDEX] = 7;
OrderFieldsCount[OrderType.TS_NEG_MEMBLT_INDEX] = 9;
OrderFieldsCount[OrderType.TS_NEG_MEM3BLT_INDEX] = 16;
OrderFieldsCount[OrderType.TS_NEG_LINETO_INDEX] = 10;
OrderFieldsCount[OrderType.TS_NEG_OPAQUERECT_INDEX] = 7;
OrderFieldsCount[OrderType.TS_NEG_SAVEBITMAP_INDEX] = 6;
OrderFieldsCount[OrderType.TS_NEG_MULTIOPAQUERECT_INDEX] = 9;

function OrderParser() {
    this.lastOrderType = OrderType.TS_NEG_OPAQUERECT_INDEX;
    this.orderState = {};
    this.boundsState = {
        left: 0,
        top: 0,
        right: 0,
        bottom: 0
    };
    for (var key in OrderType) {
        this.orderState[OrderType[key]] = {};
    }
}

OrderParser.prototype.parse = function(s, count) {
    var orders = [];
    for (var i = 0; i < count; i++) {
        var controlFlags = s.buffer.readUInt8(s.offset);
        s.offset++;

        if (controlFlags & ControlFlags.TS_SECONDARY) {
            orders.push(this.parseSecondaryOrder(s, controlFlags));
        } else {
            orders.push(this.parsePrimaryOrder(s, controlFlags));
        }
    }
    return orders;
};

OrderParser.prototype.parsePrimaryOrder = function(s, controlFlags) {
    var orderType = this.lastOrderType;
    if (controlFlags & ControlFlags.TS_TYPE_CHANGE) {
        orderType = s.buffer.readUInt8(s.offset);
        s.offset++;
        this.lastOrderType = orderType;
    }

    var fieldFlags = 0;
    var bounds = null;
    if (controlFlags & ControlFlags.TS_BOUNDS) {
        bounds = this.parseBounds(s);
    }

    var numFields = OrderFieldsCount[orderType] || 0;
    var maxFieldFlagsBytes = Math.ceil((numFields + 1) / 8);
    var omittedFieldFlagsBytes = (controlFlags & (ControlFlags.TS_ZERO_FIELD_BYTE_BIT0 | ControlFlags.TS_ZERO_FIELD_BYTE_BIT1)) >> 6;
    var fieldFlagsBytesToRead = maxFieldFlagsBytes - omittedFieldFlagsBytes;

    if (fieldFlagsBytesToRead > 0) {
        fieldFlags = s.buffer.readUInt8(s.offset);
        s.offset++;
        if (fieldFlagsBytesToRead > 1) {
            fieldFlags |= (s.buffer.readUInt8(s.offset) << 8);
            s.offset++;
            if (fieldFlagsBytesToRead > 2) {
                fieldFlags |= (s.buffer.readUInt8(s.offset) << 16);
                s.offset++;
            }
        }
    }

    var order = {
        type: orderType,
        fields: {},
        bounds: bounds
    };

    var state = this.orderState[orderType];
    if (!state) {
        state = this.orderState[orderType] = {};
    }

    switch(orderType) {
        case OrderType.TS_NEG_DSTBLT_INDEX:
            this.parseDstBlt(s, controlFlags, fieldFlags, order.fields, state);
            break;
        case OrderType.TS_NEG_PATBLT_INDEX:
            this.parsePatBlt(s, controlFlags, fieldFlags, order.fields, state);
            break;
        case OrderType.TS_NEG_SCRBLT_INDEX:
            this.parseScrBlt(s, controlFlags, fieldFlags, order.fields, state);
            break;
        case OrderType.TS_NEG_MEMBLT_INDEX:
            this.parseMemBlt(s, controlFlags, fieldFlags, order.fields, state);
            break;
        case OrderType.TS_NEG_MEM3BLT_INDEX:
            this.parseMem3Blt(s, controlFlags, fieldFlags, order.fields, state);
            break;
        case OrderType.TS_NEG_LINETO_INDEX:
            this.parseLineTo(s, controlFlags, fieldFlags, order.fields, state);
            break;
        case OrderType.TS_NEG_OPAQUERECT_INDEX:
            this.parseOpaqueRect(s, controlFlags, fieldFlags, order.fields, state);
            break;
        case OrderType.TS_NEG_MULTIOPAQUERECT_INDEX:
            this.parseMultiOpaqueRect(s, controlFlags, fieldFlags, order.fields, state);
            break;
        case OrderType.TS_NEG_SAVEBITMAP_INDEX:
            this.parseSaveBitmap(s, controlFlags, fieldFlags, order.fields, state);
            break;
        default:
            log.debug("Skip unknown primary order type: " + orderType);
            // Without knowing the field sizes of unknown orders, we are likely to lose synchronization
            // with the stream. RDP orders are notoriously difficult to skip.
    }

    return order;
};

OrderParser.prototype.parseBounds = function(s) {
    var flags = s.buffer.readUInt8(s.offset);
    s.offset++;

    var readBoundValue = function(s, isDelta, prevValue) {
        if (isDelta) {
            var delta = s.buffer.readInt8(s.offset);
            s.offset++;
            return prevValue + delta;
        } else {
            var val = s.buffer.readInt16LE(s.offset);
            s.offset += 2;
            return val;
        }
    };

    if (flags & BoundsFlags.TS_BOUNDS_LEFT) {
        this.boundsState.left = readBoundValue(s, !!(flags & BoundsFlags.TS_BOUNDS_DELTA_LEFT), this.boundsState.left);
    }
    if (flags & BoundsFlags.TS_BOUNDS_TOP) {
        this.boundsState.top = readBoundValue(s, !!(flags & BoundsFlags.TS_BOUNDS_DELTA_TOP), this.boundsState.top);
    }
    if (flags & BoundsFlags.TS_BOUNDS_RIGHT) {
        this.boundsState.right = readBoundValue(s, !!(flags & BoundsFlags.TS_BOUNDS_DELTA_RIGHT), this.boundsState.right);
    }
    if (flags & BoundsFlags.TS_BOUNDS_BOTTOM) {
        this.boundsState.bottom = readBoundValue(s, !!(flags & BoundsFlags.TS_BOUNDS_DELTA_BOTTOM), this.boundsState.bottom);
    }

    // According to MS-RDPEGDI 2.2.2.1.3, if a field is not present, it stays the same.
    // However, for the first order in a packet, the bounds are initialized to zero.
    // The test case correctly tests the update logic.

    return {
        left: this.boundsState.left,
        top: this.boundsState.top,
        right: this.boundsState.right,
        bottom: this.boundsState.bottom
    };
};

OrderParser.prototype.readCoord = function(s, deltaCoords, prevValue) {
    if (deltaCoords) {
        var delta = s.buffer.readInt8(s.offset);
        s.offset++;
        return (prevValue || 0) + delta;
    } else {
        var val = s.buffer.readInt16LE(s.offset);
        s.offset += 2;
        return val;
    }
};

OrderParser.prototype.readCoordUnsigned = function(s, deltaCoords, prevValue) {
    if (deltaCoords) {
        var delta = s.buffer.readUInt8(s.offset);
        s.offset++;
        return (prevValue || 0) + delta;
    } else {
        var val = s.buffer.readUInt16LE(s.offset);
        s.offset += 2;
        return val;
    }
};

OrderParser.prototype.readPackedValue = function(s) {
    var b = s.buffer.readUInt8(s.offset++);
    var isTwoBytes = !!(b & 0x80);
    var val = b & 0x7F;
    if (isTwoBytes) {
        val = (val << 8) | s.buffer.readUInt8(s.offset++);
        if (val & 0x4000) val -= 0x8000;
    } else {
        if (val & 0x40) val -= 0x80;
    }
    return val;
};

OrderParser.prototype.parseDeltaRects = function(buffer, numRects) {
    var s = { buffer: buffer, offset: 0 };
    var zeroBitsBytesCount = Math.ceil(numRects / 2);
    var zeroBits = buffer.slice(0, zeroBitsBytesCount);
    s.offset = zeroBitsBytesCount;

    var rects = [];
    var prev = { left: 0, top: 0, width: 0, height: 0 };

    for (var i = 0; i < numRects; i++) {
        var byteIdx = Math.floor(i / 2);
        var isSecondInByte = (i % 2) === 1;
        var shift = isSecondInByte ? 0 : 4;
        var bits = (zeroBits[byteIdx] >> shift) & 0x0F;

        var leftDelta = (bits & 0x08) ? 0 : this.readPackedValue(s);
        var topDelta = (bits & 0x04) ? 0 : this.readPackedValue(s);
        var widthDelta = (bits & 0x02) ? 0 : this.readPackedValue(s);
        var heightDelta = (bits & 0x01) ? 0 : this.readPackedValue(s);

        var rect = {
            left: prev.left + leftDelta,
            top: prev.top + topDelta,
            width: prev.width + widthDelta,
            height: prev.height + heightDelta
        };
        rects.push(rect);
        prev = rect;
    }
    return rects;
};

OrderParser.prototype.parseMultiOpaqueRect = function(s, controlFlags, fieldFlags, fields, state) {
    var delta = !!(controlFlags & ControlFlags.TS_DELTA_COORDS);

    if (fieldFlags & 0x01) state.nLeftRect = this.readCoord(s, delta, state.nLeftRect);
    if (fieldFlags & 0x02) state.nTopRect = this.readCoord(s, delta, state.nTopRect);
    if (fieldFlags & 0x04) state.nWidth = this.readCoordUnsigned(s, delta, state.nWidth);
    if (fieldFlags & 0x08) state.nHeight = this.readCoordUnsigned(s, delta, state.nHeight);
    if (fieldFlags & 0x10) state.redOrPaletteIndex = s.buffer.readUInt8(s.offset++);
    if (fieldFlags & 0x20) state.green = s.buffer.readUInt8(s.offset++);
    if (fieldFlags & 0x40) state.blue = s.buffer.readUInt8(s.offset++);
    if (fieldFlags & 0x80) state.nDeltaEntries = s.buffer.readUInt8(s.offset++);
    if (fieldFlags & 0x0100) {
        var cbData = s.buffer.readUInt16LE(s.offset);
        s.offset += 2;
        state.rects = this.parseDeltaRects(s.buffer.slice(s.offset, s.offset + cbData), state.nDeltaEntries);
        s.offset += cbData;
    }

    Object.assign(fields, state);
};

OrderParser.prototype.parseDstBlt = function(s, controlFlags, fieldFlags, fields, state) {
    var delta = !!(controlFlags & ControlFlags.TS_DELTA_COORDS);

    if (fieldFlags & 0x01) state.nLeftRect = this.readCoord(s, delta, state.nLeftRect);
    if (fieldFlags & 0x02) state.nTopRect = this.readCoord(s, delta, state.nTopRect);
    if (fieldFlags & 0x04) state.nWidthRect = this.readCoordUnsigned(s, delta, state.nWidthRect);
    if (fieldFlags & 0x08) state.nHeightRect = this.readCoordUnsigned(s, delta, state.nHeightRect);
    if (fieldFlags & 0x10) { state.bRop3 = s.buffer.readUInt8(s.offset); s.offset++; }

    Object.assign(fields, state);
};

OrderParser.prototype.parseOpaqueRect = function(s, controlFlags, fieldFlags, fields, state) {
    var delta = !!(controlFlags & ControlFlags.TS_DELTA_COORDS);

    if (fieldFlags & 0x01) state.nLeftRect = this.readCoord(s, delta, state.nLeftRect);
    if (fieldFlags & 0x02) state.nTopRect = this.readCoord(s, delta, state.nTopRect);
    if (fieldFlags & 0x04) state.nWidthRect = this.readCoordUnsigned(s, delta, state.nWidthRect);
    if (fieldFlags & 0x08) state.nHeightRect = this.readCoordUnsigned(s, delta, state.nHeightRect);
    if (fieldFlags & 0x10) state.redOrPaletteIndex = s.buffer.readUInt8(s.offset++);
    if (fieldFlags & 0x20) state.green = s.buffer.readUInt8(s.offset++);
    if (fieldFlags & 0x40) state.blue = s.buffer.readUInt8(s.offset++);

    Object.assign(fields, state);
};

OrderParser.prototype.parseLineTo = function(s, controlFlags, fieldFlags, fields, state) {
    var delta = !!(controlFlags & ControlFlags.TS_DELTA_COORDS);

    if (fieldFlags & 0x0001) { state.mixMode = s.buffer.readUInt8(s.offset); s.offset++; }
    if (fieldFlags & 0x0002) state.nXStart = this.readCoord(s, delta, state.nXStart);
    if (fieldFlags & 0x0004) state.nYStart = this.readCoord(s, delta, state.nYStart);
    if (fieldFlags & 0x0008) state.nXEnd = this.readCoord(s, delta, state.nXEnd);
    if (fieldFlags & 0x0010) state.nYEnd = this.readCoord(s, delta, state.nYEnd);
    if (fieldFlags & 0x0020) {
        var b = s.buffer.readUInt8(s.offset);
        var g = s.buffer.readUInt8(s.offset + 1);
        var r = s.buffer.readUInt8(s.offset + 2);
        s.offset += 3;
        state.backColor = (r << 16) | (g << 8) | b;
    }
    if (fieldFlags & 0x0040) { state.bRop2 = s.buffer.readUInt8(s.offset); s.offset++; }
    if (fieldFlags & 0x0080) { state.penStyle = s.buffer.readUInt8(s.offset); s.offset++; }
    if (fieldFlags & 0x0100) { state.penWidth = s.buffer.readUInt8(s.offset); s.offset++; }
    if (fieldFlags & 0x0200) {
        var b = s.buffer.readUInt8(s.offset);
        var g = s.buffer.readUInt8(s.offset + 1);
        var r = s.buffer.readUInt8(s.offset + 2);
        s.offset += 3;
        state.penColor = (r << 16) | (g << 8) | b;
    }

    Object.assign(fields, state);
};

OrderParser.prototype.parseSaveBitmap = function(s, controlFlags, fieldFlags, fields, state) {
    var delta = !!(controlFlags & ControlFlags.TS_DELTA_COORDS);

    if (fieldFlags & 0x01) { state.savedBitmapPosition = s.buffer.readUInt32LE(s.offset); s.offset += 4; }
    if (fieldFlags & 0x02) state.nLeftRect = this.readCoord(s, delta, state.nLeftRect);
    if (fieldFlags & 0x04) state.nTopRect = this.readCoord(s, delta, state.nTopRect);
    if (fieldFlags & 0x08) state.nRightRect = this.readCoord(s, delta, state.nRightRect);
    if (fieldFlags & 0x10) state.nBottomRect = this.readCoord(s, delta, state.nBottomRect);
    if (fieldFlags & 0x20) { state.operation = s.buffer.readUInt8(s.offset); s.offset++; }

    Object.assign(fields, state);
};

OrderParser.prototype.parsePatBlt = function(s, controlFlags, fieldFlags, fields, state) {
    var delta = !!(controlFlags & ControlFlags.TS_DELTA_COORDS);

    if (fieldFlags & 0x0001) state.nLeftRect = this.readCoord(s, delta, state.nLeftRect);
    if (fieldFlags & 0x0002) state.nTopRect = this.readCoord(s, delta, state.nTopRect);
    if (fieldFlags & 0x0004) state.nWidthRect = this.readCoordUnsigned(s, delta, state.nWidthRect);
    if (fieldFlags & 0x0008) state.nHeightRect = this.readCoordUnsigned(s, delta, state.nHeightRect);
    if (fieldFlags & 0x0010) { state.bRop3 = s.buffer.readUInt8(s.offset); s.offset++; }
    if (fieldFlags & 0x0020) {
        var b = s.buffer.readUInt8(s.offset);
        var g = s.buffer.readUInt8(s.offset + 1);
        var r = s.buffer.readUInt8(s.offset + 2);
        s.offset += 3;
        state.backColor = (r << 16) | (g << 8) | b;
    }
    if (fieldFlags & 0x0040) {
        var b = s.buffer.readUInt8(s.offset);
        var g = s.buffer.readUInt8(s.offset + 1);
        var r = s.buffer.readUInt8(s.offset + 2);
        s.offset += 3;
        state.foreColor = (r << 16) | (g << 8) | b;
    }

    // Brush
    if (fieldFlags & 0x0080) { state.brushX = s.buffer.readUInt8(s.offset); s.offset++; }
    if (fieldFlags & 0x0100) { state.brushY = s.buffer.readUInt8(s.offset); s.offset++; }
    if (fieldFlags & 0x0200) { state.brushStyle = s.buffer.readUInt8(s.offset); s.offset++; }
    if (fieldFlags & 0x0400) { state.brushHatch = s.buffer.readUInt8(s.offset); s.offset++; }
    if (fieldFlags & 0x0800) {
        state.brushExtra = s.buffer.slice(s.offset, s.offset + 7);
        s.offset += 7;
    }

    Object.assign(fields, state);
};

OrderParser.prototype.parseScrBlt = function(s, controlFlags, fieldFlags, fields, state) {
    var delta = !!(controlFlags & ControlFlags.TS_DELTA_COORDS);

    if (fieldFlags & 0x01) state.nLeftRect = this.readCoord(s, delta, state.nLeftRect);
    if (fieldFlags & 0x02) state.nTopRect = this.readCoord(s, delta, state.nTopRect);
    if (fieldFlags & 0x04) state.nWidthRect = this.readCoordUnsigned(s, delta, state.nWidthRect);
    if (fieldFlags & 0x08) state.nHeightRect = this.readCoordUnsigned(s, delta, state.nHeightRect);
    if (fieldFlags & 0x10) {
        state.bRop3 = s.buffer.readUInt8(s.offset);
        s.offset++;
    }
    if (fieldFlags & 0x20) state.nXSrc = this.readCoord(s, delta, state.nXSrc);
    if (fieldFlags & 0x40) state.nYSrc = this.readCoord(s, delta, state.nYSrc);

    Object.assign(fields, state);
};

OrderParser.prototype.parseMemBlt = function(s, controlFlags, fieldFlags, fields, state) {
    var delta = !!(controlFlags & ControlFlags.TS_DELTA_COORDS);

    if (fieldFlags & 0x0001) { state.cacheId = s.buffer.readUInt16LE(s.offset); s.offset += 2; }
    if (fieldFlags & 0x0002) state.nLeftRect = this.readCoord(s, delta, state.nLeftRect);
    if (fieldFlags & 0x0004) state.nTopRect = this.readCoord(s, delta, state.nTopRect);
    if (fieldFlags & 0x0008) state.nWidthRect = this.readCoordUnsigned(s, delta, state.nWidthRect);
    if (fieldFlags & 0x0010) state.nHeightRect = this.readCoordUnsigned(s, delta, state.nHeightRect);
    if (fieldFlags & 0x0020) { state.bRop3 = s.buffer.readUInt8(s.offset); s.offset++; }
    if (fieldFlags & 0x0040) state.nXSrc = this.readCoord(s, delta, state.nXSrc);
    if (fieldFlags & 0x0080) state.nYSrc = this.readCoord(s, delta, state.nYSrc);
    if (fieldFlags & 0x0100) { state.cacheIndex = s.buffer.readUInt16LE(s.offset); s.offset += 2; }

    Object.assign(fields, state);
};

OrderParser.prototype.parseMem3Blt = function(s, controlFlags, fieldFlags, fields, state) {
    var delta = !!(controlFlags & ControlFlags.TS_DELTA_COORDS);

    if (fieldFlags & 0x0001) { state.cacheId = s.buffer.readUInt16LE(s.offset); s.offset += 2; }
    if (fieldFlags & 0x0002) state.nLeftRect = this.readCoord(s, delta, state.nLeftRect);
    if (fieldFlags & 0x0004) state.nTopRect = this.readCoord(s, delta, state.nTopRect);
    if (fieldFlags & 0x0008) state.nWidth = this.readCoordUnsigned(s, delta, state.nWidth);
    if (fieldFlags & 0x0010) state.nHeight = this.readCoordUnsigned(s, delta, state.nHeight);
    if (fieldFlags & 0x0020) { state.bRop = s.buffer.readUInt8(s.offset++); }
    if (fieldFlags & 0x0040) state.nXSrc = this.readCoord(s, delta, state.nXSrc);
    if (fieldFlags & 0x0080) state.nYSrc = this.readCoord(s, delta, state.nYSrc);
    if (fieldFlags & 0x0100) {
        var r = s.buffer.readUInt8(s.offset++);
        var g = s.buffer.readUInt8(s.offset++);
        var b = s.buffer.readUInt8(s.offset++);
        state.backColor = (r << 16) | (g << 8) | b;
    }
    if (fieldFlags & 0x0200) {
        var r = s.buffer.readUInt8(s.offset++);
        var g = s.buffer.readUInt8(s.offset++);
        var b = s.buffer.readUInt8(s.offset++);
        state.foreColor = (r << 16) | (g << 8) | b;
    }
    if (fieldFlags & 0x0400) { state.brushOrgX = s.buffer.readInt8(s.offset++); }
    if (fieldFlags & 0x0800) { state.brushOrgY = s.buffer.readInt8(s.offset++); }
    if (fieldFlags & 0x1000) { state.brushStyle = s.buffer.readUInt8(s.offset); s.offset++; }
    if (fieldFlags & 0x2000) { state.brushHatch = s.buffer.readUInt8(s.offset); s.offset++; }
    if (fieldFlags & 0x4000) {
        state.brushExtra = s.buffer.slice(s.offset, s.offset + 7);
        s.offset += 7;
    }
    if (fieldFlags & 0x8000) { state.cacheIndex = s.buffer.readUInt16LE(s.offset); s.offset += 2; }

    Object.assign(fields, state);
};

OrderParser.prototype.parseSecondaryOrder = function(s, controlFlags) {
    var length = s.buffer.readUInt16LE(s.offset);
    s.offset += 2;
    var extraFlags = s.buffer.readUInt16LE(s.offset);
    s.offset += 2;
    var orderType = s.buffer.readUInt8(s.offset);
    s.offset++;

    var dataLength = length - 6;
    var data = s.buffer.slice(s.offset, s.offset + dataLength);
    s.offset += dataLength;

    return {
        secondary: true,
        type: orderType,
        extraFlags: extraFlags,
        data: data
    };
};

module.exports = {
    OrderType: OrderType,
    OrderParser: OrderParser
};

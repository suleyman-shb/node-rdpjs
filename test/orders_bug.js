var orders = require('../lib/protocol/pdu/orders');
var type = require('../lib/core/type');
var assert = require('assert');

function testFieldFlagsDesync() {
    console.log('Testing Field Flags parsing desync...');
    var parser = new orders.OrderParser();

    // PatBlt Primary Order
    // Control byte: 0x01 (TS_STANDARD) | 0x08 (TS_TYPE_CHANGE) = 0x09
    // Order Type: 0x01 (TS_NEG_PATBLT_INDEX)

    // We want to send ONLY brushX (bit 7, 0x80).
    // In 7-bit encoded field flags, this is:
    // Byte 0: 0x80 (extension bit set, bits 0-6 are 0)
    // Byte 1: 0x01 (bit 7 set)

    // Total fields for PatBlt in current impl:
    // 0: nLeftRect (0x01)
    // 1: nTopRect (0x02)
    // 2: nWidthRect (0x04)
    // 3: nHeightRect (0x08)
    // 4: bRop3 (0x10)
    // 5: backColor (0x20)
    // 6: foreColor (0x40)
    // 7: brushX (0x80)
    // 8: brushY (0x100)
    // 9: brushStyle (0x200)
    // 10: brushHatch (0x400)
    // 11: brushExtra (0x800)

    var buffer = Buffer.from([
        0x09, 0x01, 0x80, 0x01,
        0x05, // brushX = 5
        0x11, 0x00 // Next order: control=0x11 (Delta Coords), fieldFlags=0x00 (Zero fields)
    ]);

    var s = new type.Stream(buffer);
    var results = parser.parse(s, 2);

    var order1 = results[0];
    console.log('Order 1 fields:', order1.fields);

    // In buggy version, fieldFlags = 0x0180.
    // It will read brushX (0x80) -> reads 0x05.
    // Then it will read brushY (0x100) -> reads 0x11 (from next order!). DESYNC!

    assert.strictEqual(order1.fields.brushX, 5, 'brushX should be 5');
    assert.strictEqual(order1.fields.brushY, undefined, 'brushY should not be set');
}

try {
    testFieldFlagsDesync();
    console.log('Test passed (unexpectedly)!');
} catch (e) {
    console.log('Test failed as expected:');
    console.log(e.message);
    if (e.actual !== undefined) {
        console.log('Actual:', e.actual, 'Expected:', e.expected);
    }
}

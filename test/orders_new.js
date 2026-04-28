var orders = require('../lib/protocol/pdu/orders');
var type = require('../lib/core/type');
var assert = require('assert');

function testMem3Blt() {
    console.log('Testing Mem3Blt parsing...');
    var parser = new orders.OrderParser();

    // Mem3Blt Primary Order
    // Control byte: 0x01 (TS_STANDARD) | 0x08 (TS_TYPE_CHANGE) = 0x09
    // Order Type: 0x04 (TS_NEG_MEM3BLT_INDEX)
    // Field Flags: 0xFFFF (all 16 fields present)
    // Field Flags (7-bit encoded): 0x80 (ext), 0x80 (ext), 0x03 (bits 14, 15)
    // Actually:
    // Byte 0: 0xFF (bits 0-6 are 1, 0x80 ext bit set)
    // Byte 1: 0xFF (bits 7-13 are 1, 0x80 ext bit set)
    // Byte 2: 0x03 (bits 14, 15 are 1)

    var buffer = Buffer.from([
        0x09, 0x04, 0xFF, 0xFF, 0x03,
        0x01, 0x00, // cacheId: 1
        0x0A, 0x00, // nLeftRect: 10
        0x14, 0x00, // nTopRect: 20
        0x64, 0x00, // nWidthRect: 100
        0x32, 0x00, // nHeightRect: 50
        0xCC,       // bRop3: 0xCC
        0x00, 0x00, // nXSrc: 0
        0x00, 0x00, // nYSrc: 0
        0x00, 0x00, 0xFF, // backColor: Red
        0xFF, 0xFF, 0xFF, // foreColor: White
        0x00,       // brushX: 0
        0x00,       // brushY: 0
        0x00,       // brushStyle: 0
        0x00,       // brushHatch: 0
        0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, // brushExtra: 7 bytes
        0x05, 0x00  // cacheIndex: 5
    ]);

    var s = new type.Stream(buffer);
    var result = parser.parse(s, 1);

    assert.strictEqual(result.length, 1);
    var order = result[0];
    assert.strictEqual(order.type, orders.OrderType.TS_NEG_MEM3BLT_INDEX);
    assert.strictEqual(order.fields.cacheId, 1);
    assert.strictEqual(order.fields.nLeftRect, 10);
    assert.strictEqual(order.fields.bRop3, 0xCC);
    assert.strictEqual(order.fields.backColor, 0xFF0000);
    assert.strictEqual(order.fields.cacheIndex, 5);
    assert.deepStrictEqual(order.fields.brushExtra, Buffer.from([1, 2, 3, 4, 5, 6, 7]));

    console.log('Mem3Blt test passed!');
}

function testMultiOpaqueRect() {
    console.log('Testing MultiOpaqueRect parsing...');
    var parser = new orders.OrderParser();

    // MultiOpaqueRect Primary Order
    // Control byte: 0x09, Type: 0x12 (TS_NEG_MULTIOPAQUERECT_INDEX)
    // Field Flags: 0x7F (all 7 fields)
    // Byte 0: 0x7F

    // Fields:
    // nLeftRect: 10
    // nTopRect: 10
    // nWidthRect: 100
    // nHeightRect: 100
    // colorIndex: 0xFF0000
    // numRectangles: 1 (additional rectangle)
    // cbData: size of delta list
    //   Delta 1: left=5, top=5, width=0, height=0
    //   Packed values for 5, 5, 0, 0: 0x05, 0x05, 0x00, 0x00 (4 bytes)

    var buffer = Buffer.from([
        0x09, 0x12, 0x7F,
        0x0A, 0x00, 0x0A, 0x00, 0x64, 0x00, 0x64, 0x00,
        0x00, 0x00, 0xFF,
        0x01, // numRectangles
        0x04, // cbData
        0x05, 0x05, 0x00, 0x00
    ]);

    var s = new type.Stream(buffer);
    var result = parser.parse(s, 1);
    var order = result[0];

    assert.strictEqual(order.type, orders.OrderType.TS_NEG_MULTIOPAQUERECT_INDEX);
    assert.strictEqual(order.fields.nLeftRect, 10);
    assert.strictEqual(order.fields.numRectangles, 1);
    assert.strictEqual(order.fields.rectangles.length, 2);

    // Rect 0
    assert.strictEqual(order.fields.rectangles[0].left, 10);
    assert.strictEqual(order.fields.rectangles[0].top, 10);

    // Rect 1 (accumulated)
    assert.strictEqual(order.fields.rectangles[1].left, 15);
    assert.strictEqual(order.fields.rectangles[1].top, 15);
    assert.strictEqual(order.fields.rectangles[1].width, 100);
    assert.strictEqual(order.fields.rectangles[1].height, 100);

    console.log('MultiOpaqueRect test passed!');
}

function testSharedState() {
    console.log('Testing Shared State between OpaqueRect and MultiOpaqueRect...');
    var parser = new orders.OrderParser();

    // 1. Send OpaqueRect
    var buffer1 = Buffer.from([
        0x09, 0x0A, 0x1F,
        0x0A, 0x00, 0x0A, 0x00, 0x64, 0x00, 0x64, 0x00,
        0x00, 0x00, 0xFF
    ]);
    parser.parse(new type.Stream(buffer1), 1);

    // 2. Send MultiOpaqueRect with Delta Coords
    // Control: 0x01 | 0x10 = 0x11
    // Type NOT changed (still OpaqueRect but now we send 0x12)
    // Wait, type change is required if we want to change from 0x0A to 0x12

    var buffer2 = Buffer.from([
        0x19, 0x12, 0x03, // Delta, Type Change, Field flags 0x03 (Left, Top)
        0x05, 0x05 // delta +5, +5
    ]);

    var result = parser.parse(new type.Stream(buffer2), 1);
    var order = result[0];

    assert.strictEqual(order.fields.nLeftRect, 15);
    assert.strictEqual(order.fields.nTopRect, 15);
    assert.strictEqual(order.fields.colorIndex, 0xFF0000); // Should be inherited

    console.log('Shared state test passed!');
}

try {
    testMem3Blt();
    testMultiOpaqueRect();
    testSharedState();
} catch (e) {
    console.error('Test failed!');
    console.error(e);
    process.exit(1);
}

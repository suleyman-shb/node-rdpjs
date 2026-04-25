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
    // 16 fields -> 3 flag bytes:
    //   Byte 1: 0xFF (flags 0-6, + extension bit)
    //   Byte 2: 0xFF (flags 7-13, + extension bit)
    //   Byte 3: 0x03 (flags 14-15)

    // Fields:
    //   cacheId: 1 (0x0001)
    //   nLeftRect: 10 (0x000A)
    //   nTopRect: 10 (0x000A)
    //   nWidthRect: 32 (0x0020)
    //   nHeightRect: 32 (0x0020)
    //   bRop3: 0xCC
    //   nXSrc: 0 (0x0000)
    //   nYSrc: 0 (0x0000)
    //   backColor: 0x000000
    //   foreColor: 0xFFFFFF
    //   brushX: 0
    //   brushY: 0
    //   brushStyle: 0
    //   brushHatch: 0
    //   brushExtra: 7 bytes of 0
    //   cacheIndex: 5 (0x0005)

    var buffer = Buffer.from([
        0x09, 0x04, 0xFF, 0xFF, 0x03,
        0x01, 0x00,
        0x0A, 0x00, 0x0A, 0x00, 0x20, 0x00, 0x20, 0x00,
        0xCC,
        0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00,
        0xFF, 0xFF, 0xFF,
        0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x05, 0x00
    ]);

    var s = new type.Stream(buffer);
    var result = parser.parse(s, 1);

    assert.strictEqual(result.length, 1);
    var order = result[0];
    assert.strictEqual(order.type, orders.OrderType.TS_NEG_MEM3BLT_INDEX);
    assert.strictEqual(order.fields.cacheId, 1);
    assert.strictEqual(order.fields.nLeftRect, 10);
    assert.strictEqual(order.fields.bRop3, 0xCC);
    assert.strictEqual(order.fields.foreColor, 0xFFFFFF);
    assert.strictEqual(order.fields.brushExtra.length, 7);
    assert.strictEqual(order.fields.cacheIndex, 5);

    console.log('Mem3Blt test passed!');
}

function testMultiOpaqueRect() {
    console.log('Testing MultiOpaqueRect parsing...');
    var parser = new orders.OrderParser();

    // MultiOpaqueRect Primary Order
    // Control byte: 0x01 (TS_STANDARD) | 0x08 (TS_TYPE_CHANGE) = 0x09
    // Order Type: 0x12 (TS_NEG_MULTIOPAQUERECT_INDEX)
    // Field Flags: 0xFF (all 8 fields present)
    // 8 fields -> 2 flag bytes:
    //   Byte 1: 0xFF (flags 0-6, + extension bit)
    //   Byte 2: 0x01 (flag 7)

    // Fields:
    //   nLeftRect: 10
    //   nTopRect: 10
    //   nWidthRect: 100
    //   nHeightRect: 100
    //   colorIndex: 0x00FF00
    //   numRectangles: 2
    //   cbData: 8
    //   rectangles: 2 rectangles
    //     rect 1 deltas: 5, 5, 20, 20 -> accumulated: 15, 15, 120, 120
    //     rect 2 deltas: 10, 10, 30, 30 -> accumulated: 25, 25, 150, 150

    var buffer = Buffer.from([
        0x09, 0x12, 0xFF, 0x01,
        0x0A, 0x00, 0x0A, 0x00, 0x64, 0x00, 0x64, 0x00,
        0x00, 0xFF, 0x00,
        0x02,
        0x08,
        0x05, 0x05, 0x14, 0x14,
        0x0A, 0x0A, 0x1E, 0x1E
    ]);

    var s = new type.Stream(buffer);
    var result = parser.parse(s, 1);

    assert.strictEqual(result.length, 1);
    var order = result[0];
    assert.strictEqual(order.type, orders.OrderType.TS_NEG_MULTIOPAQUERECT_INDEX);
    assert.strictEqual(order.fields.nLeftRect, 10);
    assert.strictEqual(order.fields.colorIndex, 0x00FF00);
    assert.strictEqual(order.fields.numRectangles, 2);
    assert.strictEqual(order.fields.rectangles.length, 2);
    assert.strictEqual(order.fields.rectangles[0].left, 15);
    assert.strictEqual(order.fields.rectangles[1].width, 150);

    console.log('MultiOpaqueRect test passed!');
}

function testMultiOpaqueRectPacked() {
    console.log('Testing MultiOpaqueRect with packed values...');
    var parser = new orders.OrderParser();

    // MultiOpaqueRect with 2-byte packed values and negative values
    // numRectangles: 1
    // cbData: 5 (2 + 1 + 1 + 1)
    // rect deltas: 1000, -10, 50, 50 -> accumulated (from 0,0,0,0): 1000, -10, 50, 50
    // 1000 -> 0x3E8 -> 0x83, 0xE8
    // -10 -> 0x40 | 0x0A = 0x4A

    var buffer = Buffer.from([
        0x09, 0x12, 0xFF, 0x01,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00,
        0x01,
        0x05,
        0x83, 0xE8, 0x4A, 0x32, 0x32
    ]);

    var s = new type.Stream(buffer);
    var result = parser.parse(s, 1);

    var rect = result[0].fields.rectangles[0];
    assert.strictEqual(rect.left, 1000);
    assert.strictEqual(rect.top, -10);
    assert.strictEqual(rect.width, 50);
    assert.strictEqual(rect.height, 50);

    console.log('MultiOpaqueRect packed values test passed!');
}

try {
    testMem3Blt();
    testMultiOpaqueRect();
    testMultiOpaqueRectPacked();
    console.log('All new tests passed!');
} catch (e) {
    console.error('Test failed!');
    console.error(e);
    process.exit(1);
}

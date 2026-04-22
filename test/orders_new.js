var orders = require('../lib/protocol/pdu/orders');
var type = require('../lib/core/type');
var log = require('../lib/core/log');
var assert = require('assert');

log.level = log.Levels.DEBUG;

function testMultiOpaqueRect() {
    console.log('Testing MultiOpaqueRect parsing...');
    var parser = new orders.OrderParser();

    // MultiOpaqueRect Primary Order
    // Control byte: 0x01 (TS_STANDARD) | 0x08 (TS_TYPE_CHANGE) = 0x09
    // Order Type: 0x12 (TS_NEG_MULTIOPAQUERECT_INDEX)
    // Field Flags: 0x7F (all 7 fields present)
    // Fields:
    //   nLeftRect: 10
    //   nTopRect: 10
    //   nWidthRect: 100
    //   nHeightRect: 100
    //   colorIndex: 0x00FF0000 (Red)
    //   numRects: 3
    //   rects (Coded Delta List):
    //     Rect 1: Base (10, 10, 100, 100)
    //     Rect 2 delta: L:+5, T:+5, W:0, H:0 -> (15, 15, 100, 100)
    //       Packed values: 0x05, 0x05, 0x00, 0x00
    //     Rect 3 delta: L:-2, T:-2, W:+10, H:+10 -> (13, 13, 110, 110)
    //       Packed values: 0x42, 0x42, 0x0A, 0x0A

    var buffer = Buffer.from([
        0x09, 0x12, 0x7F,
        0x0A, 0x00, 0x0A, 0x00, 0x64, 0x00, 0x64, 0x00,
        0x00, 0x00, 0xFF,
        0x03,
        0x05, 0x05, 0x00, 0x00,
        0x42, 0x42, 0x0A, 0x0A
    ]);

    var s = new type.Stream(buffer);
    var result = parser.parse(s, 1);

    assert.strictEqual(result.length, 1);
    var order = result[0];
    assert.strictEqual(order.type, orders.OrderType.TS_NEG_MULTIOPAQUERECT_INDEX);
    assert.strictEqual(order.fields.numRects, 3);
    assert.strictEqual(order.fields.rects.length, 3);

    assert.deepStrictEqual(order.fields.rects[0], {
        nLeftRect: 10, nTopRect: 10, nWidthRect: 100, nHeightRect: 100
    });
    assert.deepStrictEqual(order.fields.rects[1], {
        nLeftRect: 15, nTopRect: 15, nWidthRect: 100, nHeightRect: 100
    });
    assert.deepStrictEqual(order.fields.rects[2], {
        nLeftRect: 13, nTopRect: 13, nWidthRect: 110, nHeightRect: 110
    });

    console.log('MultiOpaqueRect test passed!');
}

function testMem3Blt() {
    console.log('Testing Mem3Blt parsing...');
    var parser = new orders.OrderParser();

    // Mem3Blt Primary Order
    // Control byte: 0x01 (TS_STANDARD) | 0x08 (TS_TYPE_CHANGE) = 0x09
    // Order Type: 0x04 (TS_NEG_MEM3BLT_INDEX)
    // Field Flags: 0x3FFF (all 14 fields present) -> 0xFF, 0x3F
    // Fields:
    //   cacheId: 2
    //   nLeftRect: 0
    //   nTopRect: 0
    //   nWidthRect: 64
    //   nHeightRect: 64
    //   bRop3: 0xCC
    //   nXSrc: 0
    //   nYSrc: 0
    //   brushX: 0
    //   brushY: 0
    //   brushStyle: 0
    //   brushHatch: 0
    //   brushExtra: 7 bytes of 0
    //   cacheIndex: 10

    var buffer = Buffer.from([
        0x09, 0x04, 0xFF, 0x3F,
        0x02, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x40, 0x00, 0x40, 0x00,
        0xCC,
        0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x0A, 0x00
    ]);

    var s = new type.Stream(buffer);
    var result = parser.parse(s, 1);

    assert.strictEqual(result.length, 1);
    var order = result[0];
    assert.strictEqual(order.type, orders.OrderType.TS_NEG_MEM3BLT_INDEX);
    assert.strictEqual(order.fields.cacheId, 2);
    assert.strictEqual(order.fields.bRop3, 0xCC);
    assert.strictEqual(order.fields.cacheIndex, 10);

    console.log('Mem3Blt test passed!');
}

try {
    testMultiOpaqueRect();
    testMem3Blt();
    console.log('All new tests passed!');
} catch (e) {
    console.error('Test failed!');
    console.error(e);
    process.exit(1);
}

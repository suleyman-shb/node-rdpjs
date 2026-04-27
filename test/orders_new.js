var orders = require('../lib/protocol/pdu/orders');
var type = require('../lib/core/type');
var log = require('../lib/core/log');
var assert = require('assert');

log.level = log.Levels.DEBUG;

function testMem3Blt() {
    console.log('Testing Mem3Blt parsing...');
    var parser = new orders.OrderParser();

    // Mem3Blt Primary Order
    // Control byte: 0x01 (TS_STANDARD) | 0x08 (TS_TYPE_CHANGE) = 0x09
    // Order Type: 0x04 (TS_NEG_MEM3BLT_INDEX)
    // Field Flags: 0xFFFF (all 16 fields present)
    // Field Flags Bytes: 0xFF, 0xFF, 0x03 (7-bit chunks: 0x7F, 0x7F, 0x03 -> 0x7F | (0x7F << 7) | (0x03 << 14) = 0xFFFF)
    // Fields:
    //   cacheId: 1
    //   nLeftRect: 10
    //   nTopRect: 10
    //   nWidthRect: 32
    //   nHeightRect: 32
    //   bRop3: 0xCC
    //   nXSrc: 0
    //   nYSrc: 0
    //   backColor: 0x000000
    //   foreColor: 0xFFFFFF
    //   brushX: 0
    //   brushY: 0
    //   brushStyle: 0
    //   brushHatch: 0
    //   brushExtra: 7 bytes
    //   cacheIndex: 5

    var buffer = Buffer.from([
        0x09, 0x04, 0xFF, 0xFF, 0x03,
        0x01, 0x00,
        0x0A, 0x00, 0x0A, 0x00, 0x20, 0x00, 0x20, 0x00,
        0xCC,
        0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00,
        0xFF, 0xFF, 0xFF,
        0x00, 0x00, 0x00, 0x00,
        0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07,
        0x05, 0x00
    ]);

    var s = new type.Stream(buffer);
    var result = parser.parse(s, 1);

    assert.strictEqual(result.length, 1);
    var order = result[0];
    assert.strictEqual(order.type, orders.OrderType.TS_NEG_MEM3BLT_INDEX);
    assert.strictEqual(order.fields.cacheId, 1);
    assert.strictEqual(order.fields.bRop3, 0xCC);
    assert.strictEqual(order.fields.foreColor, 0xFFFFFF);
    assert.strictEqual(order.fields.brushExtra[0], 0x01);
    assert.strictEqual(order.fields.cacheIndex, 5);

    console.log('Mem3Blt test passed!');
}

function testMultiOpaqueRect() {
    console.log('Testing MultiOpaqueRect parsing...');
    var parser = new orders.OrderParser();

    // MultiOpaqueRect Primary Order
    // Control byte: 0x01 (TS_STANDARD) | 0x08 (TS_TYPE_CHANGE) = 0x09
    // Order Type: 0x12 (TS_NEG_MULTIOPAQUERECT_INDEX)
    // Field Flags: 0x7F (all 7 fields present)
    // Fields:
    //   nLeftRect: 10
    //   nTopRect: 20
    //   nWidthRect: 100
    //   nHeightRect: 50
    //   colorIndex: 0x00FF0000 (Red)
    //   numRectangles: 2 (2 additional rectangles)
    //   cbData: 8 (each rectangle is 4 bytes minimum, let's say 4 deltas each)
    //   rectData: ...

    // Delta rects:
    // 1: left=5, top=5, width=10, height=10
    //    Packed: 0x05, 0x05, 0x0A, 0x0A (all < 0x40, so 1 byte each)
    // 2: left=-5, top=-5, width=20, height=20
    //    Packed: 0x45, 0x45, 0x14, 0x14 (0x40 bit set for negative)

    var buffer = Buffer.from([
        0x09, 0x12, 0xFF, 0x01,
        0x0A, 0x00, 0x14, 0x00, 0x64, 0x00, 0x32, 0x00,
        0x00, 0x00, 0xFF,
        0x02,
        0x08,
        0x05, 0x05, 0x0A, 0x0A,
        0x45, 0x45, 0x14, 0x14
    ]);

    var s = new type.Stream(buffer);
    var result = parser.parse(s, 1);

    assert.strictEqual(result.length, 1);
    var order = result[0];
    assert.strictEqual(order.type, orders.OrderType.TS_NEG_MULTIOPAQUERECT_INDEX);
    assert.strictEqual(order.fields.numRectangles, 2);
    assert.strictEqual(order.fields.rectData.length, 2);
    assert.strictEqual(order.fields.rectData[0].left, 5);
    assert.strictEqual(order.fields.rectData[1].top, -5);

    // Verify it shares state with OpaqueRect
    var opaqueState = parser.orderState[orders.OrderType.TS_NEG_OPAQUERECT_INDEX];
    assert.strictEqual(opaqueState.nLeftRect, 10);

    console.log('MultiOpaqueRect test passed!');
}

try {
    testMem3Blt();
    testMultiOpaqueRect();
    console.log('All new tests passed!');
} catch (e) {
    console.error('Test failed!');
    console.error(e);
    process.exit(1);
}

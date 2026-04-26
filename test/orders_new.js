var orders = require('../lib/protocol/pdu/orders');
var type = require('../lib/core/type');
var log = require('../lib/core/log');
var assert = require('assert');

log.level = log.Levels.DEBUG;

function testMem3Blt() {
    console.log('Testing Mem3Blt parsing...');
    var parser = new orders.OrderParser();

    // Mem3Blt Primary Order (Type 0x04)
    // Control byte: 0x01 (TS_STANDARD) | 0x08 (TS_TYPE_CHANGE) = 0x09
    // Order Type: 0x04 (TS_NEG_MEM3BLT_INDEX)
    // Field Flags: 0xFFFF (all 16 fields present)
    // Bytes: 0xFF, 0xFF
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
    //   brushExtra: 7 bytes of 0xAA
    //   cacheIndex: 5 (0x0005)

    var buffer = Buffer.from([
        0x09, 0x04, 0xFF, 0xFF, 0x00,
        0x01, 0x00, // cacheId
        0x0A, 0x00, // nLeftRect
        0x0A, 0x00, // nTopRect
        0x20, 0x00, // nWidthRect
        0x20, 0x00, // nHeightRect
        0xCC,       // bRop3
        0x00, 0x00, // nXSrc
        0x00, 0x00, // nYSrc
        0x00, 0x00, 0x00, // backColor (B, G, R)
        0xFF, 0xFF, 0xFF, // foreColor
        0x00,       // brushX
        0x00,       // brushY
        0x00,       // brushStyle
        0x00,       // brushHatch
        0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, // brushExtra
        0x05, 0x00  // cacheIndex
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
    assert.strictEqual(order.fields.brushExtra[0], 0xAA);
    assert.strictEqual(order.fields.cacheIndex, 5);

    console.log('Mem3Blt test passed!');
}

function testMultiOpaqueRect() {
    console.log('Testing MultiOpaqueRect parsing...');
    var parser = new orders.OrderParser();

    // MultiOpaqueRect Primary Order (Type 0x12)
    // Control byte: 0x01 (TS_STANDARD) | 0x08 (TS_TYPE_CHANGE) = 0x09
    // Order Type: 0x12 (TS_NEG_MULTIOPAQUERECT_INDEX)
    // Field Flags: 0x7F (all 7 fields present)
    // Fields:
    //   nLeftRect: 10 (0x000A)
    //   nTopRect: 10 (0x000A)
    //   nWidthRect: 50 (0x0032)
    //   nHeightRect: 50 (0x0032)
    //   colorIndex: 0x0000FF (Blue) -> B:FF, G:00, R:00
    //   numRectangles: 2 (additional rectangles)
    //   cbData: length of codedDeltaList

    // codedDeltaList:
    // Rect 1 (delta from base 10,10,50,50):
    //   L: +10 (0x0A), T: +0 (0x00), W: +0 (0x00), H: +0 (0x00) -> (20,10,50,50)
    // Rect 2 (delta from Rect 1 20,10,50,50):
    //   L: +0 (0x00), T: +10 (0x0A), W: -10 (0x4A), H: -10 (0x4A) -> (20,20,40,40)
    // Total cbData = 4 + 4 = 8 bytes

    var buffer = Buffer.from([
        0x09, 0x12, 0x7F,
        0x0A, 0x00, 0x0A, 0x00, 0x32, 0x00, 0x32, 0x00,
        0xFF, 0x00, 0x00,
        0x02, // numRectangles
        0x08, // cbData
        // codedDeltaList
        0x0A, 0x00, 0x00, 0x00, // Rect 1 deltas
        0x00, 0x0A, 0x4A, 0x4A  // Rect 2 deltas
    ]);

    var s = new type.Stream(buffer);
    var result = parser.parse(s, 1);

    assert.strictEqual(result.length, 1);
    var order = result[0];
    assert.strictEqual(order.type, orders.OrderType.TS_NEG_MULTIOPAQUERECT_INDEX);
    assert.strictEqual(order.fields.numRectangles, 2);
    assert.strictEqual(order.fields.rectangles.length, 3); // Base + 2 additional

    // Base rect
    assert.strictEqual(order.fields.rectangles[0].nLeftRect, 10);
    assert.strictEqual(order.fields.rectangles[0].nWidthRect, 50);

    // Rect 1
    assert.strictEqual(order.fields.rectangles[1].nLeftRect, 20);
    assert.strictEqual(order.fields.rectangles[1].nTopRect, 10);

    // Rect 2
    assert.strictEqual(order.fields.rectangles[2].nLeftRect, 20);
    assert.strictEqual(order.fields.rectangles[2].nTopRect, 20);
    assert.strictEqual(order.fields.rectangles[2].nWidthRect, 40);
    assert.strictEqual(order.fields.rectangles[2].nHeightRect, 40);

    console.log('MultiOpaqueRect test passed!');
}

function testMultiOpaqueRectSharedState() {
    console.log('Testing MultiOpaqueRect shared state with OpaqueRect...');
    var parser = new orders.OrderParser();

    // Initial OpaqueRect to set state
    var buffer1 = Buffer.from([
        0x09, 0x0A, 0x0F,
        0x64, 0x00, 0x64, 0x00, 0x32, 0x00, 0x32, 0x00
    ]);
    parser.parse(new type.Stream(buffer1), 1);

    // MultiOpaqueRect with Delta Coords
    // Control byte: 0x11 (TS_STANDARD | TS_DELTA_COORDS)
    // Type change: 0x12
    // Field Flags: 0x03 (nLeftRect, nTopRect)
    // numRectangles and cbData should be 0 from state (initialized)
    var buffer2 = Buffer.from([
        0x19, 0x12, 0x03,
        0x0A, 0x0A // Deltas: +10, +10 -> (110, 110)
    ]);

    var result = parser.parse(new type.Stream(buffer2), 1);
    var order = result[0];
    assert.strictEqual(order.fields.nLeftRect, 110);
    assert.strictEqual(order.fields.nTopRect, 110);
    assert.strictEqual(order.fields.nWidthRect, 50);
    assert.strictEqual(order.fields.nHeightRect, 50);

    console.log('MultiOpaqueRect shared state test passed!');
}

try {
    testMem3Blt();
    testMultiOpaqueRect();
    testMultiOpaqueRectSharedState();
    console.log('All new tests passed!');
} catch (e) {
    console.error('Test failed!');
    console.error(e);
    process.exit(1);
}

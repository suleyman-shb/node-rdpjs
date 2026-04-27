var orders = require('../lib/protocol/pdu/orders');
var type = require('../lib/core/type');
var log = require('../lib/core/log');
var assert = require('assert');

log.level = log.Levels.DEBUG;

function testOpaqueRect() {
    console.log('Testing OpaqueRect parsing...');
    var parser = new orders.OrderParser();

    // OpaqueRect Primary Order
    // Control byte: 0x01 (TS_STANDARD) | 0x08 (TS_TYPE_CHANGE) = 0x09
    // Order Type: 0x0A (TS_NEG_OPAQUERECT_INDEX)
    // Field Flags: 0x1F (all 5 fields present)
    // Fields:
    //   nLeftRect: 10 (0x000A)
    //   nTopRect: 20 (0x0014)
    //   nWidthRect: 100 (0x0064)
    //   nHeightRect: 50 (0x0032)
    //   colorIndex: 0x00FF0000 (Red) -> B:00, G:00, R:FF

    var buffer = Buffer.from([
        0x09, 0x0A, 0x1F,
        0x0A, 0x00, 0x14, 0x00, 0x64, 0x00, 0x32, 0x00,
        0x00, 0x00, 0xFF
    ]);

    var s = new type.Stream(buffer);
    var result = parser.parse(s, 1);

    assert.strictEqual(result.length, 1);
    var order = result[0];
    assert.strictEqual(order.type, orders.OrderType.TS_NEG_OPAQUERECT_INDEX);
    assert.strictEqual(order.fields.nLeftRect, 10);
    assert.strictEqual(order.fields.nTopRect, 20);
    assert.strictEqual(order.fields.nWidthRect, 100);
    assert.strictEqual(order.fields.nHeightRect, 50);
    assert.strictEqual(order.fields.colorIndex, 0xFF0000);

    console.log('OpaqueRect test passed!');
}

function testDeltaCoords() {
    console.log('Testing Delta Coords parsing...');
    var parser = new orders.OrderParser();

    // Initial OpaqueRect to set state
    var buffer1 = Buffer.from([
        0x09, 0x0A, 0x0F, // Standard, Type Change, Field flags 0x0F (Left, Top, Width, Height)
        0x0A, 0x00, 0x14, 0x00, 0x64, 0x00, 0x32, 0x00
    ]);
    parser.parse(new type.Stream(buffer1), 1);

    // Delta OpaqueRect
    // Control byte: 0x01 (TS_STANDARD) | 0x10 (TS_DELTA_COORDS) = 0x11
    // Field Flags: 0x03 (Left, Top)
    // Fields:
    //   nLeftRect delta: 5 -> 10 + 5 = 15
    //   nTopRect delta: -2 -> 20 - 2 = 18
    var buffer2 = Buffer.from([
        0x11, 0x03,
        0x05, 0xFE // 0xFE is -2 in Int8
    ]);

    var result = parser.parse(new type.Stream(buffer2), 1);
    var order = result[0];
    assert.strictEqual(order.fields.nLeftRect, 15);
    assert.strictEqual(order.fields.nTopRect, 18);
    assert.strictEqual(order.fields.nWidthRect, 100); // Should remain same
    assert.strictEqual(order.fields.nHeightRect, 50); // Should remain same

    console.log('Delta Coords test passed!');
}

function testScrBlt() {
    console.log('Testing ScrBlt parsing...');
    var parser = new orders.OrderParser();

    // ScrBlt Primary Order
    // Control byte: 0x01 (TS_STANDARD) | 0x08 (TS_TYPE_CHANGE) = 0x09
    // Order Type: 0x02 (TS_NEG_SCRBLT_INDEX)
    // Field Flags: 0x7F (all 7 fields present)
    // Fields:
    //   nLeftRect: 50 (0x0032)
    //   nTopRect: 60 (0x003C)
    //   nWidthRect: 200 (0x00C8)
    //   nHeightRect: 150 (0x0096)
    //   bRop3: 0xCC (SRCCOPY)
    //   nXSrc: 0 (0x0000)
    //   nYSrc: 0 (0x0000)

    var buffer = Buffer.from([
        0x09, 0x02, 0x7F,
        0x32, 0x00, 0x3C, 0x00, 0xC8, 0x00, 0x96, 0x00,
        0xCC,
        0x00, 0x00, 0x00, 0x00
    ]);

    var s = new type.Stream(buffer);
    var result = parser.parse(s, 1);

    assert.strictEqual(result.length, 1);
    var order = result[0];
    assert.strictEqual(order.type, orders.OrderType.TS_NEG_SCRBLT_INDEX);
    assert.strictEqual(order.fields.nLeftRect, 50);
    assert.strictEqual(order.fields.nTopRect, 60);
    assert.strictEqual(order.fields.nWidthRect, 200);
    assert.strictEqual(order.fields.nHeightRect, 150);
    assert.strictEqual(order.fields.bRop3, 0xCC);
    assert.strictEqual(order.fields.nXSrc, 0);
    assert.strictEqual(order.fields.nYSrc, 0);

    console.log('ScrBlt test passed!');
}

function testMemBlt() {
    console.log('Testing MemBlt parsing...');
    var parser = new orders.OrderParser();

    // MemBlt Primary Order
    // Control byte: 0x01 (TS_STANDARD) | 0x08 (TS_TYPE_CHANGE) = 0x09
    // Order Type: 0x03 (TS_NEG_MEMBLT_INDEX)
    // Field Flags: 0x01FF (all 9 fields present, requires 2 bytes field flags)
    // Field Flags Bytes: 0xFF, 0x03 (7-bit chunks + extension bit)
    // Fields:
    //   cacheId: 1 (0x0001)
    //   nLeftRect: 10 (0x000A)
    //   nTopRect: 10 (0x000A)
    //   nWidthRect: 32 (0x0020)
    //   nHeightRect: 32 (0x0020)
    //   bRop3: 0xCC
    //   nXSrc: 0 (0x0000)
    //   nYSrc: 0 (0x0000)
    //   cacheIndex: 5 (0x0005)

    var buffer = Buffer.from([
        0x09, 0x03, 0xFF, 0x03,
        0x01, 0x00,
        0x0A, 0x00, 0x0A, 0x00, 0x20, 0x00, 0x20, 0x00,
        0xCC,
        0x00, 0x00, 0x00, 0x00,
        0x05, 0x00
    ]);

    var s = new type.Stream(buffer);
    var result = parser.parse(s, 1);

    assert.strictEqual(result.length, 1);
    var order = result[0];
    assert.strictEqual(order.type, orders.OrderType.TS_NEG_MEMBLT_INDEX);
    assert.strictEqual(order.fields.cacheId, 1);
    assert.strictEqual(order.fields.nLeftRect, 10);
    assert.strictEqual(order.fields.cacheIndex, 5);

    console.log('MemBlt test passed!');
}

function testBounds() {
    console.log('Testing Bounds parsing...');
    var parser = new orders.OrderParser();

    // OpaqueRect with Bounds
    // Control byte: 0x01 (TS_STANDARD) | 0x04 (TS_BOUNDS) = 0x05
    // Bounds Flags: 0x0F (Left, Top, Right, Bottom present)
    // Bounds: 0, 0, 800, 600
    // Field Flags: 0x0F
    // Fields: 0, 0, 100, 100
    var buffer = Buffer.from([
        0x05,
        0x0F, 0x00, 0x00, 0x00, 0x00, 0x20, 0x03, 0x58, 0x02, // Bounds
        0x0F, // Field flags
        0x00, 0x00, 0x00, 0x00, 0x64, 0x00, 0x64, 0x00
    ]);

    var s = new type.Stream(buffer);
    var result = parser.parse(s, 1);

    assert.strictEqual(result.length, 1);
    var order = result[0];
    assert.notStrictEqual(order.bounds, null);
    assert.strictEqual(order.bounds.left, 0);
    assert.strictEqual(order.bounds.right, 800);
    assert.strictEqual(order.bounds.bottom, 600);

    console.log('Bounds test passed!');
}

function testPatBlt() {
    console.log('Testing PatBlt parsing...');
    var parser = new orders.OrderParser();

    // PatBlt Primary Order
    // Control byte: 0x01 (TS_STANDARD) | 0x08 (TS_TYPE_CHANGE) = 0x09
    // Order Type: 0x01 (TS_NEG_PATBLT_INDEX)
    // Field Flags: 0x0FFF (all 12 fields present)
    // Field Flags Bytes: 0xFF, 0x1F (7-bit chunks + extension bit)
    // Fields:
    //   nLeftRect: 10
    //   nTopRect: 10
    //   nWidthRect: 100
    //   nHeightRect: 100
    //   bRop3: 0xCC
    //   backColor: 0x000000 (Black)
    //   foreColor: 0xFFFFFF (White)
    //   brushX: 0
    //   brushY: 0
    //   brushStyle: 0
    //   brushHatch: 0
    //   brushExtra: 7 bytes of 0

    var buffer = Buffer.from([
        0x09, 0x01, 0xFF, 0x1F,
        0x0A, 0x00, 0x0A, 0x00, 0x64, 0x00, 0x64, 0x00,
        0xCC,
        0x00, 0x00, 0x00,
        0xFF, 0xFF, 0xFF,
        0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
    ]);

    var s = new type.Stream(buffer);
    var result = parser.parse(s, 1);

    assert.strictEqual(result.length, 1);
    var order = result[0];
    assert.strictEqual(order.type, orders.OrderType.TS_NEG_PATBLT_INDEX);
    assert.strictEqual(order.fields.nLeftRect, 10);
    assert.strictEqual(order.fields.bRop3, 0xCC);
    assert.strictEqual(order.fields.brushStyle, 0);
    assert.strictEqual(order.fields.brushExtra.length, 7);

    console.log('PatBlt test passed!');
}

function testDstBlt() {
    console.log('Testing DstBlt parsing...');
    var parser = new orders.OrderParser();

    // DstBlt Primary Order
    // Control byte: 0x01 (TS_STANDARD) | 0x08 (TS_TYPE_CHANGE) = 0x09
    // Order Type: 0x00 (TS_NEG_DSTBLT_INDEX)
    // Field Flags: 0x1F (all 5 fields present)
    // Fields:
    //   nLeftRect: 5
    //   nTopRect: 5
    //   nWidthRect: 50
    //   nHeightRect: 50
    //   bRop3: 0x00 (BLACKNESS)

    var buffer = Buffer.from([
        0x09, 0x00, 0x1F,
        0x05, 0x00, 0x05, 0x00, 0x32, 0x00, 0x32, 0x00,
        0x00
    ]);

    var s = new type.Stream(buffer);
    var result = parser.parse(s, 1);

    assert.strictEqual(result.length, 1);
    var order = result[0];
    assert.strictEqual(order.type, orders.OrderType.TS_NEG_DSTBLT_INDEX);
    assert.strictEqual(order.fields.nLeftRect, 5);
    assert.strictEqual(order.fields.bRop3, 0x00);

    console.log('DstBlt test passed!');
}

function testLineTo() {
    console.log('Testing LineTo parsing...');
    var parser = new orders.OrderParser();

    // LineTo Primary Order
    // Control byte: 0x01 (TS_STANDARD) | 0x08 (TS_TYPE_CHANGE) = 0x09
    // Order Type: 0x08 (TS_NEG_LINETO_INDEX)
    // Field Flags: 0x03FF (all 10 fields present)
    // Field Flags Bytes: 0xFF, 0x07 (7-bit chunks + extension bit)
    // Fields:
    //   mixMode: 1
    //   nXStart: 0
    //   nYStart: 0
    //   nXEnd: 100
    //   nYEnd: 100
    //   backColor: 0x000000
    //   bRop2: 0x0D (R2_COPYPEN)
    //   penStyle: 0
    //   penWidth: 1
    //   penColor: 0xFF0000 (Red)

    var buffer = Buffer.from([
        0x09, 0x08, 0xFF, 0x07,
        0x01,
        0x00, 0x00, 0x00, 0x00,
        0x64, 0x00, 0x64, 0x00,
        0x00, 0x00, 0x00,
        0x0D,
        0x00,
        0x01,
        0x00, 0x00, 0xFF
    ]);

    var s = new type.Stream(buffer);
    var result = parser.parse(s, 1);

    assert.strictEqual(result.length, 1);
    var order = result[0];
    assert.strictEqual(order.type, orders.OrderType.TS_NEG_LINETO_INDEX);
    assert.strictEqual(order.fields.nXEnd, 100);
    assert.strictEqual(order.fields.penColor, 0xFF0000);

    console.log('LineTo test passed!');
}

function testSaveBitmap() {
    console.log('Testing SaveBitmap parsing...');
    var parser = new orders.OrderParser();

    // SaveBitmap Primary Order
    // Control byte: 0x01 (TS_STANDARD) | 0x08 (TS_TYPE_CHANGE) = 0x09
    // Order Type: 0x0B (TS_NEG_SAVEBITMAP_INDEX)
    // Field Flags: 0x3F (all 6 fields present)
    // Fields:
    //   savedBitmapPosition: 1024 (0x00000400)
    //   nLeftRect: 0
    //   nTopRect: 0
    //   nRightRect: 100
    //   nBottomRect: 100
    //   operation: 0 (SV_SAVE)

    var buffer = Buffer.from([
        0x09, 0x0B, 0x3F,
        0x00, 0x04, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00,
        0x64, 0x00, 0x64, 0x00,
        0x00
    ]);

    var s = new type.Stream(buffer);
    var result = parser.parse(s, 1);

    assert.strictEqual(result.length, 1);
    var order = result[0];
    assert.strictEqual(order.type, orders.OrderType.TS_NEG_SAVEBITMAP_INDEX);
    assert.strictEqual(order.fields.savedBitmapPosition, 1024);
    assert.strictEqual(order.fields.nRightRect, 100);

    console.log('SaveBitmap test passed!');
}

try {
    testOpaqueRect();
    testDeltaCoords();
    testScrBlt();
    testMemBlt();
    testPatBlt();
    testDstBlt();
    testLineTo();
    testSaveBitmap();
    testBounds();
    console.log('All tests passed!');
} catch (e) {
    console.error('Test failed!');
    console.error(e);
    process.exit(1);
}

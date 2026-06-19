var orders = require('../lib/protocol/pdu/orders');
var type = require('../lib/core/type');
var log = require('../lib/core/log');
var assert = require('assert');

log.level = log.Levels.DEBUG;

function testOpaqueRect() {
    console.log('Testing OpaqueRect parsing...');
    var parser = new orders.OrderParser();

    var buffer = Buffer.from([
        0x09, 0x0A, 0x1F,
        0x0A, 0x00, 0x14, 0x00, 0x64, 0x00, 0x32, 0x00,
        0x11, 0x22, 0x33 // B, G, R
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
    assert.strictEqual(order.fields.colorIndex, 0x332211);

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
    assert.strictEqual(order.fields.bRop3, 0xCC);

    console.log('ScrBlt test passed!');
}

function testMemBlt() {
    console.log('Testing MemBlt parsing...');
    var parser = new orders.OrderParser();

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
    assert.strictEqual(order.fields.cacheIndex, 5);

    console.log('MemBlt test passed!');
}

function testBounds() {
    console.log('Testing Bounds parsing...');
    var parser = new orders.OrderParser();

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

    var buffer = Buffer.from([
        0x09, 0x01, 0xFF, 0x1F,
        0x0A, 0x00, 0x14, 0x00, 0x64, 0x00, 0x32, 0x00,
        0xCC,
        0x11, 0x22, 0x33, // backColor
        0x44, 0x55, 0x66, // foreColor
        0x01, 0x02, 0x03, 0x04,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00 // brushExtra
    ]);

    var s = new type.Stream(buffer);
    var result = parser.parse(s, 1);

    assert.strictEqual(result.length, 1);
    var order = result[0];
    assert.strictEqual(order.type, orders.OrderType.TS_NEG_PATBLT_INDEX);
    assert.strictEqual(order.fields.nLeftRect, 10);
    assert.strictEqual(order.fields.backColor, 0x332211);
    assert.strictEqual(order.fields.brushExtra.length, 7);

    console.log('PatBlt test passed!');
}

function testDstBlt() {
    console.log('Testing DstBlt parsing...');
    var parser = new orders.OrderParser();

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

    var buffer = Buffer.from([
        0x09, 0x08, 0xFF, 0x07,
        0x01,
        0x00, 0x00, 0x00, 0x00,
        0x64, 0x00, 0x64, 0x00,
        0x11, 0x22, 0x33, // backColor
        0x0D,
        0x00,
        0x01,
        0x44, 0x55, 0x66 // penColor
    ]);

    var s = new type.Stream(buffer);
    var result = parser.parse(s, 1);

    assert.strictEqual(result.length, 1);
    var order = result[0];
    assert.strictEqual(order.type, orders.OrderType.TS_NEG_LINETO_INDEX);
    assert.strictEqual(order.fields.nXEnd, 100);
    assert.strictEqual(order.fields.backColor, 0x332211);
    assert.strictEqual(order.fields.penColor, 0x665544);

    console.log('LineTo test passed!');
}

function testSaveBitmap() {
    console.log('Testing SaveBitmap parsing...');
    var parser = new orders.OrderParser();

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

function testMem3Blt() {
    console.log('Testing Mem3Blt parsing...');
    var parser = new orders.OrderParser();

    var buffer = Buffer.from([
        0x09, 0x04, 0xFF, 0xFF, 0x03, // 3 bytes flags because 16 fields. 0xFFFF is (0x7F<<14)|(0x7F<<7)|0x7F which is 0x1FFFF. 0xFFFF is (0x03<<14)|(0x7F<<7)|0x7F
        0x01, 0x00,
        0x0A, 0x00, 0x0A, 0x00, 0x20, 0x00, 0x20, 0x00,
        0xCC,
        0x00, 0x00, 0x00, 0x00,
        0x11, 0x22, 0x33, // backColor
        0x44, 0x55, 0x66, // foreColor
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
    assert.strictEqual(order.fields.backColor, 0x332211);
    assert.strictEqual(order.fields.cacheIndex, 5);

    console.log('Mem3Blt test passed!');
}

function testMultiOpaqueRect() {
    console.log('Testing MultiOpaqueRect parsing...');
    var parser = new orders.OrderParser();

    var bufferSimpler = Buffer.from([
        0x09, 0x12, 0x7F,
        0x0A, 0x00, 0x0A, 0x00, 0x64, 0x00, 0x64, 0x00,
        0x11, 0x22, 0x33,
        0x01, // numRectangles: 1
        0x05, 0x00, // cbData: 5 (1 zeroBits + 4 deltas)
        0x00, // zeroBits
        0x05, 0x05, 0x0A, 0x0A // deltas
    ]);

    var s = new type.Stream(bufferSimpler);
    var result = parser.parse(s, 1);

    assert.strictEqual(result.length, 1);
    var order = result[0];
    assert.strictEqual(order.type, orders.OrderType.TS_NEG_MULTIOPAQUERECT_INDEX);
    assert.strictEqual(order.fields.nLeftRect, 10);
    assert.strictEqual(order.fields.numRectangles, 1);
    assert.strictEqual(order.fields.rects.length, 1);
    assert.strictEqual(order.fields.rects[0].left, 15);
    assert.strictEqual(order.fields.rects[0].width, 110);

    console.log('MultiOpaqueRect test passed!');
}

function testPolyline() {
    console.log('Testing Polyline parsing...');
    var parser = new orders.OrderParser();

    var buffer = Buffer.from([
        0x09, 0x16, 0x3F,
        0x64, 0x00, 0x64, 0x00, // (100, 100)
        0x0D, // R2_COPYPEN
        0x11, 0x22, 0x33, // penColor
        0x02, // numPoints: 2
        0x05, 0x00, // cbData: 5 (1 zeroBits + 4 deltas)
        0x00, // zeroBits
        0x0A, 0x00, // Delta 1: (10, 0) -> (110, 100)
        0x00, 0x0A  // Delta 2: (0, 10) -> (110, 110)
    ]);

    var s = new type.Stream(buffer);
    var result = parser.parse(s, 1);

    var order = result[0];
    assert.strictEqual(order.type, orders.OrderType.TS_NEG_POLYLINE_INDEX);
    assert.strictEqual(order.fields.xStart, 100);
    assert.strictEqual(order.fields.numPoints, 2);
    assert.strictEqual(order.fields.points.length, 2);
    assert.strictEqual(order.fields.points[0].x, 110);
    assert.strictEqual(order.fields.points[0].y, 100);
    assert.strictEqual(order.fields.points[1].x, 110);
    assert.strictEqual(order.fields.points[1].y, 110);

    console.log('Polyline test passed!');
}

function testPolygonSC() {
    console.log('Testing PolygonSC parsing...');
    var parser = new orders.OrderParser();

    var buffer = Buffer.from([
        0x09, 0x14, 0x7F,
        0x32, 0x00, 0x32, 0x00, // (50, 50)
        0x0D, // R2_COPYPEN
        0x01, // ALTERNATE
        0x11, 0x22, 0x33, // brushColor
        0x03, // numPoints: 3
        0x07, 0x00, // cbData: 7 (1 zeroBits + 6 deltas)
        0x00, // zeroBits
        0x0A, // Delta 1 x: 10 -> 60
        0x00, // Delta 1 y: 0  -> 50
        0x00, // Delta 2 x: 0  -> 60
        0x0A, // Delta 2 y: 10 -> 60
        0x76, // Delta 3 x: -10 -> 50
        0x76  // Delta 3 y: -10 -> 50
    ]);

    var s = new type.Stream(buffer);
    var result = parser.parse(s, 1);

    var order = result[0];
    assert.strictEqual(order.type, orders.OrderType.TS_NEG_POLYGON_SC_INDEX);
    assert.strictEqual(order.fields.xStart, 50);
    assert.strictEqual(order.fields.numPoints, 3);
    assert.strictEqual(order.fields.points.length, 3);
    assert.strictEqual(order.fields.points[2].x, 50);
    assert.strictEqual(order.fields.points[2].y, 50);

    console.log('PolygonSC test passed!');
}

try {
    testOpaqueRect();
    testDeltaCoords();
    testScrBlt();
    testMemBlt();
    testBounds();
    testPatBlt();
    testDstBlt();
    testLineTo();
    testSaveBitmap();
    testMem3Blt();
    testMultiOpaqueRect();
    testPolyline();
    testPolygonSC();
    console.log('All tests passed!');
} catch (e) {
    console.error('Test failed!');
    console.error(e);
    process.exit(1);
}

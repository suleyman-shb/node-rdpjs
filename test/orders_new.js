var orders = require('../lib/protocol/pdu/orders');
var type = require('../lib/core/type');
var log = require('../lib/core/log');
var assert = require('assert');

log.level = log.Levels.DEBUG;

function testMem3Blt() {
    console.log('Testing Mem3Blt parsing...');
    var parser = new orders.OrderParser();

    // Mem3Blt Primary Order
    var buffer = Buffer.alloc(100);
    var s = new type.Stream(buffer);
    s.buffer.writeUInt8(0x09, 0); // Control
    s.buffer.writeUInt8(0x04, 1); // Type
    s.buffer.writeUInt8(0xFF, 2); // Field Flag 1
    s.buffer.writeUInt8(0xFF, 3); // Field Flag 2
    s.buffer.writeUInt8(0x00, 4); // Field Flag 3

    var offset = 5;
    s.buffer.writeUInt16LE(0x1234, offset); offset += 2; // cacheId
    s.buffer.writeUInt16LE(10, offset); offset += 2; // nLeftRect
    s.buffer.writeUInt16LE(20, offset); offset += 2; // nTopRect
    s.buffer.writeUInt16LE(100, offset); offset += 2; // nWidthRect
    s.buffer.writeUInt16LE(50, offset); offset += 2; // nHeightRect
    s.buffer.writeUInt8(0xCC, offset); offset += 1; // bRop3
    s.buffer.writeUInt16LE(5, offset); offset += 2; // nXSrc
    s.buffer.writeUInt16LE(5, offset); offset += 2; // nYSrc
    s.buffer.writeUInt8(0x01, offset); offset += 1; // backColor B
    s.buffer.writeUInt8(0x02, offset); offset += 1; // backColor G
    s.buffer.writeUInt8(0x03, offset); offset += 1; // backColor R
    s.buffer.writeUInt8(0x04, offset); offset += 1; // foreColor B
    s.buffer.writeUInt8(0x05, offset); offset += 1; // foreColor G
    s.buffer.writeUInt8(0x06, offset); offset += 1; // foreColor R
    s.buffer.writeUInt8(1, offset); offset += 1; // brushX
    s.buffer.writeUInt8(2, offset); offset += 1; // brushY
    s.buffer.writeUInt8(3, offset); offset += 1; // brushStyle
    s.buffer.writeUInt8(4, offset); offset += 1; // brushHatch
    Buffer.from([1,2,3,4,5,6,7]).copy(s.buffer, offset); offset += 7; // brushExtra
    s.buffer.writeUInt16LE(0x5678, offset); offset += 2; // cacheIndex

    var result = parser.parse(new type.Stream(s.buffer), 1);
    assert.strictEqual(result.length, 1);
    var fields = result[0].fields;
    assert.strictEqual(fields.cacheId, 0x1234);
    assert.strictEqual(fields.nLeftRect, 10);
    assert.strictEqual(fields.bRop3, 0xCC);
    assert.strictEqual(fields.backColor, 0x030201);
    assert.strictEqual(fields.foreColor, 0x060504);
    assert.strictEqual(fields.brushX, 1);
    assert.strictEqual(fields.cacheIndex, 0x5678);

    console.log('Mem3Blt test passed!');
}

function testMultiOpaqueRect() {
    console.log('Testing MultiOpaqueRect parsing...');
    var parser = new orders.OrderParser();

    // MultiOpaqueRect Primary Order
    var buffer = Buffer.alloc(100);
    var s = new type.Stream(buffer);
    s.buffer.writeUInt8(0x09, 0); // Control
    s.buffer.writeUInt8(0x12, 1); // Type
    s.buffer.writeUInt8(0x7F, 2); // Field Flags

    var offset = 3;
    s.buffer.writeUInt16LE(10, offset); offset += 2; // nLeftRect
    s.buffer.writeUInt16LE(10, offset); offset += 2; // nTopRect
    s.buffer.writeUInt16LE(20, offset); offset += 2; // nWidthRect
    s.buffer.writeUInt16LE(20, offset); offset += 2; // nHeightRect
    s.buffer.writeUInt8(0, offset); offset += 1; // color B
    s.buffer.writeUInt8(0xFF, offset); offset += 1; // color G
    s.buffer.writeUInt8(0, offset); offset += 1; // color R (Green: 0x00FF00)
    s.buffer.writeUInt8(2, offset); offset += 1; // numRectangles (2 deltas)
    s.buffer.writeUInt8(8, offset); offset += 1; // cbData (2 deltas * 4 packed values each, all 1-byte)

    // Delta 1: relative to (10, 10, 20, 20) -> (40, 40, 30, 30) -> +30, +30, +10, +10
    s.buffer.writeUInt8(30, offset++);
    s.buffer.writeUInt8(30, offset++);
    s.buffer.writeUInt8(10, offset++);
    s.buffer.writeUInt8(10, offset++);

    // Delta 2: relative to (40, 40, 30, 30) -> (50, 50, 40, 40) -> +10, +10, +10, +10
    s.buffer.writeUInt8(10, offset++);
    s.buffer.writeUInt8(10, offset++);
    s.buffer.writeUInt8(10, offset++);
    s.buffer.writeUInt8(10, offset++);

    var result = parser.parse(new type.Stream(s.buffer), 1);
    assert.strictEqual(result.length, 1);
    var fields = result[0].fields;
    assert.strictEqual(fields.colorIndex, 0x00FF00);
    assert.strictEqual(fields.numRectangles, 2);
    assert.strictEqual(fields.rectangles.length, 3); // 1 base + 2 deltas
    assert.deepStrictEqual(fields.rectangles[0], { left: 10, top: 10, width: 20, height: 20 });
    assert.deepStrictEqual(fields.rectangles[1], { left: 40, top: 40, width: 30, height: 30 });
    assert.deepStrictEqual(fields.rectangles[2], { left: 50, top: 50, width: 40, height: 40 });

    console.log('MultiOpaqueRect test passed!');
}

function testPackedValue() {
    console.log('Testing readPackedValue...');
    var parser = new orders.OrderParser();

    // 1 byte positive: 0x05 -> 5
    var s1 = new type.Stream(Buffer.from([0x05]));
    assert.strictEqual(parser.readPackedValue(s1), 5);

    // 1 byte negative: 0x45 -> -5
    var s2 = new type.Stream(Buffer.from([0x45]));
    assert.strictEqual(parser.readPackedValue(s2), -5);

    // 2 bytes positive: 0x81, 0x02 -> (1 << 8) | 2 = 258
    var s3 = new type.Stream(Buffer.from([0x81, 0x02]));
    assert.strictEqual(parser.readPackedValue(s3), 258);

    // 2 bytes negative: 0xC1, 0x02 -> -258
    var s4 = new type.Stream(Buffer.from([0xC1, 0x02]));
    assert.strictEqual(parser.readPackedValue(s4), -258);

    console.log('readPackedValue tests passed!');
}

try {
    testPackedValue();
    testMem3Blt();
    testMultiOpaqueRect();
    console.log('All new tests passed!');
} catch (e) {
    console.error('Test failed!');
    console.error(e);
    process.exit(1);
}

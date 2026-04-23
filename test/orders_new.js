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
    // Field Flags Bytes: 0xFF, 0xFF, 0x00
    // Fields:
    //   cacheId: 2 (0x0002)
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
    //   brushExtra: 7 bytes of 0
    //   cacheIndex: 5

    var buffer = Buffer.from([
        0x09, 0x04, 0xFF, 0xFF, 0x00,
        0x02, 0x00,
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
    assert.strictEqual(order.fields.cacheId, 2);
    assert.strictEqual(order.fields.nLeftRect, 10);
    assert.strictEqual(order.fields.bRop3, 0xCC);
    assert.strictEqual(order.fields.foreColor, 0xFFFFFF);
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
    //   nTopRect: 10
    //   nWidthRect: 100
    //   nHeightRect: 100
    //   colorIndex: 0xFF0000 (Red)
    //   cbData: 8
    //   rects: (CodedDeltaList)
    //     Rect 1: deltaL: 20, deltaT: 20, deltaW: 0, deltaH: 0
    //             Actual: L:30, T:30, W:100, H:100
    //     Rect 2: deltaL: 20, deltaT: 20, deltaW: 0, deltaH: 0
    //             Actual: L:50, T:50, W:100, H:100

    var buffer = Buffer.from([
        0x09, 0x12, 0x7F,
        0x0A, 0x00, 0x0A, 0x00, 0x64, 0x00, 0x64, 0x00,
        0x00, 0x00, 0xFF,
        0x08,
        0x14, 0x14, 0x00, 0x00,
        0x14, 0x14, 0x00, 0x00
    ]);

    var s = new type.Stream(buffer);
    var result = parser.parse(s, 1);

    assert.strictEqual(result.length, 1);
    var order = result[0];
    assert.strictEqual(order.type, orders.OrderType.TS_NEG_MULTIOPAQUERECT_INDEX);
    assert.strictEqual(order.fields.nWidthRect, 100);
    assert.strictEqual(order.fields.colorIndex, 0xFF0000);
    assert.strictEqual(order.fields.cbData, 8);
    assert.strictEqual(order.fields.rects.length, 2);

    assert.strictEqual(order.fields.rects[0].left, 30);
    assert.strictEqual(order.fields.rects[0].top, 30);
    assert.strictEqual(order.fields.rects[0].width, 100);
    assert.strictEqual(order.fields.rects[0].height, 100);

    assert.strictEqual(order.fields.rects[1].left, 50);
    assert.strictEqual(order.fields.rects[1].top, 50);
    assert.strictEqual(order.fields.rects[1].width, 100);
    assert.strictEqual(order.fields.rects[1].height, 100);

    console.log('MultiOpaqueRect test passed!');
}

function testPackedValue() {
    console.log('Testing readPackedValue helper...');
    var parser = new orders.OrderParser();

    var testCases = [
        { data: [0x01], expected: 1 },
        { data: [0x41], expected: -1 },
        { data: [0x81, 0x02], expected: 258 }, // (1 << 8) | 2
        { data: [0xC1, 0x02], expected: -258 }
    ];

    testCases.forEach(function(tc) {
        var s = new type.Stream(Buffer.from(tc.data));
        var val = parser.readPackedValue(s);
        assert.strictEqual(val, tc.expected, 'Failed for ' + tc.data.toString('hex'));
    });

    console.log('readPackedValue test passed!');
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

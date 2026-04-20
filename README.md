node-rdpjs
========

Remote Desktop Protocol for Node.js

node-rdpjs is a pure implementation of the Microsoft RDP (Remote Desktop Protocol) protocol (client and server side). node-rdpjs support SSL security layer and NLA (Network Level Authentication).

## Install

You can install last release node-rdpjs through npm :

```
npm install node-rdpjs
```

Or work with dev branch :

```
git clone https://github.com/citronneur/node-rdpjs.git
cd node-rdpjs
npm install
```

## RDP Client

To create a simple rdp client : 

```javascript
var rdp = require('node-rdpjs');

var client = rdp.createClient({ 
	domain : 'my_domain', 
	userName : 'my_username',
	password : 'my_password',
	enablePerf : true,
	autoLogin : true,
	decompress : false,
	screen : { width : 800, height : 600 },
	locale : 'en',
	logLevel : 'INFO'
}).on('connect', function () {
}).on('close', function() {
}).on('bitmap', function(bitmap) {
}).on('error', function(err) {
}).connect('XXX.XXX.XXX.XXX', 3389);
```

Client parameters :

* domain {string} Microsoft domain
* userName {string} Username
* password {string} password
* enablePerf {boolean} Active some performance features (disable wallpaper)
* autoLogin {boolean} start session if login informations are good
* decompress {boolean} use RLE algorithm for decompress bitmap
* screen {object} screen size
	- width {integer} width of screen
	- height {integer} height of screen
* locale {string} keyboard layout
	- en qwerty layout
	- fr azerty layout
* logLevel {string} console log level of library
	- DEBUG
	- INFO
	- WARN
	- ERROR
* alternateShell {string} executable to run instead of the shell
* workingDir {string} working directory for the alternate shell

Use of decompress parameter impact performance.

### Client Events

List of all available events from server

#### connect

Connect event is received when rdp stack is connected

#### close

Close event is received when rdp stack is close cleanly

#### error

Error event is received when a protocol error happened

#### bitmap

Bitmap event is received for a bitmap refresh order :

* destTop {integer} y min position
* destLeft {integer} x min position
* destBottom {integer} y max position
* destRight {integer} x max position 
* width {integer} width of bitmap data
* height {integer} height of bitmap data
* bitsPerPixel {integer} [15|16|24|32] bits per pixel
* isCompress {boolean} true if bitmap is compressed with RLE algorithm
* data : {Buffer} bitmap data

### Client Inputs

Client inputs are mainly user inputs (mouse and keyboard).

#### Mouse

```javascript
client.sendPointerEvent(x, y, button, isPressed);
```

* x {integer} mouse x position in pixel
* y {integer} mouse y position in pixel
* button {integer} [ 1 (left) | 2 (right) | 3 (middle) ]
* isPressed {boolean} true for a pressed button event

```javascript
client.sendWheelEvent(x, y, step, isNegative, isHorizontal);
```

* x {integer} mouse x position in pixel
* y {integer} mouse y position in pixel
* step {integer} wheel step
* isNegative {boolean} true for a negative wheel event
* isHorizontal {boolean} true for a horizontal wheel event

#### Keyboard

```javascript
client.sendKeyEventScancode(code, isPressed);
```

* code {integer} scancode of key
* isPressed {boolean} true for a key pressed event

```javascript
client.sendKeyEventUnicode(code, isPressed);
```

* code {integer} unicode char of key
* isPressed {boolean} true for a key pressed event

## RDP Server

To create a simple rdp server :

```javascript
var rdp = require('node-rdpjs');
var fs = require('fs');

var server = rdp.createServer({
	key: fs.readFileSync('server.key'),
	cert: fs.readFileSync('server.crt')
}, function(client) {
	client.on('connect', function() {
		console.log('client connected');
	}).on('close', function() {
		console.log('client closed');
	});
}).listen(3389, function() {
	console.log('server listening on port 3389');
});
```

## Project

Please see [**mstsc.js**](https://github.com/citronneur/mstsc.js) project page to watch an example of node-rdpjs.

## Roadmap

* RDP security layer for windows xp compatibility
* Win32 orders
* RemoteFX (H.264) codec

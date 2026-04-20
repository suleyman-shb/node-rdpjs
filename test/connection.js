const rdp = require('./lib/index.js');

const options = {
  domain: process.env.RDP_DOMAIN,
  userName: process.env.RDP_USERNAME,
  password: process.env.RDP_PASSWORD,
  enablePerf: true,
  autoLogin: true,
  decompress: false,
  screen: { width: 800, height: 600 },
  locale: 'en',
  logLevel: 'INFO'
};

const host = process.argv[2];
const port = process.argv[3] || 3389;

if (!host) {
  console.error('Usage: node test.js <host> [port]');
  process.exit(1);
}

console.log(`Connecting to ${host}:${port}...`);

const client = rdp.createClient(options)
  .on('connect', function () {
    console.log('Successfully connected.');
    process.exit(0);
  })
  .on('close', function() {
    console.error('Connection closed.');
    process.exit(1);
  })
  .on('error', function(err) {
    console.error('Connection error:', err);
    process.exit(1);
  });

client.connect(host, port);

setTimeout(() => {
  console.error('Connection timed out.');
  process.exit(1);
}, 15000); // 15 second timeout

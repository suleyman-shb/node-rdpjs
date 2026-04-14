# Client API Contract: NLA Support

The `createClient` configuration object is updated to support NLA.

## New Parameters

- `domain` {string} (Optional): The Windows domain for NLA.
- `userName` {string} (Optional): The username for NLA.
- `password` {string} (Optional): The password for NLA.
- `requireNla` {boolean} (Default: `false`): If true, the client will fail the connection if the server does not support NLA.

## Example Usage

```javascript
var rdp = require('node-rdpjs');

var client = rdp.createClient({
    domain: 'WORKGROUP',
    userName: 'Administrator',
    password: 'password123',
    requireNla: true,
    // ... other options
});
```

## Error Handling

New error codes for NLA:
- `ERR_NLA_AUTH_FAILED`: Authentication rejected by the server.
- `ERR_NLA_NOT_SUPPORTED`: Server does not support NLA but `requireNla` was true.
- `ERR_NLA_PROTOCOL_ERROR`: Malformed NLA packets during handshake.

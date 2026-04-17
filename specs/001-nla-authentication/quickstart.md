# Quickstart: NLA Authentication Development

## Prerequisites
- Node.js 0.10.x or later.
- A Windows machine with RDP and NLA enabled for testing.

## Setup
1. Clone the repository.
2. Run `npm install`.

## Running Verification
Use the provided test client script:
```bash
node examples/nla-test-client.js --host <WINDOWS_IP> --user <USER> --pass <PASS> --domain <DOMAIN>
```

## Core Modules
- `lib/protocol/credssp.js`: CredSSP PDU encoding/decoding logic.
- `lib/protocol/ntlm.js`: NTLMv2 challenge/response implementation.
- `lib/protocol/spnego.js`: SPNEGO token encapsulation.

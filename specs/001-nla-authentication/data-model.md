# Data Model: NLA Authentication

## Entities

### TSRequest
The core PDU for CredSSP.
- `version`: Protocol version (integer).
- `negoTokens`: SPNEGO tokens (Buffer).
- `authInfo`: Encrypted credentials (Buffer).
- `pubKeyAuth`: Signature for public key verification (Buffer).

### NLA Credentials
- `domain`: Windows domain name.
- `userName`: Authentication username.
- `password`: Authentication password.

### NTLM Context
- `serverChallenge`: 8-byte random from server.
- `clientChallenge`: 8-byte random from client.
- `ntHash`: NTLM hash of the password.
- `response`: Computed NTLMv2 response.

## State Transitions (Handshake)

1. `INIT`: Client prepares to start NLA.
2. `NEGOTIATE`: NTLM Negotiate message sent via SPNEGO.
3. `CHALLENGE`: NTLM Challenge received from server.
4. `AUTHENTICATE`: NTLM Authenticate message sent, including encrypted credentials.
5. `COMPLETED`: Authentication success, proceeding to RDP.
6. `FAILED`: Authentication failed, connection closed.

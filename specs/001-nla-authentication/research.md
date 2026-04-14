# Research: NLA Authentication for node-rdpjs

## Decisions

### Decision: Protocol Choice
Implement MS-CSSP (Credential Security Support Provider) as the primary mechanism for NLA.
- **Rationale**: This is the industry standard for RDP Network Level Authentication.
- **Alternatives Considered**: Direct NTLM over SSL (deprecated/less secure).

### Decision: Authentication Mechanism
Focus on NTLMv2 initially.
- **Rationale**: Widely supported by Windows without complex Kerberos/Active Directory infrastructure requirements for the client. Node.js has sufficient crypto support for NTLMv2 hashing.
- **Alternatives Considered**: Kerberos (too complex for first iteration, requires GSS-API/native libs), Basic auth (insecure).

### Decision: SPNEGO Implementation
Implement a minimal SPNEGO wrapper for the NTLM tokens.
- **Rationale**: MS-CSSP requires tokens to be wrapped in SPNEGO NEGO_TOKEN structures.
- **Alternatives Considered**: Using a heavy SPNEGO library (rejected to maintain minimal dependency footprint).

## Research Tasks

### CredSSP Handshake Flow
1. Client sends initial request to Server.
2. Server responds with supported security mechanisms.
3. Client initiates TLS handshake.
4. Over the TLS channel, Client and Server perform the SPNEGO/NTLM exchange.
5. Client sends encrypted credentials to Server.
6. Server verifies credentials and completes RDP connection.

### NTLMv2 Cryptography
Need to implement:
- MD4 (for NT Hash) - Node.js `crypto` supports it or can be implemented easily.
- HMAC-MD5.
- Random challenge generation.
- Response calculation following MS-NLMP.

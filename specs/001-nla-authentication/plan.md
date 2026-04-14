# Implementation Plan: NLA Authentication

**Branch**: `001-nla-authentication` | **Date**: 2025-05-15 | **Spec**: [specs/001-nla-authentication/spec.md]

## Summary
Implement Network Level Authentication (NLA) using CredSSP and NTLMv2. This will involve a handshake protocol that occurs after the initial SSL/TLS connection is established but before the RDP stack continues its own negotiation. We will use native Node.js `crypto` for NTLM hashing and `starttls` for the secure channel.

## Technical Context

**Language/Version**: Node.js (target 0.10.x compatibility, but using modern crypto features where available with polyfills/fallbacks if needed)
**Primary Dependencies**: `starttls`, `lodash`, Node.js `crypto`, `buffer`
**Storage**: N/A (identity information is transient during handshake)
**Testing**: Manual verification scripts against NLA-enabled Windows RDP servers; Unit tests for CredSSP PDU encoding/decoding.
**Target Platform**: Cross-platform (Linux, Windows, macOS via Node.js)
**Project Type**: Library (RDP protocol implementation)
**Performance Goals**: Handshake completion in < 2 seconds on standard networks.
**Constraints**: Pure JavaScript implementation (no native modules).
**Scale/Scope**: Client and Server side NLA support.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Justification |
|-----------|--------|---------------|
| I. Protocol Fidelity | PASS | Implementing MS-CSSP and MS-RDPBCGR standards exactly. |
| II. Pure Node.js | PASS | Using only Node.js built-ins and JS dependencies. No native code. |
| III. Security First | PASS | NLA is a significant security upgrade over standard RDP. |
| IV. Minimal Dependencies | PASS | Using existing dependencies + Node.js `crypto`. |
| V. Event-Driven | PASS | NLA states will be integrated into the existing event-driven handshake. |

## Project Structure

### Documentation (this feature)

```text
specs/001-nla-authentication/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── client-api.md    # Updated API contract
└── checklists/          # Validation checklists
    └── requirements.md
```

### Source Code (repository root)

```text
lib/
├── client.js            # NLA client state machine integration
├── server.js            # NLA server enforcement integration
├── protocol/
│   ├── credssp.js       # NEW: CredSSP PDU encoding/decoding
│   ├── ntlm.js          # NEW: NTLMv2 authentication logic
│   └── spnego.js        # NEW: SPNEGO token handling
└── rdp.js               # Protocol handshake adjustments
```

**Structure Decision**: Integrated CredSSP/NTLM/SPNEGO into the `lib/protocol/` directory to keep the core `client.js` and `server.js` clean.

## Complexity Tracking

*No violations detected.*

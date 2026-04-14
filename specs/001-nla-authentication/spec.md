# Feature Specification: NLA Authentication

**Feature Branch**: `001-nla-authentication`
**Created**: 2025-05-15
**Status**: Draft
**Input**: User description: "Implement NLA Authentication (Network Level Authentication) for node-rdpjs client and server."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Client NLA Connection (Priority: P1)

As an RDP client user, I want to authenticate via NLA before the full RDP session is established, so that the connection is more secure and the server can verify my credentials early.

**Why this priority**: Core requirement for modern RDP security and compatibility with modern Windows RDP servers.

**Independent Test**: Can be tested by attempting a connection to an NLA-enabled RDP server and verifying successful authentication before the RDP handshake completes.

**Acceptance Scenarios**:

1. **Given** a valid username, password, and domain, **When** connecting to an NLA-mandatory server, **Then** the client successfully completes the CredSSP handshake and establishes the RDP session.
2. **Given** invalid credentials, **When** connecting to an NLA-mandatory server, **Then** the connection is rejected during the NLA phase with a clear authentication error.

---

### User Story 2 - Server NLA Enforcement (Priority: P2)

As an RDP server administrator, I want to enforce NLA authentication for all incoming connections, so that I can prevent unauthorized access and mitigate potential RDP-level vulnerabilities.

**Why this priority**: Essential for securing the RDP server implementation against unauthorized connection attempts.

**Independent Test**: Can be tested by configuring the server to require NLA and verifying that clients without NLA support are rejected.

**Acceptance Scenarios**:

1. **Given** an NLA-mandatory server, **When** a client attempts a connection without NLA support, **Then** the server rejects the connection immediately.
2. **Given** an NLA-mandatory server, **When** a client provides valid NLA credentials, **Then** the server accepts the connection and proceeds to the RDP session.

---

### Edge Cases

- What happens when the CredSSP version requested by the client is not supported by the server?
- How does the system handle expired passwords or required password changes during NLA?
- What happens if the SSL/TLS certificate used for the secure channel is invalid or untrusted?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST implement the CredSSP (Credential Security Support Provider) protocol (MS-CSSP).
- **FR-002**: System MUST support SPNEGO (Simple and Protected GSSAPI Negotiation Mechanism) for NTLM/Kerberos negotiation.
- **FR-003**: System MUST provide an interface for passing NLA credentials (domain, username, password) to the `createClient` function.
- **FR-004**: System MUST be able to handle NLA redirection and authentication challenges.
- **FR-005**: Server implementation MUST be able to validate NLA credentials against a provided identity provider or local accounts.

### Key Entities *(include if feature involves data)*

- **NLA Credentials**: Represents the authentication identity (Domain, User, Password).
- **CredSSP Context**: Manages the state of the CredSSP handshake between client and server.
- **TSRequest PDU**: The protocol data unit used for CredSSP messages.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of connection attempts to NLA-enabled Windows Server 2022 instances succeed with valid credentials.
- **SC-002**: Authentication failure is reported back to the user in under 2 seconds for local network connections.
- **SC-003**: NLA-enabled client correctly identifies and falls back to standard SSL if the server does not support NLA (if permitted by policy).

## Assumptions

- The underlying SSL/TLS implementation (`starttls`) is stable and supports the required cipher suites for CredSSP.
- Only NTLMv2 will be initially supported for NLA authentication, with Kerberos considered out of scope for the first iteration.
- The environment has access to necessary cryptographic primitives in Node.js for NTLM hashing.

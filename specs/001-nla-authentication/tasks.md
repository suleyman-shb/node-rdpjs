# Tasks: NLA Authentication

**Input**: Design documents from `/specs/001-nla-authentication/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [ ] T001 Create project structure for NLA modules in `lib/protocol/`
- [ ] T002 Setup test environment with `examples/nla-test-client.js` scaffold

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

- [ ] T003 [P] Implement NTLMv2 base hashing and response logic in `lib/protocol/ntlm.js`
- [ ] T004 [P] Implement SPNEGO NEGO_TOKEN encapsulation in `lib/protocol/spnego.js`
- [ ] T005 [P] Implement CredSSP TSRequest PDU encoding/decoding in `lib/protocol/credssp.js`
- [ ] T006 Setup NLA error codes and unified error handling in `lib/rdp.js`

**Checkpoint**: Foundation ready - NLA-specific protocol logic is available for client and server integration.

---

## Phase 3: User Story 1 - Client NLA Connection (Priority: P1) 🎯 MVP

**Goal**: Enable RDP client to authenticate via NLA/CredSSP.

**Independent Test**: Connect to an NLA-mandatory Windows RDP server using valid credentials and verify session establishment.

### Implementation for User Story 1

- [ ] T007 [US1] Update `createClient` API to accept NLA credentials in `lib/index.js`
- [ ] T008 [US1] Integrate CredSSP handshake into the client connection state machine in `lib/client.js`
- [ ] T009 [US1] Implement TLS-over-RDP-negotiation logic to support the secure channel required for NLA in `lib/rdp.js`
- [ ] T010 [US1] Add NLA-specific logging and event emitting for 'nla_auth' status

**Checkpoint**: Client NLA is fully functional and can be tested against real servers.

---

## Phase 4: User Story 2 - Server NLA Enforcement (Priority: P2)

**Goal**: Enable RDP server to require and validate NLA authentication.

**Independent Test**: Connect using an NLA-supported client and verify authentication; Connect with a non-NLA client and verify rejection.

### Implementation for User Story 2

- [ ] T011 [US2] Update `createServer` API to support NLA enforcement options in `lib/index.js`
- [ ] T012 [US2] Implement Server-side CredSSP state machine in `lib/server.js`
- [ ] T013 [US2] Integrate identity validation hook for NLA credentials in `lib/server.js`
- [ ] T014 [US2] Implement connection rejection logic for clients failing NLA in `lib/rdp.js`

**Checkpoint**: Server NLA enforcement is fully functional.

---

## Phase 5: Polish & Cross-Cutting Concerns

- [ ] T015 [P] Update `README.md` with NLA usage examples and documentation
- [ ] T016 [P] Add unit tests for `lib/protocol/ntlm.js` and `lib/protocol/credssp.js`
- [ ] T017 Final code review and cleanup of the protocol handshake logic
- [ ] T018 Run `examples/nla-test-client.js` validation against test targets

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup (Phase 1).
- **Client NLA (Phase 3)**: Depends on Foundational (Phase 2).
- **Server NLA (Phase 4)**: Depends on Foundational (Phase 2).
- **Polish (Phase 5)**: Depends on Phase 3 and 4 completion.

### Parallel Opportunities

- T003, T004, T005 (Foundational logic) can run in parallel.
- T015, T016 (Docs and Unit Tests) can run in parallel.
- Phase 3 and Phase 4 can technically run in parallel if multiple developers are assigned.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Setup and Foundational phases.
2. Implement Client NLA (User Story 1).
3. Verify against a real Windows RDP server.

### Incremental Delivery

1. Foundation -> Client NLA -> Server NLA -> Polish.

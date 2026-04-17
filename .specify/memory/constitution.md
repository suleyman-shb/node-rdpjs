# node-rdpjs Constitution

## Core Principles

### I. Protocol Fidelity
Implement the Microsoft Remote Desktop Protocol (RDP) accurately according to official specifications (MS-RDPBCGR, MS-RDPEDYC, etc.). Any deviations must be documented and justified.

### II. Pure Node.js Implementation
Maintain the project as a pure JavaScript/Node.js implementation to ensure maximum portability across platforms without requiring native build tools or platform-specific binaries.

### III. Security First
Security is paramount. SSL/TLS security layer is mandatory for all connections. Future security enhancements like NLA (Network Level Authentication) must follow standard GSSAPI/NTLM protocols.

### IV. Minimal Dependency Footprint
Keep external dependencies to a minimum. Use well-established, lightweight libraries only when necessary (e.g., lodash, starttls). Favor standard Node.js APIs for core protocol logic.

### V. Event-Driven Architecture
Maintain an asynchronous, event-driven API for both client and server implementations, allowing users to easily hook into protocol events like 'connect', 'bitmap', and 'error'.

## Technical Constraints
- Target Node.js versions: Compatible with the engine specified in `package.json` (currently node 0.10.x, but aiming for modern LTS support).
- Coding Style: Consistent with existing codebase (standard JS, 2 or 4 space indentation as per existing files).

## Development Workflow
- All new features must be accompanied by a Spec Kit specification and implementation plan.
- Testing: Core protocol changes should include verification scripts or unit tests if a framework is established.

## Governance
- This constitution governs all technical decisions for node-rdpjs.
- Amendments require a formal PR updating this document with clear rationale.
- Versioning follows Semantic Versioning (SemVer).

**Version**: 1.0.0 | **Ratified**: 2025-05-15 | **Last Amended**: 2025-05-15

# node-rdpjs Agent Instructions

This project is a pure Node.js implementation of the Microsoft Remote Desktop Protocol (RDP).

## Key Resources
- **Constitution**: Core principles are in [.specify/memory/constitution.md](.specify/memory/constitution.md).
- **Specs**: Feature specifications are in the `specs/` directory.

## Development Guidelines
- **Pure JS**: Maintain a pure Node.js implementation without native dependencies.
- **Security**: Prioritize SSL/TLS and NLA (CredSSP) security.
- **Strings**: Use UCS-2 encoding with null terminators for RDP PDU string fields.
- **Verification**: No standard test suite exists; use manual verification scripts in `test/`.

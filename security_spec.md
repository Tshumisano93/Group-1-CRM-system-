# Thulamela CRM Security Specification & Hardening Specs

## 1. Data Invariants
- **Identity Invariant**: Users can never assign themselves administrative roles (`super_admin` or `municipal_admin`) during profile creation or profile updates.
- **Audit Log Immutability**: Once an audit log is created, it cannot be modified or deleted by anyone, including administrators.
- **Relational Integrity**: A Complaint must belong to a valid ward (1-41) and must have a valid reporterId (Councillor ID).
- **Temporal Integrity**: All creations and modifications must use system-generated ISO string dates or server timestamps.

## 2. The "Dirty Dozen" Payloads (Vulnerability Attack Patterns)
Here are the 12 malicious payloads designed to breach system security:

1. **Self-Escalation Attack**: Councillor attempts to elevate their role to `super_admin`.
2. **Audit Trail Poisoning**: User attempts to update or overwrite an existing immutable audit log.
3. **Invalid Ward Assignment**: Councillor attempts to lodge a complaint with ward number `999` (out of range 1-41).
4. **Impersonated Complaint Lodging**: Councillor `COUN-002` attempts to lodge a complaint claiming to be `COUN-001`.
5. **Unauthorized Status Overriding**: Councillor attempts to mark a complaint as "Closed" when it hasn't been resolved.
6. **Task Progress Fraud**: Technician attempts to mark a task as completed without any progress or description.
7. **Cross-User Notification Reading**: User `TECH-201` attempts to read direct private notifications belonging to `COUN-001`.
8. **Malicious ID Injection**: User attempts to inject a huge string of random characters as a Document ID (ID Poisoning/DoS).
9. **Private Document Exfiltration**: Non-logged-in user attempts to read sensitive site inspection forms.
10. **System Field Pollution**: Technician attempts to modify administrative departments or billing codes.
11. **Orphaned Message Creation**: User attempts to write chat messages into a chatRoom that they are not a participant of.
12. **Document Version Manipulation**: Councillor attempts to upload a document version with a lower index or arbitrary file sizes.

## 3. Test Runner Concept (`firestore.rules.test.ts`)
The validation test runner ensures that executing any of the "Dirty Dozen" payloads results in immediate `PERMISSION_DENIED` errors. This is validated locally and verified by the rules compiler.

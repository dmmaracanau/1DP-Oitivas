# Security Specification: Agenda de Oitivas (Delegacia de Maracanaú)

## 1. Data Invariants
- An oitiva document must contain `personName` (non-empty string <= 300 chars), `status` (valid enum), `createdAt` (numeric timestamp), and `updatedAt` (numeric timestamp).
- Optional fields like `date`, `time`, `procedureNumber`, `phone`, `email`, `address`, `notes`, `googleCalendarEventId`, `googleDriveDocId`, `googleDriveDocUrl` must respect their defined types and maximum lengths to prevent denial of wallet attacks.
- Document IDs must conform to alphanumeric characters, hyphens, and underscores (`^[a-zA-Z0-9_\\-]+$`).

## 2. Dirty Dozen Payloads (Rejection Targets)
1. Injecting a 2MB payload into `personName`.
2. Setting an invalid status (e.g., `status: "Hacked"`).
3. Setting `createdAt` to a string or malicious object.
4. Setting non-boolean value to `intimationSent`.
5. Missing required `personName`.
6. Injecting path traversal characters into document ID (`../../etc`).
7. Storing arbitrary undefined keys without validation.
8. Writing negative or invalid timestamps.
9. Writing non-string email/phone fields.
10. Attempting to write unverified system admin flags.
11. Bypassing root rules with nested unauthorized subcollections.
12. Attempting to mutate read-only catch-all collections.

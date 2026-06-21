# BitePrint Coach — Security Hardening Audit

This document provides a security audit, threat model, and validation checklist for the BitePrint Coach application, focusing on zero-knowledge data retention, safe upload pipelines, and rate-limiting enforcement.

---

## 1. STRIDE Threat Model

The table below outlines our threat modeling analysis for BitePrint Coach:

| Threat Category | Potential Threat | Mitigation in BitePrint Coach | Status |
|---|---|---|---|
| **Spoofing** | Adversary spoofing API scan requests | API routes are stateless; no authentication credentials to hijack. Client-side IndexedDB is isolated per browser origin. | Mitigated |
| **Tampering** | Parameter tampering in scan requests / JSON payloads | High-impact food scores and recommendations are recalculated deterministically on the server side using the read-only dataset; client-submitted food names are matched against the local dataset IDs. All API payloads are strictly validated via Zod schemas. | Mitigated |
| **Repudiation** | Denial of scan activity / audit evasion | We do not store scan history on our servers. History exists only in the client's local IndexedDB, giving users full sovereign control. | Mitigated (By Design) |
| **Information Disclosure** | Leakage of uploaded meal images | Uploaded images are kept exclusively in volatile memory (RAM Buffer) and are immediately garbage collected after Vision processing. No disk writes or cloud storage buckets exist. | Mitigated |
| **Denial of Service** | Exhausting serverless memory with large images / massive API loops | Image size is strictly capped at 5 MB at the network and application layer. Dynamic rate limiting (10 requests per 60 seconds per IP) is enforced on all scan routes. | Mitigated |
| **Elevation of Privilege**| Injecting scripts or commands into the image processor | Sharp runs in a sandboxed Node.js context. We validate file magic bytes before passing them to the decoder to prevent polyglot executions. | Mitigated |

---

## 2. Upload Validation Checklist

The BitePrint Coach upload pipeline executes multiple independent checks before processing an image:

```
[Incoming Multi-Part Request]
       │
       ├─► 1. File Size Verification (Capped at 5 MB; rejects larger payloads immediately)
       │
       ├─► 2. MIME-Type Match (Allows only image/jpeg, image/png, image/webp)
       │
       ├─► 3. Magic-Byte Verification (Inspects header bytes to prevent polyglot/disguised scripts)
       │
       ├─► 4. Dimension Restrictions (Sharp inspects dimensions; rejects if width/height > 4096px)
       │
       ├─► 5. EXIF Metadata Stripping (Sharp automatically strips EXIF to purge location/device leaks)
       │
       └─► [Passes to Gemini API as ephemeral buffer -> Garbage Collected]
```

### Validation Rules

- **Magic Byte Tables**:
  - `JPEG`: Starts with `FF D8 FF`
  - `PNG`: Starts with `89 50 4E 47 0D 0A 1A 0A`
  - `WebP`: Header matches `RIFF` and `WEBP` formats.
- **Image Retention Policy**: Zero persistent storage. The serverless function processes the buffer in-memory and returns the derived JSON. No temp file is ever written.

---

## 3. API Security & Rate Limiting

- **Rate Limiting**: Enforced at the API route using a sliding window. It blocks IPs exceeding 10 requests per minute with a `429 Too Many Requests` status and returns a `Retry-After` header.
- **Input Sanitization**: Zod validation schemas (`src/lib/validation/schemas.ts`) strip any unexpected fields. Output from the Gemini API is coerced and validated before being processed by the carbon scorer.
- **Response Headers**: Security headers (HSTS, CSP, X-Frame-Options, X-Content-Type-Options) are returned for all routes to protect client sessions from clickjacking, MIME sniffing, and cross-site scripting (XSS).

---

## 4. Data Minimization Compliance

BitePrint Coach does not collect or store any PII (Personally Identifiable Information).

### Client Storage Schema
All persistent records reside exclusively in the client-side IndexedDB database. The schema is strictly limited to the following fields:

- **Scan Metadata**: `id` (UUID), `timestamp` (Unix epoch milliseconds).
- **Food Results**: List of validated food names (e.g., `["beef (cattle)", "potato"]`).
- **Carbon Metrics**: `totalCo2eKg`, `totalWaterLiters`, `grade` (A-F), `impactLevel` (low/moderate/high).
- **Recommendation Data**: Actionable swap suggestions (e.g., swapping beef for lentils) including carbon and water savings.

*No image bytes, geo-locations, camera models, IP addresses, or user identifiers are persisted.*

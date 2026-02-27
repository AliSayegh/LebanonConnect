# LebanonConnect — Formal Use Case Specifications

*Generated from source analysis of `backend/routes/`, `backend/Middleware/`, and `backend/Models/`.*

---

## UC-01 — Register

| Field               | Detail |
|---------------------|--------|
| **Number**          | UC-01 |
| **Name**            | Register |
| **Summary**         | A Guest creates a new account by providing email, password, and selecting a role (customer or provider). The system validates input, hashes the password, persists a `UserAuth` record, and creates the corresponding role profile. |
| **Priority**        | High |
| **Primary Actor(s)**| Guest |
| **Secondary Actor(s)**| None |
| **Trigger**         | Guest submits `POST /api/auth/register` with `{ email, password, role, fullName / displayName, city }`. |
| **Preconditions**   | Email is not already registered. Password is ≥ 8 characters. Role is `"customer"` or `"provider"` (defaults to `"customer"` if omitted or invalid). |
| **Postconditions**  | A `UserAuth` document is created with status `"active"`. A `CustomerProfile` or `ProviderProfile` document is created. HTTP 201 is returned with `{ message, userId }`. |

### Main Success Scenario

| Step | Actor | Action |
|------|-------|--------|
| 1 | Guest | Sends `POST /api/auth/register` with email, password, role, and profile fields. |
| 2 | System | Validates that `email` and `password` are present. |
| 3 | System | Validates password length ≥ 8 characters. |
| 4 | System | Normalises `role` to `"customer"` or `"provider"`. |
| 5 | System | Queries `UserAuth` for existing record with same email. |
| 6 | System | Hashes password with bcrypt (salt rounds = 10). |
| 7 | System | Creates `UserAuth` record with hashed password, role, and status `"active"`. |
| 8 | System | Creates `CustomerProfile` (fullName, city) or `ProviderProfile` (displayName, city, isVerified: false, isActive: true) depending on role. |
| 9 | System | Returns HTTP 201 `{ message: "Registered", userId }`. |

### Extensions (Alternative Flows)

| Step | Condition | Branching Action |
|------|-----------|-----------------|
| 2a | `email` or `password` missing | Return HTTP 400 `{ message: "Missing email/password" }`. |
| 3a | Password < 8 characters | Return HTTP 400 `{ message: "Password must be at least 8 chars" }`. |
| 5a | Email already exists in `UserAuth` | Return HTTP 409 `{ message: "Email already used" }`. |
| 6a | bcrypt or DB error | Return HTTP 500 `{ message: <error> }`. |

### Open Issues

- No email verification flow implemented. Accounts are immediately active.
- `role = "admin"` cannot be self-registered (correctly excluded from `finalRole`).

---

## UC-02 — Login

| Field               | Detail |
|---------------------|--------|
| **Number**          | UC-02 |
| **Name**            | Login |
| **Summary**         | An existing Guest authenticates by submitting email and password. The system verifies credentials, issues a signed JWT, and returns the token with basic user information. |
| **Priority**        | High |
| **Primary Actor(s)**| Guest |
| **Secondary Actor(s)**| None |
| **Trigger**         | Guest submits `POST /api/auth/login` with `{ email, password }`. |
| **Preconditions**   | A `UserAuth` record exists with this email and `status: "active"`. `JWT_SECRET` is configured in environment. |
| **Postconditions**  | `lastLoginAt` updated in DB. HTTP 200 returned with `{ token, user: { id, email, role } }`. |

### Main Success Scenario

| Step | Actor | Action |
|------|-------|--------|
| 1 | Guest | Sends `POST /api/auth/login` with email and password. |
| 2 | System | Normalises email (lowercase, trim). Queries `UserAuth` where `email` matches and `status = "active"`. |
| 3 | System | Uses `bcrypt.compare()` to validate password against stored hash. |
| 4 | System | Verifies `JWT_SECRET` is set in environment. |
| 5 | System | Signs JWT with payload `{ id, role }`, secret, expiry `7d`. |
| 6 | System | Updates `user.lastLoginAt = new Date()` and saves. |
| 7 | System | Returns HTTP 200 `{ token, user: { id, email, role } }`. |

### Extensions (Alternative Flows)

| Step | Condition | Branching Action |
|------|-----------|-----------------|
| 2a | No user found with email, or user `status !== "active"` | Return HTTP 401 `{ message: "Invalid credentials" }`. |
| 3a | Password does not match hash | Return HTTP 401 `{ message: "Invalid credentials" }`. |
| 4a | `JWT_SECRET` is not set | Return HTTP 500 `{ message: "JWT_SECRET missing in .env" }`. |
| 5a | `jwt.sign()` throws | Return HTTP 500 `{ message: <error> }`. |

### Open Issues

- No refresh token mechanism; token expiry is non-revocable within 7 days unless `status` is manually changed to `"inactive"`.

---

## UC-03 — Authenticate User

*This is an infrastructure use case invoked via `<<include>>` from every protected use case. It is implemented as the `requireAuth` Express middleware.*

| Field               | Detail |
|---------------------|--------|
| **Number**          | UC-03 |
| **Name**            | Authenticate User |
| **Summary**         | The system extracts and validates the Bearer JWT from the HTTP Authorization header, verifies it cryptographically (<<include>> JWT Validation), confirms the user is still active in the database, and populates `req.user` for downstream use. |
| **Priority**        | Critical |
| **Primary Actor(s)**| System (auto-invoked middleware) |
| **Secondary Actor(s)**| None |
| **Trigger**         | Any protected HTTP request carries an `Authorization: Bearer <token>` header. |
| **Preconditions**   | A valid JWT was previously issued via UC-02 (Login). `JWT_SECRET` is set. |
| **Postconditions**  | `req.user = { id, role }` is set for downstream handlers. Execution passes to `next()`. |

### Main Success Scenario

| Step | Actor | Action |
|------|-------|--------|
| 1 | System | Extracts token from `req.headers.authorization` (`"Bearer <token>".split(" ")[1]`). |
| 2 | System | **<<include>> JWT Validation** — Calls `jwt.verify(token, process.env.JWT_SECRET)`. Decodes payload `{ id, role }`. |
| 3 | System | Queries `UserAuth.findById(decoded.id)` to confirm user still exists and `status === "active"`. |
| 4 | System | Sets `req.user = decoded` (`{ id, role }`). |
| 5 | System | Calls `next()` to hand control to the route handler. |

### Extensions (Alternative Flows)

| Step | Condition | Branching Action |
|------|-----------|-----------------|
| 1a | `Authorization` header is missing or empty | Return HTTP 401 `{ message: "No token" }`. |
| 2a | Token is expired (`TokenExpiredError`) | Return HTTP 401 `{ message: "Invalid token" }`. |
| 2b | Token is tampered / invalid signature (`JsonWebTokenError`) | Return HTTP 401 `{ message: "Invalid token" }`. |
| 3a | User not found in DB or `status !== "active"` | Return HTTP 401 `{ message: "User not found or inactive" }`. |

### Open Issues

- Both expiry and tamper errors produce the same HTTP response — distinguishing them would improve client-side UX.

---

## UC-04 — JWT Validation

*Infrastructure use case. Included by UC-03 (Authenticate User).*

| Field               | Detail |
|---------------------|--------|
| **Number**          | UC-04 |
| **Name**            | JWT Validation |
| **Summary**         | Cryptographically verifies the JWT signature using `JWT_SECRET`, confirms the token has not expired, and decodes the payload. |
| **Priority**        | Critical |
| **Primary Actor(s)**| System |
| **Secondary Actor(s)**| None |
| **Trigger**         | Called internally from `requireAuth` via `jwt.verify()`. |
| **Preconditions**   | A non-null token string has been extracted from the Authorization header. `JWT_SECRET` is available in the process environment. |
| **Postconditions**  | Decoded payload `{ id, role, iat, exp }` is returned to the caller. |

### Main Success Scenario

| Step | Actor | Action |
|------|-------|--------|
| 1 | System | Calls `jwt.verify(token, process.env.JWT_SECRET)` (uses `jsonwebtoken` library, HS256 algorithm). |
| 2 | System | Library validates HMAC signature against `JWT_SECRET`. |
| 3 | System | Library checks `exp` claim; raises `TokenExpiredError` if past expiry. |
| 4 | System | Returns decoded payload `{ id, role, iat, exp }`. |

### Extensions (Alternative Flows)

| Step | Condition | Branching Action |
|------|-----------|-----------------|
| 2a | Signature mismatch | Throws `JsonWebTokenError`; caught by `requireAuth` which returns HTTP 401. |
| 3a | Token expired | Throws `TokenExpiredError`; caught by `requireAuth` which returns HTTP 401. |

---

## UC-05 — Create Job

| Field               | Detail |
|---------------------|--------|
| **Number**          | UC-05 |
| **Name**            | Create Job |
| **Summary**         | A Customer creates a service job request targeting a specific Provider and Category. The system validates input, confirms referenced entities exist, and persists a new `Job` document with status `"open"`. |
| **Priority**        | High |
| **Primary Actor(s)**| Customer |
| **Secondary Actor(s)**| None |
| **Trigger**         | Customer submits `POST /api/jobs` with `{ providerId, categoryId, title, description, city, addressArea }`. |
| **Preconditions**   | `<<include>>` UC-03: Authenticate User passes. `req.user.role === "customer"`. `providerId` and `categoryId` are valid MongoDB ObjectIds. Referenced provider and category exist in DB. |
| **Postconditions**  | A `Job` document is created with `status: "open"`, `customerId = req.user.id`. HTTP 201 is returned with the job object. |

### Main Success Scenario

| Step | Actor | Action |
|------|-------|--------|
| 1 | Customer | Sends `POST /api/jobs` with Authorization header and job body. |
| 2 | System | **<<include>> UC-03**: Validates JWT, confirms user is active customer. |
| 3 | System | `requireRole("customer")` middleware confirms `req.user.role === "customer"`. |
| 4 | System | Validates `providerId` and `categoryId` are valid ObjectIds (`mongoose.isValidObjectId`). |
| 5 | System | Queries `UserAuth` to confirm `providerId` exists and has `role === "provider"`. |
| 6 | System | Queries `Category` collection to confirm `categoryId` exists. |
| 7 | System | Validates required body fields: `providerId`, `categoryId`, `title`, `city`. |
| 8 | System | Creates `Job` record: `{ customerId, providerId, categoryId, title, description, city, addressArea, status: "open", pricing: { type: "quote", amount: 0 } }`. |
| 9 | System | Returns HTTP 201 with the full job document. |

### Extensions (Alternative Flows)

| Step | Condition | Branching Action |
|------|-----------|-----------------|
| 2a | Missing or invalid JWT | UC-03 returns HTTP 401. |
| 3a | User role is `"provider"` or `"admin"` | `requireRole` returns HTTP 403 `{ message: "Forbidden" }`. |
| 4a | `providerId` or `categoryId` is not a valid ObjectId | Return HTTP 400 with appropriate `{ message }`. |
| 5a | Provider `UserAuth` not found or not a provider | Return HTTP 404 `{ message: "Provider not found" }`. |
| 6a | Category not found | Return HTTP 404 `{ message: "Category not found" }`. |
| 7a | Any required field missing | Return HTTP 400 `{ message: "Missing required fields", missing: { ... } }`. |

### Open Issues

- Fields are validated both before and after the existence checks; ordering could be optimised.

---

## UC-06 — Accept Job

| Field               | Detail |
|---------------------|--------|
| **Number**          | UC-06 |
| **Name**            | Accept Job |
| **Summary**         | A Provider accepts an open job assigned to them. The system enforces subscription limits, changes job status to `"accepted"`, and increments the provider's `completedJobsCount`. |
| **Priority**        | High |
| **Primary Actor(s)**| Provider |
| **Secondary Actor(s)**| None |
| **Trigger**         | Provider submits `PATCH /api/jobs/:jobId/accept`. |
| **Preconditions**   | `<<include>>` UC-03: Authenticate User passes. `req.user.role === "provider"`. Job exists, `status === "open"`, and `job.providerId === req.user.id`. Provider subscription permits acceptance. |
| **Postconditions**  | Job `status` set to `"accepted"`, `acceptedAt` set to current timestamp. `ProviderProfile.completedJobsCount` incremented by 1. HTTP 200 returned. |

### Main Success Scenario

| Step | Actor | Action |
|------|-------|--------|
| 1 | Provider | Sends `PATCH /api/jobs/:jobId/accept` with Authorization header. |
| 2 | System | **<<include>> UC-03**: Validates JWT, confirms user is active. |
| 3 | System | `requireRole("provider")` confirms `req.user.role === "provider"`. |
| 4 | System | `checkProviderCanAccept` middleware: Loads `ProviderProfile`. If plan is `"basic"` or `"pro"`, checks subscription `expiresAt` is in the future. If plan is `"free"`, counts accepted/completed/confirmed jobs in current calendar month; rejects if ≥ 3. |
| 5 | System | Validates `jobId` is a valid ObjectId. |
| 6 | System | Loads job; confirms existence, `job.providerId === req.user.id`, and `status === "open"`. |
| 7 | System | Sets `job.status = "accepted"`, `job.acceptedAt = new Date()`. Saves. |
| 8 | System | Calls `ProviderProfile.findOneAndUpdate({ userId: job.providerId }, { $inc: { completedJobsCount: 1 } })`. |
| 9 | System | Returns HTTP 200 `{ message: "Job accepted ✅", job }`. |

### Extensions (Alternative Flows)

| Step | Condition | Branching Action |
|------|-----------|-----------------|
| 2a | Invalid or expired JWT | UC-03 returns HTTP 401. |
| 3a | User is not a provider | `requireRole` returns HTTP 403. |
| 4a | Provider profile not found | Return HTTP 404 `{ message: "Provider profile not found" }`. |
| 4b | Paid plan subscription expired | Return HTTP 403 `{ message: "Subscription expired. Renew to accept jobs." }`. |
| 4c | Free plan monthly limit (3) reached | Return HTTP 403 `{ message: "Free plan limit reached (3/month). Upgrade to accept more jobs." }`. |
| 5a | Invalid `jobId` format | Return HTTP 400 `{ message: "Invalid jobId" }`. |
| 6a | Job not found | Return HTTP 404 `{ message: "Job not found" }`. |
| 6b | Job belongs to different provider | Return HTTP 403 `{ message: "Not your job" }`. |
| 6c | Job `status !== "open"` | Return HTTP 400 `{ message: "Job not open" }`. |

### Open Issues

- `completedJobsCount` is incremented on accept, not on actual completion — naming is semantically misleading.

---

## UC-07 — Complete Job

| Field               | Detail |
|---------------------|--------|
| **Number**          | UC-07 |
| **Name**            | Complete Job |
| **Summary**         | The Provider marks an accepted job as completed. The Customer may then confirm and leave a review. |
| **Priority**        | High |
| **Primary Actor(s)**| Provider |
| **Secondary Actor(s)**| None |
| **Trigger**         | Provider submits `PATCH /api/jobs/:jobId/complete`. |
| **Preconditions**   | `<<include>>` UC-03: Authenticate User passes. `req.user.role === "provider"`. Job exists with `status === "accepted"` and `job.providerId === req.user.id`. |
| **Postconditions**  | Job `status` set to `"completed"`, `completedAt` set. HTTP 200 returned. |

### Main Success Scenario

| Step | Actor | Action |
|------|-------|--------|
| 1 | Provider | Sends `PATCH /api/jobs/:jobId/complete` with Authorization header. |
| 2 | System | **<<include>> UC-03**: Validates JWT, confirms active user. |
| 3 | System | `requireRole("provider")` confirms provider role. |
| 4 | System | Validates `jobId` ObjectId format. |
| 5 | System | Loads job; confirms existence, ownership, and `status === "accepted"`. |
| 6 | System | Sets `job.status = "completed"`, `job.completedAt = new Date()`. Saves. |
| 7 | System | Returns HTTP 200 `{ message: "Job marked completed ✅", job }`. |

### Extensions (Alternative Flows)

| Step | Condition | Branching Action |
|------|-----------|-----------------|
| 2a–3a | Auth/role failure | HTTP 401 or HTTP 403 as per UC-03. |
| 4a | Invalid `jobId` | HTTP 400. |
| 5a | Job not found | HTTP 404. |
| 5b | Provider is not the job's provider | HTTP 403 `{ message: "Not your job" }`. |
| 5c | Job `status !== "accepted"` | HTTP 400 `{ message: "Job must be accepted first" }`. |

### Open Issues

- After this step, the Customer must call `PATCH /:jobId/confirm` (UC-08) before a review can be submitted. The Customer confirmation step acts as the true pre-condition unlock for UC-09 (Leave Review).

---

## UC-08 — Confirm Job Completion *(Customer)*

| Field               | Detail |
|---------------------|--------|
| **Number**          | UC-08 |
| **Name**            | Confirm Job Completion |
| **Summary**         | The Customer verifies and confirms job completion after the Provider marks it done. The system records a `finalPrice` and calculates a commission amount. |
| **Priority**        | High |
| **Primary Actor(s)**| Customer |
| **Secondary Actor(s)**| None |
| **Trigger**         | Customer submits `PATCH /api/jobs/:jobId/confirm` with `{ finalPrice }`. |
| **Preconditions**   | `<<include>>` UC-03: Authenticate User passes. `req.user.role === "customer"`. Job exists with `status === "completed"` and `job.customerId === req.user.id`. `finalPrice > 0`. |
| **Postconditions**  | Job `status` set to `"confirmed"`, `confirmedAt` set, `finalPrice` stored, `commission.amount` computed. HTTP 200 returned. |

### Main Success Scenario

| Step | Actor | Action |
|------|-------|--------|
| 1 | Customer | Sends `PATCH /api/jobs/:jobId/confirm` with `{ finalPrice }`. |
| 2 | System | **<<include>> UC-03**: Validates JWT, confirms active user. |
| 3 | System | `requireRole("customer")` confirms customer role. |
| 4 | System | Validates `jobId` ObjectId. |
| 5 | System | Loads job; confirms existence, `job.customerId === req.user.id`, and `status === "completed"`. |
| 6 | System | Validates `finalPrice` is a positive number. |
| 7 | System | Sets `job.status = "confirmed"`, `job.confirmedAt`, `job.finalPrice = price`. |
| 8 | System | Computes `commission.amount = round(finalPrice × (commission.percentage / 100))` (default percentage = 10 if not set). |
| 9 | System | Saves job and returns HTTP 200 `{ message: "Job confirmed ✅", job }`. |

### Extensions (Alternative Flows)

| Step | Condition | Branching Action |
|------|-----------|-----------------|
| 2a–3a | Auth/role failure | HTTP 401 or 403. |
| 5a | Job not found | HTTP 404. |
| 5b | Customer does not own job | HTTP 403 `{ message: "Not your job" }`. |
| 5c | `status !== "completed"` | HTTP 400 `{ message: "Job must be completed first" }`. |
| 6a | `finalPrice` is 0 or missing | HTTP 400 `{ message: "finalPrice is required" }`. |

---

## UC-09 — Leave Review

| Field               | Detail |
|---------------------|--------|
| **Number**          | UC-09 |
| **Name**            | Leave Review |
| **Summary**         | After a job is confirmed, the Customer submits a star rating (1–5) and optional text review for the Provider. The system validates constraints, creates a `Review` record, updates `ProviderProfile` rating statistics, and marks the job as reviewed. |
| **Priority**        | High |
| **Primary Actor(s)**| Customer |
| **Secondary Actor(s)**| None |
| **Trigger**         | Customer submits `POST /api/reviews` with `{ jobId, rating, text }`. |
| **Preconditions**   | `<<include>>` UC-03: Authenticate User passes. `req.user.role === "customer"`. Job exists with `status === "confirmed"` (`<<extend>>` UC-08: Confirm Job Completion). Job's `customerId === req.user.id`. No review already exists for this job. |
| **Postconditions**  | A `Review` document is created. `ProviderProfile.ratingCount` incremented; `ratingAvg` recalculated as rolling average. `job.reviewId` set. HTTP 200 returned. |

### Main Success Scenario

| Step | Actor | Action |
|------|-------|--------|
| 1 | Customer | Sends `POST /api/reviews` with Authorization header and `{ jobId, rating, text }`. |
| 2 | System | **<<include>> UC-03**: Validates JWT, confirms active user. |
| 3 | System | `requireRole("customer")` confirms customer role. |
| 4 | System | Validates `jobId` is present. Validates `rating` is 1–5. |
| 5 | System | Loads job; confirms existence. |
| 6 | System | Confirms `job.customerId === req.user.id`. |
| 7 | System | **<<extend>> UC-08**: Confirms `job.status === "confirmed"` (the extend condition). If not, rejects. |
| 8 | System | Checks no existing `Review` for `jobId`. |
| 9 | System | Creates `Review` `{ jobId, providerId, customerId, rating, text }`. |
| 10 | System | Loads `ProviderProfile`; computes new rolling average: `newAvg = (oldAvg × oldCount + rating) / (oldCount + 1)`. Updates `ratingCount` and `ratingAvg`. Saves. |
| 11 | System | Sets `job.reviewId = review._id`, saves job. |
| 12 | System | Returns HTTP 200 `{ success: true, review: { id, rating, text } }`. |

### Extensions (Alternative Flows)

| Step | Condition | Branching Action |
|------|-----------|-----------------|
| 2a | Invalid JWT | UC-03 returns HTTP 401. |
| 3a | User is not a customer | HTTP 403 `{ message: "Forbidden" }`. |
| 4a | `jobId` missing | HTTP 400 `{ message: "jobId is required" }`. |
| 4b | `rating` not 1–5 | HTTP 400 `{ message: "Rating must be between 1 and 5" }`. |
| 5a | Job not found | HTTP 404 `{ message: "Job not found" }`. |
| 6a | Customer does not own job | HTTP 403 `{ message: "You can only review your own jobs" }`. |
| 7a | `job.status !== "confirmed"` | HTTP 400 `{ message: "You can only review jobs after they are confirmed" }`. |
| 8a | Review already exists for job | HTTP 400 `{ message: "You already reviewed this job" }`. |
| 8b | DB unique constraint violation (code 11000) | HTTP 400 `{ message: "This job already has a review" }`. |

### Open Issues

- Text review is optional; only `rating` is mandatory.
- Provider cannot respond to reviews currently.

---

## UC-10 — Chat (View / Send Messages)

| Field               | Detail |
|---------------------|--------|
| **Number**          | UC-10 |
| **Name**            | Chat |
| **Summary**         | Either participant (Customer or Provider) of a job can view the message history for that job. Messages are paginated using a cursor-based approach. Sending messages is handled via WebSocket (Socket.IO) on the server (not via this REST route). |
| **Priority**        | Medium |
| **Primary Actor(s)**| Customer, Provider |
| **Secondary Actor(s)**| None |
| **Trigger**         | Participant sends `GET /api/messages/job/:jobId?limit=&before=` with Authorization header. |
| **Preconditions**   | `<<include>>` UC-03: Authenticate User passes. `req.user.id` matches `job.customerId` or `job.providerId`. Job exists. |
| **Postconditions**  | Returns array of message documents ordered ascending by `createdAt`. |

### Main Success Scenario

| Step | Actor | Action |
|------|-------|--------|
| 1 | Customer/Provider | Sends `GET /api/messages/job/:jobId` with Authorization header. |
| 2 | System | **<<include>> UC-03**: Validates JWT, confirms active user. |
| 3 | System | Validates `jobId` ObjectId format. |
| 4 | System | Loads job (`customerId`, `providerId` fields only). |
| 5 | System | Checks `req.user.id === job.customerId OR job.providerId`. |
| 6 | System | Applies optional cursor filter: if `before` query param is provided, fetches messages with `createdAt < before`. |
| 7 | System | Queries `Message` collection sorted `desc` by `createdAt`, limited to `min(limit, 100)`. Reverses result for ascending UI display. |
| 8 | System | Returns HTTP 200 with array of message objects (`jobId`, `senderId`, `content`, `isBlocked`, `createdAt`). |

### Extensions (Alternative Flows)

| Step | Condition | Branching Action |
|------|-----------|-----------------|
| 2a | Invalid JWT | HTTP 401. |
| 3a | Invalid `jobId` | HTTP 400 `{ message: "Invalid jobId" }`. |
| 4a | Job not found | HTTP 404 `{ message: "Job not found" }`. |
| 5a | User is not a participant | HTTP 403 `{ message: "Forbidden" }`. |
| 6a | `before` param is not a valid ISO date | HTTP 400 `{ message: "Invalid before date" }`. |

### Open Issues

- Message *sending* uses Socket.IO (real-time). No REST POST endpoint for messages exists in this routes file.

---

## UC-11 — Manage Providers *(Admin)*

| Field               | Detail |
|---------------------|--------|
| **Number**          | UC-11 |
| **Name**            | Manage Providers |
| **Summary**         | An Admin performs moderation actions on Provider accounts: listing all providers, verifying/unverifying them, deleting them, and managing strike counts. |
| **Priority**        | Medium |
| **Primary Actor(s)**| Admin |
| **Secondary Actor(s)**| None |
| **Trigger**         | Admin sends one of: `GET /api/admin/providers`, `PATCH /api/admin/provider/:id/verify`, `PATCH /api/admin/provider/:id/unverify`, `PATCH /api/admin/provider/:id/strike/add`, `PATCH /api/admin/provider/:id/strike/remove`, `DELETE /api/admin/provider/:id`. |
| **Preconditions**   | `<<include>>` UC-03: Authenticate User passes. `req.user.role === "admin"`. |
| **Postconditions**  | Provider record updated or deleted as per sub-action. |

### Main Success Scenario (Delete Provider)

| Step | Actor | Action |
|------|-------|--------|
| 1 | Admin | Sends `DELETE /api/admin/provider/:id` with Authorization header. |
| 2 | System | **<<include>> UC-03**: Validates JWT. `requireRole("admin")` confirms admin role. |
| 3 | System | Finds `ProviderProfile` by `userId`. Deletes profile. |
| 4 | System | Finds `UserAuth` by id. Deletes user account. |
| 5 | System | Returns HTTP 200 `{ message: "Provider and user account deleted successfully" }`. |

### Extensions (Alternative Flows)

| Step | Condition | Branching Action |
|------|-----------|-----------------|
| 2a | Non-admin role | HTTP 403. |
| 3a | Provider profile not found | HTTP 404. |
| Strike Add | Provider already has 3 strikes | HTTP 404 `{ message: "Provider not found or max strikes reached" }`. |
| Strike Add auto | Strike reaches 3 and `isVerified` is true | System sets `isVerified = false` and saves automatically. |

---

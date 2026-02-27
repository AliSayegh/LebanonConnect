# LebanonConnect — UML Justification & Modelling Rationale

*This document provides academically rigorous justification for every design decision in the LebanonConnect Use Case Diagram and Specification Tables.*

---

## 1. Justification of `<<include>>` Relationships

### Definition (UML 2.5)
An `<<include>>` relationship denotes that the behaviour of the *including* use case necessarily incorporates the complete behaviour of the *included* use case at a defined point. Inclusion is **mandatory and unconditional** — the included behaviour is not optional.

### Application in This System

All protected routes in `backend/routes/` mount the `requireAuth` middleware as the **first route handler** before any business logic:

```js
// Backend/routes/JobRoutes.js (line 42)
router.post("/", requireAuth, requireRole("customer"), async (req, res) => { … });

// Backend/routes/reviewRoutes.js (line 7)
router.post("/", requireAuth, requireRole("customer"), async (req, res) => { … });
```

Because `requireAuth` is unconditionally present for every protected endpoint, the UML `<<include>>` relationship is semantically correct: **Create Job**, **Accept Job**, **Complete Job**, **Confirm Job**, **Chat**, **Leave Review**, **Manage Providers**, and **View Platform Stats** all include **Authenticate User** without exception.

### JWT Validation as a Nested `<<include>>`

Inside `requireAuth`:
```js
const decoded = jwt.verify(token, process.env.JWT_SECRET);
```
`jwt.verify` is always called; there is no path through `requireAuth` that bypasses it. Therefore **Authenticate User** `<<includes>>` **JWT Validation**. This two-level nesting reflects the layered architecture: JWT Validation is a cryptographic primitive, while Authenticate User adds application-level checks (user status in DB).

---

## 2. Justification of the `<<extend>>` Relationship

### Definition (UML 2.5)
An `<<extend>>` relationship indicates that a use case *may* optionally augment another at a defined **extension point**, dependent on a **condition** evaluating to true.

### Application: Leave Review `<<extends>>` Confirm Job Completion

The review route enforces this guard explicitly:
```js
// backend/routes/reviewRoutes.js (line 32–35)
if (job.status !== "confirmed")
  return res.status(400).json({
    message: "You can only review jobs after they are confirmed",
  });
```

This means **Leave Review** is conditionally executable — the behaviour is triggered **only when** `job.status === "confirmed"`. This is the textbook definition of an `<<extend>>` relationship:

- The **base use case** is **Confirm Job Completion** (the condition lives on this boundary).
- The **extending use case** is **Leave Review** (conditionally activated when the confirmation has occurred).
- The **extension point** is: `job.status == "confirmed"`.

Using `<<extend>>` rather than `<<include>>` is correct here because Leave Review is **not always performed** after job confirmation. The customer may choose never to review.

---

## 3. Justification of Actor Inheritance (Generalisation)

### Definition (UML 2.5)
Actor generalisation (`--|>`) means that a specialised actor inherits all use cases of the parent actor and may participate in additional system interactions.

### Actor Hierarchy in This System

| Actor | Inherits From | Justification |
|-------|--------------|---------------|
| `Customer` | `Authenticated User` | Every Customer request requires authentication via `requireAuth`. Customers additionally access Create Job, Confirm Job, Leave Review, and Chat. |
| `Provider` | `Authenticated User` | Every Provider request requires authentication. Providers additionally access Accept Job, Complete Job, and Chat. |
| `Admin` | `Authenticated User` | All admin routes enforce both `requireAuth` and `requireRole("admin")`. Admins additionally access Manage Providers and Platform Stats. |

This hierarchy accurately captures the middleware chain observed in the code:

```
requireAuth  →  requireRole("customer" | "provider" | "admin")  →  handler
```

The `Guest` actor is kept separate (not a child of `Authenticated User`) because Guest-accessible routes (`/auth/register`, `/auth/login`) do **not** invoke `requireAuth`.

---

## 4. Explanation of Authentication Modelling Choice

### Why Model `Authenticate User` as a Separate Use Case?

Authentication is modelled as a dedicated use case rather than as a note or constraint because:

1. **It has observable, testable behaviour**: `requireAuth` can succeed or fail independently of the downstream handler.
2. **It is reused across many use cases**: 8 distinct use cases include it. Extracting it prevents repetition and keeps diagrams readable.
3. **It modifies system state**: It attaches `req.user = decoded` — a side effect that downstream handlers depend on.
4. **It can fail in multiple distinguishable ways**: Missing token → HTTP 401 "No token"; invalid signature → HTTP 401 "Invalid token"; expired token → HTTP 401 "Invalid token"; inactive user → HTTP 401 "User not found or inactive".

### Why Is `JWT Validation` a Separate Use Case?

`jwt.verify()` is a cryptographic primitive that:
- Verifies the HMAC-SHA256 signature.
- Checks the `exp` claim.
- Decodes the payload.

Separating it from `Authenticate User` in the diagram makes the two-stage process explicit: **(a)** cryptographic validity and **(b)** application-level validity (user still in DB, still active). This separation is academically important because the token could be cryptographically valid but the user may have been deactivated after issuance.

---

## 5. Explanation of Conditional Review Logic

### The Complete Job Lifecycle

The system enforces a strict linear state machine on jobs:

```
open → accepted → completed → confirmed
                                  ↑
                          Only here can a review be submitted
```

This is enforced by three distinct route patches:

| Route | Actor | Required Prior Status | Sets Status To |
|-------|-------|-----------------------|----------------|
| `PATCH /:jobId/accept` | Provider | `"open"` | `"accepted"` |
| `PATCH /:jobId/complete` | Provider | `"accepted"` | `"completed"` |
| `PATCH /:jobId/confirm` | Customer | `"completed"` | `"confirmed"` |

And the review route adds the final gate:

```js
if (job.status !== "confirmed")
  return res.status(400).json({ … });
```

### Why the Review is Conditional on `"confirmed"` and Not `"completed"`

The system requires the **Customer to explicitly confirm** the job (providing a `finalPrice`) before a review can be submitted. This is a deliberate design choice: the customer's confirmation acknowledges satisfaction (or at least acknowledgement) of the work, and simultaneously captures financial data for commission calculation. Allowing reviews on `"completed"` (before customer confirmation) could lead to reviews submitted before the customer has accepted the work outcome.

This two-actor handshake is accurately represented in the UML via:
- **Complete Job** (Provider action) → transitions state to `"completed"`.
- **Confirm Job Completion** (Customer action) → transitions state to `"confirmed"`. This is the **extension point** for Leave Review.
- **Leave Review** `<<extend>>` **Confirm Job Completion** — executed only when `job.status === "confirmed"`.

---

## 6. Validation Checklist

| Check | Status | Evidence |
|-------|--------|----------|
| All protected routes include `requireAuth` | ✅ Pass | Every route in `JobRoutes.js`, `reviewRoutes.js`, `messageRoutes.js`, `adminRoutes.js` begins with `requireAuth`. |
| JWT validation modelled as nested `<<include>>` | ✅ Pass | `requireAuth` unconditionally calls `jwt.verify()`. |
| Role-based access control reflected in actor restrictions | ✅ Pass | Customer-only: Create Job, Confirm, Leave Review. Provider-only: Accept Job, Complete Job. Admin-only: Manage Providers, Stats. |
| Review is conditional on job status `"confirmed"` | ✅ Pass | Line 32 of `reviewRoutes.js` explicitly checks `job.status !== "confirmed"`. |
| Diagram `<<extend>>` condition matches code | ✅ Pass | Extension point: `job.status == "confirmed"`. |
| No invented features | ✅ Pass | All use cases traceable to existing route handlers. |
| Subscription limitation modelled | ✅ Note | Included in Accept Job alternative flows (UC-06 step 4); not shown as a separate use case to avoid complexity overload. |
| Duplicate review prevention modelled | ✅ Pass | UC-09 extensions step 8a/8b. |
| Diagrams match specification tables | ✅ Pass | All use cases in tables appear in `.puml` diagram nodes. |

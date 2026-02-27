# LebanonConnect — UML Documentation

This directory contains the complete UML Use Case documentation for the **LebanonConnect** platform.

## Contents

| File | Description |
|------|-------------|
| [`use_case_specifications.md`](./use_case_specifications.md) | Formal use case specification tables (UC-01 to UC-11) matching the actual implementation |
| [`uml_justification.md`](./uml_justification.md) | Academically rigorous justification of all UML modelling decisions |
| [`diagrams/system_use_case.puml`](./diagrams/system_use_case.puml) | PlantUML source — Full System Use Case Diagram |
| [`diagrams/authentication_usecase.puml`](./diagrams/authentication_usecase.puml) | PlantUML source — Authentication Sub-Diagram |

## How to Render Diagrams

Install [PlantUML](https://plantuml.com/) locally, or use the online server:

```bash
# Option 1: Using PlantUML JAR
java -jar plantuml.jar docs/diagrams/system_use_case.puml

# Option 2: Using the online server (outputs PNG URL)
# Visit https://www.plantuml.com/plantuml/uml/ and paste .puml contents
```

Alternatively, the [PlantUML VSCode extension](https://marketplace.visualstudio.com/items?itemName=jebbs.plantuml) will render previews inline.

## Use Cases Covered

| ID | Name | Actor(s) |
|----|------|---------|
| UC-01 | Register | Guest |
| UC-02 | Login | Guest |
| UC-03 | Authenticate User | System (infrastructure) |
| UC-04 | JWT Validation | System (infrastructure) |
| UC-05 | Create Job | Customer |
| UC-06 | Accept Job | Provider |
| UC-07 | Complete Job | Provider |
| UC-08 | Confirm Job Completion | Customer |
| UC-09 | Leave Review | Customer |
| UC-10 | Chat | Customer, Provider |
| UC-11 | Manage Providers | Admin |

## UML Relationships Summary

- **`<<include>>`**: All protected use cases include **Authenticate User**. Authenticate User includes **JWT Validation**.
- **`<<extend>>`**: **Leave Review** extends **Confirm Job Completion** when `job.status === "confirmed"`.
- **Actor generalisation**: Customer, Provider, and Admin all inherit from Authenticated User.

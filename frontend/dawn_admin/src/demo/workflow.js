export const demoWorkflow = {
  name: "Neighborhood Repair — pilot launch",
  content: `Develop a small neighborhood repair service from idea to a production-ready pilot.

Customers submit a repair request with category, description, preferred time, and contact details. An operator triages the request, assigns a qualified technician, obtains customer approval for the quote, schedules the visit, and records completion and feedback.

Pilot scope: one neighborhood, appliance and furniture repairs, a web intake form, an operator queue, and email notifications. Exclude emergencies, payments, and automatic technician onboarding.

Success criteria: every request has an owner and visible status; a customer must approve the quote before scheduling; access to customer contact details is restricted; notification failures can be retried without duplicates.

Deliverables: requirements, implementation tasks, acceptance tests, operating checklist, and a staged launch/rollback plan. Identify missing facts, including staffing, local rules, pricing, and the hosting target. Do not claim deployment or measured business results.`,
  deliverables: [
    [
      "Requirements",
      "Request states: submitted → triaged → quoted → approved → scheduled → completed. Reject scheduling before quote approval. Restrict customer contact access to the assigned operator and technician.",
    ],
    [
      "Implementation backlog",
      "Build intake validation, an authenticated operator queue, assignment tracking, customer quote approval, and an idempotent email notification adapter. Hosting and email service remain decisions for the owner.",
    ],
    [
      "Acceptance tests",
      "Reject invalid intake; deny unauthorized contact access; prevent scheduling without approval; retry notifications without duplication; preserve an audit trail when reassigning a request.",
    ],
    [
      "Pilot operations",
      "Assign an operator to review requests, verify technician qualifications, handle failed notifications, and resolve customer complaints. Confirm staffing and applicable local requirements before launch.",
    ],
    [
      "Launch & rollback",
      "Start with an internal walkthrough, then a small invited pilot. Proceed only after acceptance tests pass and the owner approves. If intake or notifications fail, pause new requests and use a reviewed manual queue. No external deployment occurs in this demo.",
    ],
  ],
};
export const demoRecommendations = [
  {
    id: "agile",
    reason:
      "An invited pilot benefits from short discovery/delivery cycles and feedback before expanding scope.",
    evidence:
      "The brief calls for a small pilot, acceptance tests, and a staged launch.",
    tradeoff:
      "Keep quote approval and privacy requirements stable as squads iterate.",
  },
  {
    id: "flat",
    reason:
      "A narrow initial scope can use direct specialist contributions and one owner decision.",
    evidence:
      "One neighborhood and two repair categories limit the initial coordination scope.",
    tradeoff:
      "The owner can become a bottleneck as requests and specialists grow.",
  },
  {
    id: "functional",
    reason:
      "Specialist review helps separate product implementation, operating policy, and financial assumptions.",
    evidence:
      "The brief identifies staffing, local rules, and pricing as unresolved requirements.",
    tradeoff:
      "Department handoffs can slow feedback compared with a small pilot team.",
  },
];
// Replay the actual dependency graph with the same maximum wave size as execution.
export function nextDemoWave(model, completed) {
  return model.nodes
    .filter(
      (node) =>
        !completed.includes(node.id) &&
        node.dependsOn.every((id) => completed.includes(id)),
    )
    .slice(0, 3)
    .map((node) => node.id);
}
export function contribution(node) {
  const role = node.role.toLowerCase();
  if (role.includes("finance"))
    return "Pricing and staffing are unknown. Prepare a cost worksheet; exclude payment execution from the pilot.";
  if (role.includes("research") || role.includes("discovery"))
    return "Validate request categories with pilot participants. Record unanswered staffing and qualification questions before expanding scope.";
  if (
    role.includes("operations") ||
    role.includes("local") ||
    role.includes("front")
  )
    return "Define triage ownership, technician assignment, notification failure handling, and escalation to the operator.";
  if (
    role.includes("product") ||
    role.includes("delivery") ||
    role.includes("engineering")
  )
    return "Specify intake, status tracking, approved-quote scheduling, access controls, and acceptance tests.";
  return "Review upstream contributions, resolve scope and ownership, and record open requirements in the pilot launch package.";
}

export const demoRoadmap = [
  {
    id: "scope",
    title: "Confirm pilot ownership and intake rules",
    owner: "Pilot owner + operator",
    startDay: 1,
    endDay: 2,
    dependsOn: [],
    action:
      "Confirm an operator, repair categories, technician qualification rules, and escalation policy.",
    example:
      "An appliance request records category, description, preferred time, and contact details; emergency requests are rejected with an operator contact route.",
    acceptance:
      "The owner approves required fields, categories, and escalation rules.",
    sourceEvidence:
      "Exclude emergencies, payments, and automatic technician onboarding.",
    assumption:
      "A pilot owner and operator are available to review scope during these two days.",
  },
  {
    id: "intake",
    title: "Build and validate request intake",
    owner: "Product / implementation specialist",
    startDay: 3,
    endDay: 6,
    dependsOn: ["scope"],
    action:
      "Implement the intake form and authenticated operator queue using the approved request fields.",
    example:
      "A furniture-repair submission creates a submitted request with an assigned operator; a user without ownership cannot read its contact details.",
    acceptance:
      "Valid requests appear in the queue; invalid fields and unauthorized contact access are rejected in tests.",
    sourceEvidence:
      "a web intake form, an operator queue, and email notifications.",
    assumption:
      "One implementation specialist has an existing development environment and authentication foundation.",
  },
  {
    id: "operations",
    title: "Write pilot triage and technician procedures",
    owner: "Operations specialist",
    startDay: 3,
    endDay: 5,
    dependsOn: ["scope"],
    action:
      "Prepare triage, qualification, reassignment, and complaint procedures while intake is built.",
    example:
      "The operator assigns a qualified technician to appliance requests and records the reason for any reassignment.",
    acceptance:
      "An operator can walk through one appliance and one furniture request using the checklist.",
    sourceEvidence: "assigns a qualified technician",
    assumption:
      "Technician qualification criteria must be supplied by the owner; no qualifications are invented.",
  },
  {
    id: "quote",
    title: "Implement approval-gated scheduling",
    owner: "Product / implementation specialist",
    startDay: 7,
    endDay: 9,
    dependsOn: ["intake"],
    action:
      "Add quote review, explicit customer approval, and scheduling transitions.",
    example:
      "A quoted request cannot become scheduled until the customer approves; the status change records the approval event.",
    acceptance:
      "Tests block unapproved scheduling and allow an approved request to be scheduled.",
    sourceEvidence: "a customer must approve the quote before scheduling",
    assumption:
      "The customer approval channel is confirmed; payments remain out of scope.",
  },
  {
    id: "validate",
    title: "Test retries and run the pilot walkthrough",
    owner: "Validation specialist + operator",
    startDay: 10,
    endDay: 12,
    dependsOn: ["quote", "operations"],
    action:
      "Exercise intake, access restrictions, approval gates, email failure retries, and operator recovery.",
    example:
      "Retry a failed scheduling email twice with the same idempotency key and verify only one notification is delivered.",
    acceptance:
      "All listed acceptance checks pass and the operator can recover a failed notification.",
    sourceEvidence: "notification failures can be retried without duplicates.",
    assumption:
      "A scoped email adapter and test destination are configured before this stage.",
  },
  {
    id: "launch",
    title: "Approve an invited pilot and rollback route",
    owner: "Pilot owner",
    startDay: 13,
    endDay: 14,
    dependsOn: ["validate"],
    action:
      "Review test evidence, confirm the hosting target, invite pilot participants, and rehearse pausing new intake.",
    example:
      "If intake fails, pause the form and direct new requests to a reviewed manual queue; existing requests retain ownership.",
    acceptance:
      "Owner records launch approval, hosting configuration, and the tested rollback procedure.",
    sourceEvidence: "a staged launch/rollback plan.",
    assumption:
      "Hosting, local rules, staffing, and participant consent are confirmed. Delays here extend the estimate; this example does not deploy anything.",
  },
];

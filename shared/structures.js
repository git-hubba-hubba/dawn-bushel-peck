const node = (id, role, dependsOn = [], mandate = "") => ({
  id,
  role,
  dependsOn,
  mandate,
});
const specialist = (prefix, dependency) =>
  ["research", "product", "finance"].map((role) =>
    node(
      `${prefix}-${role}`,
      `${prefix} ${role} specialist`,
      dependency,
      `Develop a concrete ${role} contribution. Own this domain; expose constraints and evidence.`,
    ),
  );
export const structures = [
  {
    id: "flat",
    name: "Flat",
    symbol: "⊤",
    tag: "Direct & connected",
    description:
      "A short chain of command. Leadership stays close to contributors, giving ideas a direct path to a decision.",
    authority: "Leadership, close to the team",
    flow: "Direct communication across minimal layers",
    fit: "Small teams with big ideas",
    strength: "Simple coordination, faster decisions, and individual autonomy.",
    risk: "Leadership capacity",
    caution: "A wide span of control can overload leaders as the team grows.",
    purpose:
      "Speed, simplicity, direct communication, and autonomy with few management layers.",
    nodes: [
      ...specialist("team", []),
      node(
        "owner",
        "CEO / Owner",
        ["team-research", "team-product", "team-finance"],
        "Make a direct decision from specialist contributions; produce an integrated plan.",
      ),
    ],
    final: "owner",
  },
  {
    id: "functional",
    name: "Functional",
    symbol: "⌘",
    tag: "Specialist-led",
    description:
      "Group work by expertise. Finance, marketing, product, and operations contribute through their own hierarchy.",
    authority: "Top-down through functional heads",
    flow: "Within departments, coordinated through leadership",
    fit: "Deep specialization at scale",
    strength: "Clear responsibilities and focused skill development.",
    risk: "Departmental silos",
    caution: "Cross-functional visibility needs deliberate coordination.",
    purpose:
      "Deep specialization, clear responsibilities, predictable execution and strategic oversight.",
    nodes: [
      ...["finance", "marketing", "product", "operations"].flatMap((role) => [
        node(
          `${role}-specialist`,
          `${role} specialist`,
          [],
          `Analyze the idea within ${role}; own this domain.`,
        ),
        node(
          `${role}-head`,
          `${role} department head`,
          [`${role}-specialist`],
          `Review only your department contribution; approve and escalate its plan.`,
        ),
      ]),
      node(
        "ceo",
        "CEO",
        ["finance-head", "marketing-head", "product-head", "operations-head"],
        "Resolve departmental silos and align approved functional plans with strategy.",
      ),
    ],
    final: "ceo",
  },
  {
    id: "divisional",
    name: "Divisional",
    symbol: "▦",
    tag: "Autonomous units",
    description:
      "Independent business divisions each own their functions, bringing decisions closer to markets and customers.",
    authority: "Within each autonomous division",
    flow: "Inside units, coordinated through corporate HQ",
    fit: "Multiple markets or product lines",
    strength: "Local accountability and flexible market responses.",
    risk: "Duplicated effort",
    caution:
      "Repeated functions can compete for resources and weaken coordination.",
    purpose:
      "Market responsiveness, divisional accountability, autonomous execution and customer proximity.",
    nodes: [
      node(
        "hq-strategy",
        "Corporate HQ",
        [],
        "Identify two distinct markets or product divisions grounded in the idea. If unsupported, state this limitation instead of inventing markets.",
      ),
      ...["A", "B"].flatMap((unit) => [
        ...specialist(`division-${unit}`, ["hq-strategy"]),
        node(
          `division-${unit}-head`,
          `Division ${unit} head`,
          [
            `division-${unit}-research`,
            `division-${unit}-product`,
            `division-${unit}-finance`,
          ],
          "Make an autonomous divisional execution decision and own outcomes and resources.",
        ),
      ]),
      node(
        "hq",
        "Corporate HQ",
        ["division-A-head", "division-B-head"],
        "Coordinate independent divisions, flag duplicated effort, and allocate shared resources.",
      ),
    ],
    final: "hq",
  },
  {
    id: "agile",
    name: "Agile",
    symbol: "⟳",
    tag: "Adapt & iterate",
    description:
      "Self-directed cross-functional squads collaborate continuously. Leadership provides vision and coaching.",
    authority: "Self-directed squads",
    flow: "Team-to-team collaboration with coaching",
    fit: "Fast-changing opportunities",
    strength: "Early value delivery and iterative problem solving.",
    risk: "Cultural commitment",
    caution: "Teams need shared commitment; managers adopt coaching roles.",
    purpose:
      "Early value, adaptation, cross-functional collaboration, autonomy and iterative delivery.",
    nodes: [
      node(
        "vision",
        "Vision coach",
        [],
        "Define outcome and constraints; provide guidance rather than task commands.",
      ),
      node(
        "squad-1",
        "Discovery squad",
        ["vision"],
        "Decide autonomously on a first discovery increment across research, product and finance.",
      ),
      node(
        "squad-2",
        "Delivery squad",
        ["vision"],
        "Decide autonomously on an early usable deliverable across product, operations and marketing.",
      ),
      node(
        "squad-1-iteration",
        "Discovery squad iteration",
        ["squad-1", "squad-2"],
        "Use peer feedback to adapt your plan; record what changed and a testable next increment.",
      ),
      node(
        "squad-2-iteration",
        "Delivery squad iteration",
        ["squad-1", "squad-2"],
        "Adapt based on discovery feedback; identify early value, experiments and next sprint.",
      ),
      node(
        "sprint",
        "Squad retrospective",
        ["squad-1-iteration", "squad-2-iteration"],
        "Synthesize team-owned commitments and next increments; do not replace autonomy with hierarchy.",
      ),
    ],
    final: "sprint",
  },
  {
    id: "matrix",
    name: "Matrix",
    symbol: "⊞",
    tag: "Shared expertise",
    description:
      "A grid connects functional expertise with projects. Contributors report to functional and project managers.",
    authority: "Functional and project managers",
    flow: "Across both project and functional axes",
    fit: "Cross-department projects",
    strength: "Broader input and closer links between departments.",
    risk: "Dual reporting conflicts",
    caution: "Define accountability early to reduce decision delays.",
    purpose:
      "Cross-functional information sharing, shared expertise and explicit dual accountability.",
    nodes: [
      node(
        "project",
        "Project manager",
        [],
        "Define deliverables, project priorities and accountable decision owners.",
      ),
      node(
        "finance",
        "Finance manager",
        [],
        "Define financial guardrails and resource priorities.",
      ),
      node(
        "engineering",
        "Engineering manager",
        [],
        "Define product and feasibility priorities.",
      ),
      node(
        "finance-contributor",
        "Project finance contributor",
        ["project", "finance"],
        "Meet both manager mandates; explicitly flag any conflict.",
      ),
      node(
        "engineering-contributor",
        "Project engineering contributor",
        ["project", "engineering"],
        "Meet both manager mandates; explicitly flag any conflict.",
      ),
      node(
        "resolution",
        "Joint project / functional council",
        [
          "project",
          "finance",
          "engineering",
          "finance-contributor",
          "engineering-contributor",
        ],
        "Resolve dual reporting conflicts explicitly and produce a responsibility and execution plan.",
      ),
    ],
    final: "resolution",
  },
  {
    id: "network",
    name: "Network",
    symbol: "⌬",
    tag: "Distributed leadership",
    description:
      "A connected web of peers shares leadership and responsibility. Ideas move without a single apex.",
    authority: "Shared across peers",
    flow: "Peer-to-peer through a web of relationships",
    fit: "Creative, long-term collaboration",
    strength: "Diverse contributions encourage innovation.",
    risk: "Unclear accountability",
    caution: "Explicit communication and ownership keep the network aligned.",
    purpose:
      "Creative diversity, shared leadership, open collaboration and adaptability with explicit ownership.",
    nodes: [
      ...specialist("peer", []),
      ...["research", "product", "finance"].map((role) =>
        node(
          `peer-${role}-exchange`,
          `${role} peer exchange`,
          ["peer-research", "peer-product", "peer-finance"],
          "Review all peer contributions, reconcile differences, and propose shared commitments without imposing a central authority.",
        ),
      ),
      node(
        "consensus",
        "Peer consensus",
        [
          "peer-research-exchange",
          "peer-product-exchange",
          "peer-finance-exchange",
        ],
        "Act as a recorder of distributed decisions; retain dissent, communication paths and named accountable roles.",
      ),
    ],
    final: "consensus",
  },
  {
    id: "decentralized",
    name: "Decentralized",
    symbol: "⋈",
    tag: "Local autonomy",
    description:
      "Executives set strategic direction. Local teams make the decisions closest to daily work.",
    authority: "Local daily decisions; executive strategy",
    flow: "Strategic guidance with local execution",
    fit: "Dynamic, multi-location businesses",
    strength: "Front-line expertise supports responsiveness.",
    risk: "Fragmentation and redundancy",
    caution: "Local autonomy needs coordination for consistency.",
    purpose:
      "Local responsiveness, empowered daily decisions, executive strategic consistency and local expertise.",
    nodes: [
      node(
        "strategy",
        "Executive strategy",
        [],
        "Set strategic constraints; identify two local contexts supported by source content. Flag if multiple locations are not applicable.",
      ),
      node(
        "unit-a",
        "Local unit A",
        ["strategy"],
        "Make local daily operating decisions independently within executive strategy.",
      ),
      node(
        "unit-b",
        "Local unit B",
        ["strategy"],
        "Make local daily operating decisions independently within executive strategy for a distinct context.",
      ),
      node(
        "local-a",
        "Front-line team A",
        ["unit-a"],
        "Resolve daily delivery and customer concerns locally; state ownership.",
      ),
      node(
        "local-b",
        "Front-line team B",
        ["unit-b"],
        "Resolve daily delivery and customer concerns locally; state ownership.",
      ),
      node(
        "alignment",
        "Strategic alignment review",
        ["strategy", "local-a", "local-b"],
        "Check only cross-unit strategic alignment; preserve local decisions, flag redundancy and silos.",
      ),
    ],
    final: "alignment",
  },
];
export const structureById = Object.fromEntries(
  structures.map((model) => [model.id, model]),
);

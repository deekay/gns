# GNS Use-Case Scenes

This note turns the narrative framework into concrete scenes people can picture.

It is not a product roadmap and it is not a final marketing page. The goal is to pressure-test the thesis against moments that feel real, near-term, and important.

## How To Use This

Each scene is trying to answer the same question:

> What does GNS let a human do that feels both new and obviously useful?

The scenes are ordered from easiest to explain to most ambitious:

1. pay the right person
2. use the right service
3. delegate safely to software

The recommendation is to treat them as a ladder, not as competing stories. The first public-facing story should start with payment unless there is a strong reason not to.

## Scene 1: Pay The Right Person

### The scene

A human tells their wallet or client:

> Pay `david` back for dinner.

The client resolves `david`, shows the current signed payment destination, confirms whether the target changed since the last payment, and asks for approval before sending.

The human is not comparing raw addresses. The client is not guessing a counterparty from context. The name is the trusted bridge.

### Why it works

This is the cleanest proof point because the stakes are immediate.

- money going to the wrong place is easy to understand
- the pain of opaque addresses is already familiar
- human-readable names feel obviously better at the point of action

It also gives a good answer to "why not just let the model handle it?" A model can help interpret the request, but it should not be free to improvise who gets paid.

### What GNS is doing here

- turning a human-readable name into an authoritative payment instruction
- giving the client something verifiable to resolve before it acts
- letting the user pin, review, and approve counterparties in familiar words

### What not to imply

- this should not be framed as only a payment alias system
- this should not be framed as a direct attack on adjacent human-readable payment efforts
- this is the first proof point, not the full destination

### Why it matters strategically

This is the best on-ramp because it is concrete and high-stakes. It earns the right to tell the bigger story later.

## Scene 2: Use The Right Service

### The scene

A human tells their client:

> Book me a refundable Delta flight under my budget.

The client knows it is allowed to browse certain travel names, compare offers, and ask for approval before buying. It resolves `delta` as the official service the human means, checks the current signed records, and shows the human which merchant and payment target it is about to use.

The human is not choosing between raw URLs, hidden affiliate paths, spoofed apps, or substituted endpoints. The human is choosing the service they mean in words they can understand.

### Why it works

This is the natural second step after the payment story lands.

It naturally includes:

- merchant trust
- service discovery
- payment approval
- endpoint verification

It is also a better long-term frame than identity alone. A handle or profile is static. A trusted service relationship is active and much closer to where software will actually make decisions on a human's behalf. But it is still easier to believe after Scene 1 has already established why names matter around money.

### What GNS is doing here

- binding a service name to owner-controlled, signed instructions
- giving the client a way to verify official endpoints before it acts
- making room for warnings like "this service record changed" or "this payment target is new"

### What not to imply

- do not pretend GNS alone solves all merchant reputation or fraud problems
- do not imply the whole web will immediately replatform onto GNS-native clients
- do not overstate the exact future browser shape

### Why it matters strategically

If Scene 1 proves the need for trustworthy names around money, Scene 2 shows the larger surface area: humans need trustworthy names for choosing which service to trust.

This is probably the best second story, not the first one.

## Scene 3: Delegate Safely To Software

### The scene

A human sets standing rules for their software:

- only buy from names I have approved
- warn me if a resolved target changed
- do not send more than my approval threshold without asking
- use `david` for reimbursements
- use `delta` for travel unless I override it

Later, the human gives a broad instruction:

> Handle my travel for this conference.

The model interprets the goal. The client still has to resolve names, obey policy, verify counterparties, and present the human with a legible summary before acting.

### Why it works

This scene captures the real long-term prize.

The point is not just lookup. It is giving humans a way to constrain software in words that stay meaningful as more work gets delegated.

This is where the phrase "LLMs widen the interpretation surface; GNS narrows the action surface" becomes most useful.

### What GNS is doing here

- turning some words in a user's instructions into trusted constraints
- separating "understand what I want" from "decide who I mean"
- helping the client enforce preferences at the counterparty layer

### What not to imply

- do not imply the model becomes deterministic
- do not imply names eliminate every trust or policy problem
- do not imply agent-to-agent naming is the central purpose

### Why it matters strategically

This is the scene that makes GNS feel like future infrastructure rather than a niche naming tool.

It is also the place where the "human-readable authority" framing becomes clearest.

## Recommended Story Order

If these scenes are used in a presentation, homepage, or explainer, the recommended order is:

1. start with Scene 1 because it is instantly legible and high-stakes
2. expand into Scene 2 because it generalizes the trust problem after the payment wedge is established
3. end on Scene 3 because it shows why the problem grows as software becomes more capable

That progression moves from concrete pain to broader system relevance.

## Product Behaviors These Scenes Suggest

These scenes imply certain client behaviors that may deserve stronger emphasis in demos and docs:

- clear counterparty previews before payment or action
- warnings when a resolved target changed since the user's last interaction
- pinned or allowlisted names
- approval thresholds tied to named counterparties
- explicit display of what record was resolved and why the client considers it authoritative

These are not all protocol features. Some are product and client behaviors. But they make the narrative more believable because they show how GNS would actually help a human stay in control.

## Relationship To The Two-Lane Story

These scenes also help explain why salient names matter.

If names become part of how humans tell software which service they trust, then certain names carry outsized coordination value. Pretending all names should be allocated the same way no longer looks neutral.

That strengthens the two-lane case:

- ordinary names can stay simple
- salient names need a more legitimate market process

The fairness argument is not mainly about prestige. It is about coordination pressure and the cost of misallocation.

## Open Questions

- Which scene feels most natural for the first public-facing explainer?
- Which scene is best for a live product demo?
- How much policy language should appear in early messaging versus later product material?
- Which examples feel vivid without relying too much on specific current companies?

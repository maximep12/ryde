# Codebase Analysis for Developer Onboarding

Analyze this codebase thoroughly to create a comprehensive onboarding guide for new developers. Focus on understanding the business domain, architectural decisions, and the conceptual model that drives the system.

## Tool Usage Guidelines

### Efficient File Reading

- **Use batch operations**: When reading multiple files, use the task tool to batch file reads efficiently rather than reading files one by one
- **Pattern matching**: Use glob patterns to read groups of related files (e.g., `**/*.ts`, `src/**/*.test.ts`)
- **Prioritize key files**: Start with manifest files (package.json, tsconfig.json) before diving into source code

### Documentation Lookup

- **Use Context7 MCP**: When you encounter libraries or frameworks, use Context7 to fetch up-to-date documentation
  - Simply include "use context7" when you need current docs for any library
  - Example: "use context7 to understand the latest Next.js app router patterns"
- **Cross-reference versions**: Check package.json versions against Context7 documentation to ensure accuracy

### Analysis Strategy

- **Parallel processing**: Use the task tool for repetitive analysis tasks across multiple files
- **Incremental understanding**: Build knowledge progressively rather than trying to understand everything at once
- **Focus on patterns**: Look for recurring patterns across files rather than analyzing each file in isolation

## Analysis Methodology

Follow this systematic approach for optimal analysis:

### Phase 1: Business Context Discovery

1. **Understand the problem space**: What business problem does this solve? Who are the users?
2. **Identify the value streams**: What are the core features that deliver value?
3. **Map the domain model**: What are the key business entities and their relationships?
4. **Recognize constraints**: What business rules and requirements shape the architecture?

### Phase 2: Architecture & Design Philosophy

1. **Identify architectural style**: Is this event-driven, layered, microservices, modular monolith?
2. **Understand design decisions**: Why were certain patterns chosen? What trade-offs were made?
3. **Map system boundaries**: How is the system divided? What are the key interfaces?
4. **Trace data flow**: How does information move through the system?

### Phase 3: Technical Implementation

1. **Review the tech stack**: Examine package.json, tsconfig.json for technology choices
   - Use Context7 to get current documentation for major dependencies
2. **Understand code organization**: How does the folder structure reflect the architecture?
3. **Identify key abstractions**: What patterns and utilities enable the business logic?
4. **Check integration points**: APIs, databases, third-party services

### Phase 4: Evolution & Context

1. **Recent developments**: Use git history to identify actively changing areas
2. **Technical decisions**: What problems have been solved? What challenges remain?
3. **Team patterns**: What conventions and practices are evident?
4. **Future direction**: Check TODOs, issues, and comments for planned improvements

### Phase 5: Synthesis

1. **Connect business to technical**: How does the code structure serve business needs?
2. **Identify key insights**: What makes this architecture unique or interesting?
3. **Surface critical knowledge**: What must new developers understand to be effective?

## Instructions

Analyze the codebase with a focus on understanding the business domain and architectural decisions. Provide insights that help developers understand not just the "what" but the "why" behind the system design. Be constructive and balanced when discussing areas for improvement.

---

## 1. Business Domain & Purpose

**Understand the problem space:**

- What real-world problem does this system solve?
- Who are the users and what are their needs?
- What is the core value proposition?
- What would happen if this system didn't exist?
- What are the key success metrics for this system?

## 2. System Architecture

**Explain the architectural vision:**

- What is the overall architectural style and why was it chosen?
- How is the system conceptually divided (by feature, by layer, by subdomain)?
- What are the main architectural components and their responsibilities?
- How do these components collaborate to deliver value?
- What architectural patterns are used (MVC, CQRS, Event Sourcing, etc.)?
- What were the key architectural trade-offs?

## 3. Domain Model & Core Concepts

**Map the business to code:**

- What are the core business entities and their relationships?
- How is the domain language reflected in the code?
- What are the key business rules and where are they enforced?
- What are the main workflows and user journeys?
- How does the system handle the most important use cases?

## 4. Technical Foundation

**Key implementation choices:**

- Technology stack overview (frameworks, databases, key libraries)
- How does the technical stack support the business goals?
- What are the main technical patterns and abstractions?
- How is the codebase organized and why?
- Integration approach with external systems

## 5. Data Architecture

**Information flow and persistence:**

- How is data modeled to support the business domain?
- What is the source of truth for different types of data?
- How does data flow through the system?
- What are the consistency and transaction boundaries?
- Caching and performance strategies

## 6. System Boundaries & Integration

**External interfaces and dependencies:**

- How does the system interact with the outside world?
- What are the main APIs and their design philosophy?
- Third-party integrations and their purpose
- Authentication and authorization strategy
- How are external dependencies managed?

## 7. Operational Aspects

**Running and maintaining the system:**

- Development workflow and local setup essentials
- Deployment architecture and environments
- Observability approach (logging, monitoring, tracing)
- How does the system handle failures?
- Performance characteristics and bottlenecks

## 8. Evolution & Technical Strategy

**Past, present, and future:**

- How has the architecture evolved? What drove major changes?
- Current areas of active development
- Known technical debt and its business impact
- Future architectural directions
- Migration strategies in progress

## 9. Key Insights & Decisions

**Critical knowledge for developers:**

- Non-obvious design decisions and their rationale
- Common pitfalls and how to avoid them
- Areas requiring special attention or expertise
- Performance-critical paths
- Security considerations

## 10. Architectural Health Check

**Gentle observations on system maturity:**

- **Strengths**: What aspects of the architecture are particularly well-designed?
- **Growth areas**: Where might the system benefit from refinement as it scales?
- **Technical evolution**: Areas that might need attention as requirements evolve
- **Complexity hotspots**: Parts of the system that carry higher cognitive load
- **Dependency risks**: External dependencies that might need monitoring

_Note: These are high-level architectural observations to help guide strategic decisions, not a detailed issue list._

## 11. Getting Started

**Practical onboarding:**

- Mental model: How to think about this system
- Essential concepts to understand before diving into code
- Recommended exploration path through the codebase
- Key documentation and resources
- How to make your first contribution

---

## Additional Context

$ARGUMENTS

---

## Final Step

**Create the onboarding document:**
After completing the analysis, create an `ONBOARDME.md` file in the project root with the full contents of this analysis. This file will serve as the canonical onboarding document for new developers joining the project.

---

**Note:** Focus on providing information that would help a developer become productive quickly. Emphasize practical knowledge over theoretical concepts, and always explain the "why" behind design decisions when apparent from the code.

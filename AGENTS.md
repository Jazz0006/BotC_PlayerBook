# BotC_PlayerBook — AI development instructions

## Evidence-first validation (effective 2026-10-15)

- **No mechanical test-first.** Define observable acceptance, risk and ownership for each change. Do not create a new test file or manufacture RED/GREEN merely because production source changes. Test-first is optional when a deterministic failing example genuinely helps.
- Select the cheapest **independent, reliable evidence**: existing tests, focused regression/integration tests, real browser/device/runtime scenarios, logs and provider responses, type/build/static checks, and exact diff review. AI-written passing tests alone are not product acceptance.
- Add durable automated tests for high-risk invariants (game/domain rules, authorization, secrets, persistence, money, security, identity, concurrency, API contracts) and demonstrated regressions; prefer the true owning boundary. Preserve any existing CI/release gates, and do not replace essential checks with subjective manual observation.
- For UI/layout, prompt tuning, exploratory experiences and mechanical refactors, use actual behavior and existing coverage first. Avoid code-shape tests, duplicate adapters, needless fixtures, and one test per field/step. Retire obsolete tests only after confirming coverage/value.
- Player-facing rule explanations and hidden-information boundaries must be validated against game rules and observed UI, not only synthetic tests.
- Preserve current project architecture and instruction hierarchy where present. Inspect actual tooling and scripts before running anything; do not invent test commands or assume a particular framework. Never execute paid/network operations without the user's explicit scope/budget approval. Keep unrelated worktrees, feature branches and PRs unchanged when editing governance docs.

# Style Contract

**Version:** 1.0 — 25 August 2026

The mandatory UI compliance gate. Run this before implementing a screen and again before approving any Pull Request that touches markup or CSS.

`ui-spec.md` is the full source of truth for the visual design. This file is the short enforcement checklist, kept deliberately short so that a reviewer can run it against a diff without re-reading the specification. Where the two disagree, `ui-spec.md` wins and this file is corrected.

Each rule carries an identifier. Cite it in review comments and in the Part 9 conformance evidence.

---

## 1. Theme Tokens

- **STY-001** Every colour comes from a `--zen-*` custom property. No hex literal, `rgb()`, or `hsl()` appears in component CSS.
- **STY-002** The tokens are defined once, in the global stylesheet, on `:root`. A component never redefines a token.
- **STY-003** No default Bootstrap colour utility (`bg-primary`, `text-success`, `btn-primary`, `border-danger`, …) is used on a themed surface. Bootstrap supplies layout and spacing; Zen Green supplies colour.
- **STY-004** Semantic tokens are used semantically: `--zen-error` only for errors, `--zen-warning` only for warnings, `--zen-success` only for success. Never chosen because the colour looks right.
- **STY-030** Priority badges use the `--zen-priority-*` tokens and nothing else. A priority is a domain value, not a severity signal about the application (§11.17).

## 2. Surfaces and Structure

- **STY-005** Page background is `--zen-page-bg`; cards and panels are `--zen-surface` with `--zen-border` and `--zen-shadow`.
- **STY-006** The application header uses `--zen-primary`.
- **STY-007** Active navigation or tab indication uses `--zen-secondary`.
- **STY-008** Elevation is limited to `--zen-shadow`. No custom or heavier shadow is introduced.

## 3. Fields

- **STY-009** Editable fields use `--zen-field-bg`; read-only and system-generated fields use `--zen-readonly-bg` with `--zen-readonly-text`.
- **STY-010** Ticket Number, created timestamp, and status are read-only surfaces on every screen that displays them. They are never rendered as editable inputs.
- **STY-011** Required fields carry the required marker defined in `ui-spec.md` §3, applied consistently across all forms.
- **STY-012** Validation messages appear below their field in `--zen-error`. Input text does not turn red. Borders use `--zen-error` only where `ui-spec.md` §3 specifies.
- **STY-013** Disabled controls use `--zen-disabled-bg` and `--zen-disabled-text`, and are visibly distinct from read-only fields.

## 4. Buttons

- **STY-014** Button hierarchy follows `ui-spec.md` §4. One primary action per screen region; secondary and tertiary actions never take the primary treatment.
- **STY-015** A destructive action uses the destructive treatment and never the primary treatment.
- **STY-016** Buttons carry hover, focus, active, and disabled states. A button with only a resting state is incomplete.
- **STY-017** No component defines its own button padding, radius, or colour. Buttons come from the shared component.

## 5. Badges

- **STY-018** Priority and status badges follow the mapping in `ui-spec.md` §10. The mapping is defined in one place and imported, never re-declared per screen.
- **STY-019** Every badge states its value as text. Colour is never the sole carrier of meaning.

## 6. States

- **STY-020** Every list implements four states: loading, empty (no records exist), no-results (filters match nothing), and error. Empty and no-results are distinct and worded differently.
- **STY-021** Empty and error states explain what happened and what to do next. "No data" alone does not satisfy this rule.
- **STY-022** A submit action disables its button and shows progress while in flight. Double submission is impossible from the UI.

## 7. Responsive

- **STY-023** The three viewports in `ui-spec.md` §11 render without horizontal page scroll.
- **STY-024** No label is clipped, no message overlaps, and no control is unreachable at any of the three widths.
- **STY-025** Where a table becomes unusable at mobile width, it adopts the alternate presentation specified in `ui-spec.md` §11 rather than shrinking to illegibility.

## 8. Accessibility

- **STY-026** Every input has a programmatically associated `<label>`. Placeholder text is not a label.
- **STY-027** Keyboard focus is visibly indicated using `--zen-focus-ring`. The default outline is never removed without a replacement.
- **STY-028** Every interactive control is reachable by keyboard in a sensible tab order.
- **STY-029** Text meets WCAG 2.1 AA contrast against its own background — including muted text, badge text, and disabled text.

## 9. Audit Procedure

Before requesting review on any UI Issue:

1. Run `grep -rnE '#[0-9a-fA-F]{3,8}|rgba?\(' client/src --include=*.css --include=*.tsx` and confirm every hit is inside the token definition block. This mechanically enforces STY-001 and STY-002.
2. Load each changed screen at the three viewports and walk `ui-spec.md` §13.
3. Tab through each changed form from the first control to the last.
4. Trigger every state the screen can reach: loading, empty, no-results, error, validation failure, in-flight submit.
5. Record any rule knowingly not met, with its identifier and the reason, in the PR description. An unmet rule that is disclosed is a decision; an unmet rule that is silent is a defect.

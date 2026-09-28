# Quaniny website

Before changing the interface, read `BRAND.md` and follow the shared visual identity in `design.css`. Keep all pages consistent with the approved home, prescription, and monthly care pages. Reuse existing fonts, tokens, outline icons, header/footer, button hierarchy, and responsive patterns.

Preserve form IDs, API payloads, cart behavior, insurance query parameters, real product data, branch addresses, business hours, and clinical disclaimers when restyling. Verify desktop/mobile layouts and affected interactions without submitting real orders.

Production: `https://quaniny.com`, GitHub `quaninypharmacy-gif/quaniny-pharmacy`, main branch. Vercel project: `quaninypharmacy`, team `quaninypharmacy-8786`. Never publish or set environment variables in `quaniny-pharmacy` or `quaniny-pharmacy-test`.

## Shared references

Read `WORKING-AGREEMENT.md` for file ownership, the five pre-publish checks, and the hard limits none of us cross. `AUDIT.md` holds the measured state of the site and the open items, including the one fix assigned to Codex (the intermittent hero CLS spike, section 2).

Claude's project memory lives in `.claude/skills/`: `quaniny-website` (architecture and the invariants that must survive any refactor), `impeccable` (visual quality bar and how to prove a change is visually neutral), `quaniny-content` (Arabic copy rules and health-claim limits), `quaniny-gbp`, `verify`, `quaniny-nextjs-migration`. They are the reason a full redesign did not break a single SEO invariant — keep them current.

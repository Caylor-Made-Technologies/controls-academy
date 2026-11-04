# Security and Legal Checklist — Controls Academy

From the Caylor Made Technologies standard checklist. Not legal advice; policy text is a template until reviewed by a Texas attorney.

## Security
- Static site, no backend, no secrets. CSP meta: `default-src 'self'; script-src 'self'; style-src 'self'` … (index.html).
- Fonts and libraries self-hosted; no third-party requests.
- Imported files and share links are untrusted: `validateProgress` and `validateProgram` rebuild clean objects with length and type limits; text is rendered by React (escaped).
- `npm audit --omit=dev`: 0.

## The 20 points
| # | Check | How it's handled |
|---|---|---|
| 1 | Privacy policy | About page: nothing collected, local storage only, how to erase |
| 2 | Terms | Training-only terms on About; template until reviewed |
| 3 | Refund policy | N/A — free, nothing sold |
| 4 | Cookie policy | No cookies; stated on About |
| 5 | Cookie banner | Not needed — no trackers |
| 6 | Form consents | No forms that send data |
| 7 | No unnecessary data | Optional first name only, stays on device |
| 8 | Third-party SDKs | None at runtime; open-source libraries credited |
| 9 | Dark patterns | None; "Erase everything" has a plain confirm |
| 10 | Hidden fees | N/A |
| 11 | Fake reviews | None |
| 12 | Unsupported claims | Certificates say "practice record, not a qualification"; illustrative values labeled; VERIFY chips |
| 13 | Alt text | Logo/icon alt text; diagrams have role="img" + aria-label; decorative SVG aria-hidden |
| 14 | Contrast | axe color-contrast 0 in dark and light (Playwright gate) |
| 15 | Keyboard | Skip link, visible focus, ladder editor arrow/Delete/Enter/Ctrl+Z, focus-trapped sheets |
| 16 | Business details | Footer + About: name, Hereford TX, email, website |
| 17 | Kids' data | "Not directed at children under 13" on About |
| 18 | Unsubscribe | N/A — no email |
| 19 | Licensed fonts/images | Inter + Montserrat OFL files shipped; all artwork original |
| 20 | Data deletion | Profile → Erase everything; no server copy exists |

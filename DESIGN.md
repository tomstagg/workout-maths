# Design Guidelines

## Users
Children aged 6–10 in a school classroom on shared devices, supervised by a teacher. Teachers are secondary users who manage enrolment via an admin portal. Sessions are short and focused — a 10-question quiz in a few minutes. The interface must be immediately legible to early readers with limited keyboard/mouse precision.

## Brand Personality
**Friendly, Encouraging, Clear, Rewarding** — warm and calm. Every child has a funny wild animal character they identify with. Progression feels like levelling up a game character, not completing homework. Celebration moments are joyful but not chaotic.

## Aesthetic Direction
- **Reference:** Duolingo — gamified streaks, big satisfying feedback, a mascot with personality, calm progression between excitement peaks.
- **Anti-reference:** Frantic overstimulation; generic "educational software" beige/blue corporate look; dark mode.
- **Theme:** Light only. Soft pastel gradient background (sky → mint → violet). **Disciplined colour palette**: violet/indigo as the single primary, amber for points/rewards only, everything else neutral grey/slate.
- **Typography:** Fredoka (display/headings) + Nunito (body). Consistent hierarchy — not mixed wildly per component.
- **Emojis:** Removed from decorative roles. Kept only where functionally meaningful (🔥 streak, ★ points).
- **Cards:** White surface with subtle shadow/border on the gradient background.
- **Avatars:** Circular profile images — giraffe, lion, or monkey. Chosen during sign-up step 2. Placeholder circles (coloured initial) until real artwork is provided.

## Colour System
| Role | Value |
|------|-------|
| Primary action | `violet-600` / `violet-700` (hover) |
| Points & rewards | `amber-500` only |
| Correct answer | `emerald-400/500` |
| Wrong answer | `red-400` (not dominant) |
| Card surface | white |
| Body text | `slate-800` |
| Secondary text | `slate-500` |
| Everything else | `slate-*` neutral greys |

## Avatar Progression (points-based)
| Points | Unlock |
|--------|--------|
| 0      | Plain animal |
| 50     | Hat |
| 150    | Sunglasses |
| 300    | Vibrant coloured border |
| 500    | Sparkle ring |
| 1000   | Crown |

## Design Principles
1. **Calm is the baseline.** Clean resting state. Reserve animation and colour intensity for feedback moments (correct answer, streak, perfect score).
2. **Encourage, never shame.** Wrong answers get gentle feedback; correct answers and streaks get celebration. No red-dominant error states.
3. **Legible at a glance.** Large touch targets, high-contrast text, clear visual hierarchy. A 6-year-old should never be confused about what to tap next.
4. **Earn the delight.** Confetti, fanfare, and sparkles should feel earned — triggered by genuine achievement, not routine interactions.
5. **Consistent rainbow identity.** The 7-colour rainbow gradient (`--rainbow`) is the brand signature. Use it for the nav border and "Workout Maths" title only. Do not dilute it by applying it to buttons, cards, or other elements.
6. **One colour system.** Violet = primary actions. Amber = points/rewards. Emerald = correct. Red = wrong. Grey = everything else. Never use a gradient where a solid colour works.

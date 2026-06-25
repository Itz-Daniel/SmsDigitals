# Design System: Blissdigitals Tactical Telemetry

## 1. Visual Theme & Atmosphere
A raw, mechanically engineered interface fusing military terminal aesthetics with high-security data operations. The atmosphere is uncompromisingly functional, dense with data (Density 8), featuring rigid grid alignments (Variance 3), and utilitarian motion (Motion 4). It projects absolute vigilance, precision, and zero-latency performance.

## 2. Color Palette & Roles
- **Deactivated CRT** (`#0A0A0A`) — Primary background surface. Pure black (`#000000`) is BANNED.
- **White Phosphor** (`#EAEAEA`) — Primary text, primary structural lines.
- **Muted Carbon** (`#333333`) — Secondary text, disabled states, grid subdivision lines.
- **Aviation Red** (`#E61919`) — The ONLY accent color. Used strictly for critical alerts, active terminal cursors, and primary operational CTAs.
- **Terminal Green** (`#4AF626`) — Used EXCLUSIVELY for active "Received" status lights. Banned as text color.

## 3. Typography Rules
- **Macro (Headers):** `Geist` or `Archivo Black` — Aggressively tight tracking (`-0.04em`), uppercase only. Used at massive fluid scales for structural impact.
- **Micro (Telemetry/Forms):** `JetBrains Mono` or `Space Mono` — Generous tracking (`0.05em`), uppercase for all labels and inputs. This carries the entire UI.
- **Banned:** `Inter`, any Serif fonts, standard lowercase sentences in UI elements.

## 4. Component Stylings
* **Forms/Inputs:** Rigid boxes with 1px `White Phosphor` borders. Label is ALWAYS inside or strictly aligned above in monospace. Focus states invert the colors (White background, Black text) or apply a thick 2px `Aviation Red` border. No rounded corners (`border-radius: 0`).
* **Buttons:** Massive, blocky. Primary CTAs are solid `White Phosphor` with `Deactivated CRT` text, or solid `Aviation Red`. Hover states utilize harsh translation (e.g., instant 4px shift down/right to simulate mechanical depressing) with no smooth fading.
* **Containers:** Grid-locked rectangles. BANNED: drop shadows, rounded corners, soft gradients. Use 1px borders to compartmentalize.

## 5. Layout Principles
Grid determinism is mandatory. Elements are anchored to CSS grid intersections. The layout oscillates between massive negative space framing macro-typography, and extreme density for telemetry data. Horizontal rules `<hr>` span full widths to segregate zones.

## 6. Motion & Interaction
Motion is binary and mechanical. No smooth spring physics. Hover states click instantly or slide with aggressive, linear speed. Blinking terminal cursors (`animate-pulse` on a 1px vertical bar) should accompany active input fields.

## 7. Anti-Patterns (Banned)
- NO border-radius (everything must be 0px).
- NO drop shadows or soft glows.
- NO lowercase in form labels or buttons.
- NO `Inter` font.
- NO purple or neon AI aesthetics.
- NO overlapping elements without strict border containment.
- NO emojis.
- NO generic placeholders ("john@doe.com"). Use "OPERATOR-01@SYS.LOCAL".

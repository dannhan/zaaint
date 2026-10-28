# zaaint — Research Findings

*Research phase output · October 24, 2026 · Feeds the design & build plan.*

---

## 1. Mission

Design and build the portfolio website for **zaaint**, a photographer. Inputs: 4 local prototypes, 5 reference websites, and the photographer's Instagram (**@zaaaint**) as the photo source. Target: an award-calibre (Awwwards-genre) portfolio site. Stack already chosen: **Vite + vanilla JS + GSAP + Lenis + Tailwind v4**.

---

## 2. Prototype teardown (4 variants)

### 2.1 `akuadalahhusain.html` — layout study (~6 KB, static)
A Tailwind-CDN replica of the **Joffrey Spitzer 2025 layout**, rebranded "zaaint". Pure markup exercise — no JS.
- 4-col mobile / **16-col desktop grid**, `0.75rem` gap, `1.25rem` page padding.
- **Fluid rem trick**: `html { font-size: calc(100vw / 375 * 16) }` per breakpoint (375/800/1440 design widths) so the whole site scales proportionally. Clamped at desktop.
- Header: `zaaint` logo left, About link right, plus a fixed micro-label top-right.
- Work section: image stream in the middle columns with a sticky "Cases" title left and a sticky index of project names right (opacity 0.2 -> 1 on hover/active).
- Footer: "Get in touch" + mail + socials, hairline top border.
- Colors: paper `rgb(247,247,247)` / ink `rgb(26,26,26)`.

**Takeaway**: establishes the grid system, spacing scale, and sticky-index navigation pattern.

### 2.2 `sonnet-generated/` — full system (HTML + CSS + JS, ~18 KB)
First complete photography-site system. Uses `Inter Tight` with `PP Neue Montreal` fallback, Lenis 1.1.18, picsum placeholders.
- **Preloader**: ink screen, `zaaint` + counter 0-100, lifts with translateY(-100%).
- **Hero**: `zaaint, photographer` at 3-4.5rem, line-mask reveal (translateY(105%) inside overflow:hidden).
- **Work**: 6 series, staggered editorial grid on desktop (9-col / offset 6-col alternating with varied aspect ratios 3:2, 4:5, 1:1), each item has a **hover cross-fade to a second image**.
- **Grid/list toggle**: grid = staggered cards; list = full-width rows (title left, "year - N photographs" right) with hairline separators.
- **Lightbox**: dark overlay, prev/next, keyboard (Esc/arrows), touch swipe, counter `01 / 06`, Lenis stop/start.
- **Custom cursor**: "view" label, mix-blend-mode difference, appears over media.
- **Presentation section**: full-viewport **WebGL ripple** over a photograph — mouse-driven wave displacement shader (~40 lines GLSL) with CSS fallback, plus mix-blend-difference text overlay ("Light, Place, Time").
- Reduced-motion handling throughout; :focus-visible styles; eases as CSS vars (expo-out .19,1,.22,1; power4-in-out .86,0,.07,1).

**Takeaway**: the most feature-complete "museum" concept — defines the interaction vocabulary.

### 2.3 `V1 zaaint-Prototype.html` — flagship (~27 KB, single file)
The most advanced variant: a **two-view app** (home + series pages) with hash routing. Inter Tight + Neue Montreal, Lenis 1.1.14.
- **Content model**: SERIES array — id, title, year, location, camera format, cover (with alternate hover image), photos with per-photo caption + aspect ratio. Sample series: nordic summer (Lofoten, Hasselblad X2D), salt & stone (Cadiz, Leica M11), vespers (Kyoto, Rollei 35S / Portra 400).
- **Home**: hero (giant `zaaint, photographer` + "based in copenhagen — available for editorial and selected commissions"), work section with staggered grid + list view ("Index") toggle (aria-pressed, staggered switch animation), **hover preview thumbnail following the cursor in list view**.
- **Series page**: title + meta (year / location / format), photos in 3 alternating layout classes (full-width, offset 8-col, center 8-col), captions, "next series" footer link.
- **Router**: #/series/{id} hashchange, view swap, document.title update, reveal re-observation.
- **Lightbox**: role=dialog, aria-modal, focus save/restore, Enter/Space keyboard open, swipe nav.
- **Stage (about)**: WebGL displacement with aspect-ratio cover math, DPR cap 2, visibility-gated rAF (IntersectionObserver + document.hidden), graceful canvas removal on WebGL failure.
- Engineering details worth keeping: srcset/sizes on every image, reduced-motion kill-switch per system, DPR caps, lazy loading + async decode.

**Takeaway**: the architecture blueprint — data-driven series, routing, and a11y all solved here.

### 2.4 `claude-generated/zaaint, photographer.html` — refinement (~15 KB)
Most polished code organization. Adds:
- env(safe-area-inset-*) handling (notch-aware header, scroll-padding, lightbox bar).
- **Procedural placeholder generator** (canvas gradients + layered hills per seed) instead of network images — swap P(i,j) for real URLs.
- mix-blend-mode difference on the **fixed header** so it inverts over any content (notably over the dark WebGL stage).
- Subgrid-based list view; --i custom-property stagger for line masks; isolation on the stage; visibility-gated render loop.
- Series data slimmed to per-photo aspect ratios; copy marked with `<!-- replace: ... -->` comments for real content.

### 2.5 Shared design DNA (consistent across all 4)
| Token | Value |
|---|---|
| Paper / ink | #F7F7F7 / #1A1A1A |
| Type | PP Neue Montreal -> Inter Tight fallback; weights 400/500 only; hero 3-4.5rem; labels .8-.925rem |
| Grid | 4-col mobile / 16-col desktop, .75rem gap, 1.25rem padding, fluid-rem scaling |
| Eases | expo-out, power4-in-out, power3-out/in-out, bounce (CSS custom props) |
| Signature moves | line-mask text reveal, clip-path image reveal + scale-settle (1.15->1), hover dim siblings (opacity .5), image cross-fade on hover, sticky index nav, mix-blend-difference overlays |
| Interaction set | preloader counter, grid/list toggle, lightbox (kbd + swipe), custom cursor, WebGL ripple stage, smooth scroll |
| A11y | prefers-reduced-motion kill-switches, focus-visible, aria on toggle/dialog, keyboard nav |

---

## 3. Reference sites

| Site | Tech signals | What zaaint takes from it |
|---|---|---|
| **joffreyspitzer.com** | WordPress head (WP folio-data uploads); 2025 rebuild serves images via **Prismic** CDN | The literal layout source of prototype #1: giant personal-name hero, uppercase bio block, project index with role tags, 16-col system |
| **vvisual.biz** | **Sanity CMS** (cdn.sanity.io), image-stream UI, numbered items 0-59 | The numbered-index image stream -> grid/list toggle pattern; portfolio-as-continuous-stream feel |
| **photoyoshi.com** | Static assets (/assets/img/*.webp), minimal single page | Photographer-as-identity minimalism: name = brand; work + about + close; one image carries the page |
| **getty.edu/tracingart** | Museum microsite; scroll-driven storytelling; rotate-device prompt (portrait-first) | Scroll-choreographed narrative, image zoom sequences, data-as-story. Cautionary: portrait-lock annoyed desktop users — zaaint stays responsive |
| **kononenkogroup.com** | Prismic CDN images; long editorial one-pager | Editorial precision: stats (15+ / 490+ / 45+), awards/publications lists, full-bleed imagery, "Systematic Clarity & Creativity" tone |

**Synthesis**: the genre = minimal Swiss-type editorial portfolio + image-stream index + one signature scroll/WebGL moment. CMS-backed references (Sanity/Prismic) suggest: keep content in a typed data module now; graduate to a headless CMS only if zaaint wants self-serve updates.

---

## 4. Instagram — @zaaaint

### Identity facts (public profile)
- Handle **@zaaaint**, 893 followers / 601 following — small, low-profile artist; no other public presence found (no Behance/personal site indexed).
- Bio links **@2x4mm** (likely personal or partner account).
- Story highlights: `02bt01`, `sO`, and `--•• •- •• -•` — **Morse for "ZAIN"** -> the photographer's name behind "zaaint".
- Post timeline: active **2022 -> 2026** (posts Sep 2022, then regular 2025-2026 activity), incl. one **tagged photo by @raflydoo** (Jun 2026) and two posts flagged "may be an image of text" (typography/poster work).

### Photo analysis (2 of 12 visible posts captured before CDN links expired)
1. **Flash streetwear portrait (4:5, Jul 2026)** — two subjects in vintage Inter/AC Milan (OPEL) jerseys on a rug at twilight; on-camera flash vs. dusk sky; "urban, nostalgic, confidently cool"; cinematic grade; Y2K football-nostalgia editorial. (saved: research/instagram/ig-2.jpg)
2. **Palm silhouettes at dusk (1:1, Sep 2022)** — contre-jour palms + rooftops, heavy warm sepia grade, pushed grain, early-Instagram/VSCO mood; "atmospheric, dramatic, quietly melancholic". (saved: research/instagram/ig-6.jpg)

Profile picture (ig-10.jpg) is a near-blank off-white frame — itself consistent with the minimal aesthetic.

**Style read**: a photographer of **people and places at golden/dusk hour** — flash-lit street/editorial portraiture + moody atmosphere work; warm cinematic grade over crushed shadows; nostalgia-leaning (film-era cues, Y2K streetwear). Human warmth + quiet drama, not cold minimalism.

**Note**: the prototypes' fictional identity (Copenhagen/Scandinavia, Hasselblad landscape series) **does not match** the real photographer (flash street portraits, likely Indonesia-region based on milieu + handle circle). Real content must drive the design: people-first imagery, editorial/series structure around shoots, warmer accent possibilities than the current ink/paper monochrome.

### Sourcing strategy for the site
- CDN links expire within days — **download final selects to the repo** (/public/photos/...), never hotlink.
- 12 thumbnails visible without login; full-resolution requires the owner -> **the user must export originals** (original quality) for the build.
- Structure the content model like V1's SERIES: title, year, location, camera, cover + photos with captions & aspect ratios — fill from real shoots (e.g. the jersey editorial as series #1).
- Rights: it's the user's own/their client's account (project brief), so reuse is fine; credit tagged subjects/collaborators (e.g. @raflydoo) where appropriate.

---

## 5. Design direction (synthesis)

- **Concept**: "quiet stage, loud photographs" — a monochrome Swiss frame (paper/ink, hairlines, small labels) that gets out of the way of warm, cinematic photography. mix-blend-difference keeps chrome legible over any image.
- **Layout**: 16-col editorial grid, staggered series index with varied aspect ratios driven by the actual photos (4:5 portraits will dominate — the grid must celebrate verticals, unlike the landscape-biased prototypes), numbered list "Index" view as the alternate reading mode.
- **Motion**: Lenis smooth scroll; GSAP timelines for preloader -> hero line-mask cascade; ScrollTrigger for image reveals (clip + scale-settle) and the sticky index; one signature moment — the WebGL displacement stage (cursor-reactive) as the About section, over a real dusk photograph.
- **Identity**: wordmark `zaaint` lowercase; possible Morse-code motif (`--•• •- •• -•`) as a micro-detail (footer, preloader, favicon) — a genuinely personal signature discovered in research.
- **Type**: PP Neue Montreal (or free proxy: Inter Tight already in use; consider licensing) at 400/500 only.

## 6. Technical direction (decided)

- Vite 7 + vanilla JS + GSAP 3.15 (ScrollTrigger) + Lenis 1.3 + Tailwind v4 (Vite plugin). package.json scaffolded and installed; no source files yet.
- Port the best-engineered pieces from prototypes: fluid-rem scale, reveal system, lightbox (a11y-complete), stage shader (visibility-gated), srcset discipline, reduced-motion coverage.
- Content as typed JS data module (src/data/series.js), images as local optimized assets (webp + srcset).

## 7. Open questions

1. **Photos**: user exports real selects from @zaaaint (min. ~3 series x 6-10 photos, original resolution) — biggest blocker for build.
2. **Series metadata**: real titles, years, locations, cameras (or tasteful placeholders pending real data?).
3. **Contact/bio copy**: real email, city, bio text; socials beyond Instagram (Behance? print shop?).
4. **Name usage**: site says "zaaint" — include "Zain" or keep the alias only?
5. **Domain/hosting** target (Vercel/Netlify assumed fine for static Vite build).

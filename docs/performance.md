# Measuring the refactor

The repeatable lab runner is `scripts/measure-site.mjs`. It measures the **production build**, not the Astro dev server. It adds no JavaScript or tracking to the website.

```powershell
npm run build
npm run perf -- --runs 5 --out .tmp/performance/candidate.json --baseline docs/performance-baseline-mobile.json
```

The JSON contains every sample, route medians, invalid-sample counts, and absolute deltas from the baseline. Negative deltas mean lower latency, less layout shift, or fewer bytes. Compare several runs on the same computer and browser without other builds or benchmarks running. A single small change is not evidence of a regression.

The default profile is a 390 × 844 viewport, 4× CPU slowdown, requested 100 ms network latency, 1.6 Mbps download and 750 Kbps upload. The runner clears/disables the browser cache between navigations and observes each page until two seconds after its load event. DNS, TLS and operating-system caches remain warm. External fonts are fetched normally; failures are recorded and invalidate the sample. The local static server gzips text assets.

```powershell
# Unthrottled desktop comparison: keep a separate baseline for this profile.
npm run perf -- --profile desktop --runs 5 --out .tmp/performance/desktop.json

# Compare the visual studies under the same conditions.
npm run perf -- --routes /mockups/editorial,/mockups/field-notes,/mockups/studio --runs 5 --out .tmp/performance/mockups.json

# Measure the deployed site, including hosting/CDN response times.
npm run perf -- --origin https://baegll.github.io --runs 5 --out .tmp/performance/hosted.json

# Measure another isolated production build.
npm run perf -- --dir .tmp/perf-before/dist --runs 3 --out .tmp/performance/before.json
```

On another machine set `BROWSER_PATH` to a Chromium-based browser executable. The default is the installed Windows Microsoft Edge. The runner launches a temporary headless browser profile, closes the browser at the end, and saves reports to disk. It never submits forms or changes project data.

## What the numbers mean

| Metric | What it helps diagnose | Interpretation |
| --- | --- | --- |
| FCP | Time until the first visible content | Render-blocking CSS, fonts, initialization |
| LCP | Time until the largest visible content appears | Hero layout, image/font loading, rendering |
| CLS | Unexpected movement during the observation window | Missing image dimensions, font swaps, inserted content |
| `blockingMs` | Long-task time above 50 ms after FCP | Main-thread work in this fixed window; **not Lighthouse TBT** |
| `themeFeedbackMs` | Real scripted click timestamp to the second animation frame | Repeatable theme-feedback probe; **not INP** |
| `transferBytes` / `requestCount` | Network payload and number of requests | Font/image weight, eager dependencies |
| TTFB | Navigation start to the first response byte | Hosting responsiveness; localhost values do not represent the CDN |
| `loadMs` / `domReadyMs` | Full load / DOM readiness for each sample | Useful when a layout change makes a different element become LCP |

Core Web Vitals targets are **LCP ≤ 2.5 seconds, INP ≤ 200 ms, CLS ≤ 0.1**, evaluated at the **75th percentile of real visits**, separately for mobile and desktop. These small lab samples and their medians do not establish field compliance. [Google's Web Vitals guidance](https://web.dev/articles/vitals) explains the distinction. [TBT guidance](https://web.dev/articles/tbt) also explains why blocking-time probes cannot replace real-user INP.

## Decisions to make with the measurements

- Watch LCP **and full-load time/page weight** together. Making a portrait smaller can improve LCP while still downloading the same image.
- Keep the mockup's visual complexity in HTML/CSS where possible. Require a visible benefit before adding animation or another client dependency.
- Investigate repeated LCP or blocking-time increases of about 20% or more. This is a project review trigger, not a web standard or an automatic failure threshold.
- Check images first if page weight stays high. The current headshot is approximately 477 KiB and is served unchanged even when displayed as a thumbnail.
- For interactions, measure theme changes now and add comparable probes for search-to-results and Locknight draft-to-render when modifying those features.

## Real-user measurement

For production INP and field LCP/CLS, use the official [`web-vitals` library](https://github.com/GoogleChrome/web-vitals) (`onINP`, `onLCP`, `onCLS`). First check PageSpeed Insights/CrUX for sufficient existing public field data. A low-traffic personal site may have no report.

If field collection becomes necessary, decide where the aggregate reports will go, then send only the metric, value, page path without query/hash, device category, and release identifier. Update the privacy policy to reflect that collection. No analytics endpoint or visitor telemetry has been added as part of this change.

## Initial evidence

`performance-before-mobile.json` measures the committed site at `a9644443a7639ac539bb9dbb7bed444fd6a9fd92`, exported to an isolated directory. `performance-baseline-mobile.json` measures the working-tree refactor. Both use three runs per route, the same machine/browser, and the same mobile settings. The original working tree was not checked out or overwritten.

The saved baseline describes the current design, before applying a mockup. It establishes something we can compare future work against; it does not by itself prove the next design is faster.

Measured on October 30, 2026 with Edge 156 on Windows; medians of three loads per route:

| Page | LCP before → after | Full load before → after | CLS before → after | Transfer before → after |
| --- | --- | --- | --- | --- |
| Home | 3,036 → 336 ms | 3,022 → 3,024 ms | 0.003 → 0.008 | 561 → 558 KiB |
| Writing index | 436 → 332 ms | 2,030 → 712 ms | 0.228 → 0.000 | 355 → 80 KiB |
| Context Management article | 444 → 432 ms | 1,943 → 1,869 ms | 0.035 → 0.002 | 343 → 326 KiB |
| Locknight | 428 → 348 ms | 924 → 747 ms | 0.000 → 0.000 | 104 → 102 KiB |

The strongest evidence is on the writing index: lower transfer size, lower full-load time, and less layout shift. The homepage's LCP reduction is strongly affected by the smaller portrait and changed first-screen composition: **full-load time and total bytes barely changed**. Do not describe that as a ninefold improvement in the entire page's loading speed. Article paint time is essentially unchanged in this small sample; its post-FCP blocking probe rose from 0 to 15 ms. Those mixed results are why the runner retains individual samples and multiple metrics.

The current theme-feedback probe measured medians of 19–31 ms across these routes. The old site used different theme controls, so no comparable before measurement was captured. These values are not INP.

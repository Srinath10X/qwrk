---
description: Qwrk against Solid, Svelte 5 and React 19 in js-framework-benchmark, keyed, all measured in the same session.
---

# Benchmarks

Qwrk is measured with [js-framework-benchmark](https://github.com/krausest/js-framework-benchmark), the keyed implementations, next to Solid, Svelte 5 and React 19. Lower is better everywhere.

<BenchmarkGrid class="bench-page" />

## Overall

The overall score is the geometric mean of every keyed benchmark, relative to vanilla JS: `1.000×` would match hand-written DOM code.

| Framework | Overall |
| --- | --- |
| **Qwrk** | **1.060×** |
| Solid | 1.122× |
| Svelte 5 | 1.201× |
| React 19 | 1.775× |

## Headline metrics

| Metric | Qwrk | Solid | Svelte 5 | React 19 |
| --- | --- | --- | --- | --- |
| Memory with 1,000 rows | **2.25 MB** | 2.68 MB | 2.87 MB | 4.42 MB |
| First paint | **107 ms** | 115 ms | 125 ms | 443 ms |
| Select row | **1.07×** | 1.21× | 1.87× | 2.41× |

The benchmark app builds to 4.7 KB compressed.

## Method

- **Suite:** js-framework-benchmark, keyed implementations.
- **Browser:** Chromium 154.
- **Machine:** a 4-core Codespace.
- **Session:** every framework ran in the same session.
- **Runs:** each number is the median of 5 runs.
- **Qwrk version:** commit [`324918e`](https://github.com/Srinath10X/qwrk/commit/324918e).

Absolute numbers depend on the machine, so compare frameworks measured in one session, as here, rather than with results measured elsewhere.

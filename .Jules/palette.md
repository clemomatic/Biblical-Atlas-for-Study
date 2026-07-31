# Palette's Journal - Critical UX/A11y learnings

## 2025-03-04 - [Clear Recent Searches Option]
**Learning:** Modern search dialogs that retain search history locally for better user persistence must provide users with explicit control and ownership over their stored data. Leaving no visible or functional option to clear search logs compromises privacy expectations and creates UI clutter.
**Action:** When saving user input queries to local history or localStorage, always pair the history display with a clear, accessible action button labeled appropriately (e.g. "Effacer", "Clear") and provided with proper aria-label properties.

## 2025-07-31 - [Granular Single-Item Deletion in Local Search History]
**Learning:** While a "Clear All" action provides macroscopic control over stored history, users frequently expect microscopic control to prune individual mistaken or private queries without losing their entire search context. Combining parent-child button hierarchies within flexbox layouts requires careful attention to keyboard focus containment (`focus-visible`) and clear, localized screen-reader accessibility labels to prevent keyboard trapping or ambiguous context.
**Action:** When implementing recent search history suggestions, wrap each entry in a composited item tag containing both a primary search execution button and a secondary individual deletion button. Ensure both have distinct focus state outlines and explicit `aria-label` screen reader tags.

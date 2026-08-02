# Palette's Journal - Critical UX/A11y learnings

## 2025-03-04 - [Clear Recent Searches Option]
**Learning:** Modern search dialogs that retain search history locally for better user persistence must provide users with explicit control and ownership over their stored data. Leaving no visible or functional option to clear search logs compromises privacy expectations and creates UI clutter.
**Action:** When saving user input queries to local history or localStorage, always pair the history display with a clear, accessible action button labeled appropriately (e.g. "Effacer", "Clear") and provided with proper aria-label properties.

## 2025-03-05 - [ARIA Combobox and Chip Focus Retention]
**Learning:** When building search panels with keyboard navigation (ArrowUp/ArrowDown to highlight results), screen-readers will not announce highlighted results without semantic combobox markup (`role="combobox"`, `aria-autocomplete`, `aria-activedescendant` linking to active item `id`). Additionally, selecting recent search chips must always restore focus back to the primary search input to prevent focus loss when the chip container is unmounted or updated.
**Action:** Always implement ARIA Combobox specifications on search bars with dropdown results, and ensure button chips that alter search state restore focus to the input element on click.

## 2026-08-02 - [Individual Search Deletion & Group Role]
**Learning:** Allowing users to delete individual history entries from a search bar is a crucial privacy and usability micro-interaction. Nested buttons inside interactive chips are invalid HTML; they must be structured as flat siblings within a component having `role="group"` and explicit, descriptive `aria-label` properties. When deleting an entry, the active focus must immediately fall back to the main search input to avoid keyboard focus being lost.
**Action:** Structure interactive dual-action chips as grouped sibling buttons, and ensure removing a chip redirects focus back to the primary input.

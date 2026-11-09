# Proposal: add declarative scroll commands to [HTMLButtonElement](https://html.spec.whatwg.org/multipage/form-elements.html#attr-button-command)

> This repository is a fork of [Daniil Sakhapov's original explainer](https://github.com/danielsakhapov/declarative-scroll-commands-for-html-explainer).

### Summary

This proposal introduces a set of new `command` values for the `HTMLButtonElement` to declaratively control the scroll position of a target element. This allows authors to create custom scrolling UI (e.g., for carousels or galleries) without requiring JavaScript, improving accessibility and simplifying implementation.

### Problem & use cases

Authors frequently build custom components that contain a scrollable region, such as:

* A horizontal carousel of products or images.
* A vertically scrolling list of items within a modal.
* A 2D scrolling area for a map or canvas.

These components almost always require custom "Next," "Previous," "Up," or "Down" buttons. Currently, authors must write JavaScript to wire these buttons up. This proposal moves this common, repetitive behavior into the platform, making it declarative, robust, and accessible by default.

### Proposed solution

The proposal is to add eight new enumerated values to the `command` attribute on `HTMLButtonElement`. These commands would be paired with the `commandfor` attribute, which targets the `id` of the scroll container.

#### Proposed command values

* **Physical directions:**
    * `page-up`
    * `page-down`
    * `page-left`
    * `page-right`
* **Logical directions:**
    * `page-block-start`
    * `page-block-end`
    * `page-inline-start`
    * `page-inline-end`

#### Example usage

Here is how an author could implement a common horizontal carousel:

```html
<style>
  #my-carousel {
    display: flex;
    overflow-x: auto;
    width: 300px;
    scroll-snap-type: x mandatory;
  }
  #my-carousel > div {
    min-width: 300px;
    scroll-snap-align: center;
  }
</style>

<div id="my-carousel">
  <div>Item 1</div>
  <div>Item 2</div>
  <div>Item 3</div>
</div>

<button command="page-inline-start" commandfor="my-carousel">previous</button>
<button command="page-inline-end" commandfor="my-carousel">next</button>
```

### Proposed behavior

* **Action:** When a button with a `page-*` command is invoked, it scrolls the element referenced by its `commandfor` attribute.
* **Scroll amount:** The command scrolls the container by **one "page"** in the specified direction. This behavior should mimic the platform's default action for a PageUp/PageDown keypress on that container (i.e., scroll by the visible viewport dimension, minus a small overlap).
* **Scroll snapping:** The scrolling action **must** respect the target element's `scroll-snap` properties. The expected behavior is that the command scrolls by approximately one page and then settles on the nearest valid snap point in the direction of the scroll. It should *not* be defined as "scroll to the next/previous snap point," as this would be problematic for scrollers with many small snap items.
* **Targeting:** In this initial proposal, the `commandfor` attribute is **required** and must reference the `id` of the element to be scrolled.

### Design rationale (summary from [Open UI CG discussion](https://github.com/openui/open-ui/issues/1220))

* **Why new command names instead of a functional syntax?**
    An initial idea, `command="scroll(down)"`, was rejected. The group felt this "looks like code" and preferred simple, declarative keywords.
* **Why not `command="scroll"` with a `value` attribute (e.g., `value="down"`)?**
    This was deemed semantically incorrect. The `value` attribute (as used in `dialog.close(value)`) is intended to pass "raw data," not to define the *type* of action being performed.
* **Why "page" scrolling?**
    This maps to a well-understood, existing keyboard interaction (PageUp/PageDown). Other magnitudes (e.g., "scroll-to-top") were deferred to keep the initial proposal simple.
* **Why include both logical and physical directions?**
    Logical directions (`block-start`, `inline-end`, etc.) are essential for internationalization, RTL layouts, and vertical writing modes. Physical directions are included for consistency with CSS and to handle simple cases.

### Future considerations (out of scope for this initial proposal)

1.  **Implicit targeting:** A mechanism for a command invoker to automatically target its "nearest ancestor scroll container" if the `commandfor` attribute is omitted.
2.  **More functionality:** More commands (e.g. scroll-to-top) + value-based scrolling.

### Accessibility & keyboard interaction

This proposal standardizes declarative scrolling by moving state management from custom scripts to the browser engine. To ensure these buttons are accessible by default, the following behaviors are required:

#### Implicit semantic mapping

The commandfor attribute creates a direct relationship between the button and its scroll container, which the browser must expose to Assistive Technology (AT):

* Implicit aria-controls: The browser maps commandfor="ID" to the aria-controls relationship.
* Contextual labeling: If the target container has an accessible name (e.g., aria-label="Document Preview"), the browser should propagate this to the button’s announcement. For example, a page-inline-end command would be announced as "Next page, Document Preview, button."
* Announcement Priority:
   * If a button has a custom aria-label, the browser should use that label as the primary identifier.
   * If no custom label exists, the browser generates a name combining the command action and the target container's name (e.g., "Next page, Document Preview, button").

#### State management and styling

One of the primary benefits of this declarative approach is automatic state synchronization.

* Boundary detection: The browser should automatically manage the aria-disabled state. When a scroller cannot be moved further in the associated direction, the corresponding button is marked aria-disabled="true".
* Focus preservation: The use of aria-disabled is required over the HTML disabled attribute to ensure the button remains in the Tab order. If the button were strictly disabled via the HTML attribute, a keyboard user would lose their focus point upon reaching the end of the scrollable region, causing the focus to reset to the top of the document.
* Styling via attribute selectors: Authors can style these states using attribute selectors (e.g., button[aria-disabled="true"]) to provide visual parity with the :disabled pseudo-class while maintaining accessibility.

#### Internationalization & writing modes

Logical commands (page-inline-start, page-block-end, etc.) ensure that scrolling directions automatically adapt to the document's writing mode. In a Right-to-Left (RTL) context, page-inline-end will correctly scroll to the left, ensuring that "Next" remains semantically and functionally accurate without requiring manual direction logic from the author.

#### Handling multi-axis scrolling

In complex interfaces where a single container supports both horizontal and vertical scrolling, the AT announcement must distinguish between axes to prevent user confusion. When multiple scroll commands target the same commandfor ID, the browser should include the axis in the announcement.A page-inline-end button would be announced as "Next page, horizontal, [Container Name], button."A page-block-end button would be announced as "Next page, vertical, [Container Name], button."

## Accessibility & screen reader announcements
When introducing declarative scroll commands, a key accessibility challenge arises: how do we announce newly visible content to screen reader users without requiring JavaScript? Currently, moving the visual viewport via scrolling does not automatically trigger an announcement. If a user clicks a `command="page-inline-end"` button on a carousel, the visual state changes, but the screen reader remains silent unless focus is explicitly moved.

### Currently possible solution: `scrollsnapchange`
Historically, developers had to rely on complex IntersectionObserver math and scrollend events to detect which item was currently visible, and then manually inject its accessible name into an aria-live region.
With the recent introduction of the [`scrollsnapchange`](https://developer.mozilla.org/en-US/docs/Web/API/Document/scrollsnapchange_event) event, the calculation step is much easier, but JavaScript is still required to bridge the visual state to the semantic state:
```HTML
<div aria-live="polite" class="sr-only" id="scroll-announcer"></div>

<button commandfor="gallery" command="page-inline-end">Next Image</button>

<div id="gallery" style="scroll-snap-type: x mandatory; overflow-x: auto;">
  <img src="1.jpg" alt="A red cat" class="snap-item">
  <img src="2.jpg" alt="A blue dog" class="snap-item">
</div>

<script>
  // JS is still required to trigger the announcement
  document.getElementById('gallery').addEventListener('scrollsnapchange', (e) => {
    const announcer = document.getElementById('scroll-announcer');
    announcer.textContent = `Showing: ${e.snapTargetInline.alt}`; 
  });
</script>
```

So just relying on JavaScript for basic accessibility announcements leaves a significant gap in this proposal. Also, this approach won't work for non-snappable scroll containers.

### Proposed extension: declarative live regions (`aria-live-source`)
To make scroll-driven components fully declarative and accessible out of the box, this explainer proposes extending the aria-live API with a new attribute: `aria-live-source`.
This attribute allows an author to bind a live region directly to a scrollable container.
```HTML
<!-- The live region subscribes directly to the scroller's state -->
<div aria-live="polite" aria-live-source="gallery" class="sr-only"></div>

<button commandfor="gallery" command="page-inline-end">Next Image</button>

<div id="gallery" style="overflow-x: auto;">
  <!-- ... images ... -->
</div>
```

#### How it works under the hood
When a user triggers a scroll command and the scroll completes, the browser handles the announcement natively:
1. **Determine the active element:** The browser engine determines which child of the scroller is currently "active." To calculate this, the browser can reuse the exact same intersection heuristics defined for the [:target-current pseudo-class in CSS Overflow 5](https://www.w3.org/TR/css-overflow-5/#example-d2ca6884). This handles both scroll-snap containers (using the snap target) and standard overflow containers (using visibility/intersection percentages).
2. **Extract the name:** The browser extracts the Accessible Name of that active element (e.g., the alt text of an image, or the aria-label of a card).
3. **Update the AX tree:** The browser internally updates the Accessibility Tree node of the live region with this extracted text, bypassing the DOM entirely.
4. **Fire platform events:** The browser fires the standard platform accessibility event for a live region mutation, as it would do with a manual change from JS (e.g., EVENT_OBJECT_LIVEREGIONCHANGED on Windows/UIA, AXLiveRegionChanged on macOS).

#### Pros
* **No changes of AX API consumers required:** This declarative binding requires zero changes to Operating System Accessibility APIs or third-party Screen Readers. Because the browser handles the targeting calculation internally and fires the exact same platform-level LiveRegionChanged events already used for standard DOM mutations, the entire downstream Assistive Technology ecosystem will support this feature without any changes.
* **Author control over a live region**: An author can decide if subscription is needed or not, depending on the context.
* **Algorithm unification**: By reusing the same algo as for the `:target-current` pseudo-class we unify the common patterns.

#### Cons/Things to consider
* **The DOM vs. AX Tree "desync"**: Historically, the DOM is the absolute source of truth. If a screen reader says "Hello", the word "Hello" usually exists somewhere in the DOM (either as text content, an aria-label, etc.). With aria-live-source, the actual HTML inside the `<div aria-live>` remains empty in the DOM, but the browser artificially injects text into the Accessibility Tree. It creates "magic" behavior happening exclusively in the browser's accessibility engine.
* **The "Focus disconnect"**: Screen reader users generally expect that if an item is explicitly announced as the "current" context, they can immediately interact with it, but aria-live-source only announces the content; it doesn't move the user's virtual reading cursor. It solves the awareness problem, but not the interaction problem.
* **Lack of customization**: When developers write JavaScript to populate live regions, they usually add context. Instead of just announcing "A red cat," they will script it to say "Image 2 of 5: A red cat.". If the browser automates this by extracting the Accessible Name of the "active" element, it will only announce "A red cat." Authors lose the ability to format, localize, or inject contextual data into the announcement.
>We would either have to accept that these announcements are strictly limited to the element's raw name, or we would have to invent another complex attribute (like aria-live-format="Item {index} of {total}: {name}") which vastly inflates the scope of the proposal.

#### Extra thoughts/Possible extensions
* **Multiple elements announcement**: We could consider extending the subscription with some parameter to include only the first "active" element in the announcement or all of the visible ones.
* **Combining aria-live text to announcement**: We could consider taking the text inside the `aria-live` element to concat it with a browser-genereted announcement.
* **A `scrollactivechange` event**: Instead of a fully declarative attribute that bypasses the DOM, the platform could expose the `:target-current` heuristics directly to JavaScript via a new event (e.g., `scrollactivechange`). This would apply to all scrollers, not just those using scroll-snap.
```JavaScript
gallery.addEventListener('scrollactivechange', (e) => {
  // The browser natively calculates the most prominent item
  const activeItem = e.activeElements[0]; 

  // Developer has full flexibility to add formatting/context
  announcer.textContent = `Image ${activeItem.dataset.index} of 10: ${activeItem.alt}`;
});
```
This abandons the zero JS idea of the proposal and goes away from the pure AX solution, but gives more control over the formatting of an announcement.
> Probably we could even combine the two? E.g. use `aria-live-source` if no flexibility is needed and use the event one otherwise?

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


#### Implicit naming

If the author does not provide an accessible name for a scroll button,the browser should generate a name for the button based on the command action, language direction, target container role, and target container name as specified in the following table.
The CONTAINER_NAME and CONTAINER_ROLE should both be omitted from the button name if either:
* The target container does not have a role that permits naming, such as a `div` or `p`.
* The target container does not have a name specified.

   Command|LTR accName|RTL accName
   ---|---|---
`page-up`|Page Up [CONTAINER_NAME CONTAINER_ROLE]|Same as LTR
`page-block-start`|Page Up [CONTAINER_NAME CONTAINER_ROLE]|Same as LTR
`page-down`|Page Down [CONTAINER_NAME CONTAINER_ROLE]|Same as LTR
`page-block-end`|Page Down [CONTAINER_NAME CONTAINER_ROLE]|Same as LTR
`page-left`|Page Left [CONTAINER_NAME CONTAINER_ROLE]|Same as LTR
`page-inline-start`|Page Left [CONTAINER_NAME CONTAINER_ROLE]|Page Right [CONTAINER_NAME CONTAINER_ROLE]
`page-right`|Page Right [CONTAINER_NAME CONTAINER_ROLE]|Same as LTR
`page-inline-end`|Page Right [CONTAINER_NAME CONTAINER_ROLE]|Page Left [CONTAINER_NAME CONTAINER_ROLE]

#### State management and styling

One of the primary benefits of this declarative approach is automatic state synchronization.

* Boundary detection: The browser should automatically manage the aria-disabled state. When a scroller cannot be moved further in the associated direction, the corresponding button is marked aria-disabled="true".
* Focus preservation: The use of aria-disabled is required over the HTML disabled attribute to ensure the button remains in the Tab order. If the button were strictly disabled via the HTML attribute, a keyboard user would lose their focus point upon reaching the end of the scrollable region, causing the focus to reset to the top of the document.
* Styling via attribute selectors: Authors can style these states using attribute selectors (e.g., button[aria-disabled="true"]) to provide visual parity with the :disabled pseudo-class while maintaining accessibility.

#### Screen reader announcements

Accurate, valid scroll button labels are very likely to give non-visual screen reader users the impression that activating the button will change the content that is available to them. However, the content in the target scroll container is always in the accessibility tree, so activating a scroll button will not create any changes that could be perceived by a non-visual screen reader user. Those users would generally expect changes to the content and would then spend time attempting to discover changes when there are none to discover.

A button that is functioning correctly but appears to be broken creates serious user experience problems. Thus, it is important to help non-visual users understand what activating the button is doing and what it is not doing. Helping non-visual users understand that the content available to them is not changing as a result of activating the button should reduce the likelihood that users will think the page is broken.

The proposal for achieving this is to provide an informative announcement via the ariaNotify API when a scroll button is activated. The objective of the announcement is to help non-visual users understand what has changed, and very importantly, what has not changed. 

The format of the announcement string is:
>Visible [horizontal|vertical] scroll [of CONTAINER_NAME CONTAINER_ROLE] changed to x%. The screen reader view did not change.

If the target container does not have a name and role, those parts of the announcement would be omitted.

For example, a page-block-end command for a target with an accessible name "Document Preview" that changed the vertical scroll position to 25% would generate the following announcement:

>Visible vertical scroll of Document Preview region changed to 25%. The screen reader view did not change.

In the event that an author needs to override this default behavior, authors would have two ways of telling browsers not to make the automatic announcements:

1. Declare `aria-live="off"` on the button.
2. Declare `aria-live` with any value on the scroll container.

#### Internationalization & writing modes

Logical commands (page-inline-start, page-block-end, etc.) ensure that scrolling directions automatically adapt to the document's writing mode. In a Right-to-Left (RTL) context, page-inline-end will correctly scroll to the left, ensuring that "Next" remains semantically and functionally accurate without requiring manual direction logic from the author.
/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: vusevapor.com section breaks + Section Metadata.
 * Uses payload.template.sections (page-templates.json); selectors there are DOM-verified.
 *
 * Source-specific fix-ups (verified in migration-work/cleaned.html):
 * - L1523: the "Vapor Is for Adults" section (.section > .cmp-section.vapor-is-for-adults) is
 *   nested inside the key-features section (L1211). It is hoisted to become the next sibling of
 *   the key-features .section wrapper so it gets its own top-level section break.
 * - L944: section 4 starts with the sibling heading ".responsivegrid > .aem-Grid > .text"
 *   ("Your Style. Your Vuse.") — the first selector in section 4's array — so the break lands
 *   before that heading, not before the swatches row.
 */

const SECTION_MARKER_ATTR = 'data-excat-section-id';

function querySection(root, selectors) {
  const list = Array.isArray(selectors) ? selectors : [selectors];
  for (const sel of list) {
    if (!sel) continue;
    let el = null;
    try {
      el = root.querySelector(sel);
    } catch (e) {
      el = null;
    }
    if (el) return el;
  }
  return null;
}

function hoistNestedSections(root) {
  const adults = root.querySelector('.cmp-section.vapor-is-for-adults');
  if (!adults) return;
  const adultsWrapper = adults.parentElement && adults.parentElement.classList.contains('section')
    ? adults.parentElement
    : adults;
  const outer = adultsWrapper.parentElement && adultsWrapper.parentElement.closest('.section');
  if (outer && outer !== adultsWrapper) {
    outer.after(adultsWrapper);
  }
}

export default function transform(hookName, element, payload) {
  const sections = (payload && payload.template && payload.template.sections) || [];
  if (sections.length < 2) return;
  const doc = element.ownerDocument || document;

  if (hookName === 'beforeTransform') {
    hoistNestedSections(element);

    // Insert breaks now, before parsers replace any section element. Reverse order.
    for (let i = sections.length - 1; i >= 0; i -= 1) {
      const section = sections[i];
      if (i === 0 && !section.style) continue;
      const sectionEl = querySection(element, section.selector);
      if (!sectionEl) continue;

      const hr = doc.createElement('hr');
      if (section.style) hr.setAttribute(SECTION_MARKER_ATTR, section.id);
      sectionEl.before(hr);
    }
  }

  if (hookName === 'afterTransform') {
    for (let i = sections.length - 1; i >= 0; i -= 1) {
      const section = sections[i];
      if (!section.style) continue;

      const marker = element.querySelector(`[${SECTION_MARKER_ATTR}="${section.id}"]`);
      const anchor = marker || querySection(element, section.selector);
      if (!anchor) continue;

      const metadataBlock = WebImporter.Blocks.createBlock(doc, {
        name: 'Section Metadata',
        cells: { style: section.style },
      });
      anchor.after(metadataBlock);

      if (marker) {
        marker.removeAttribute(SECTION_MARKER_ATTR);
        if (i === 0) marker.remove();
      }
    }
  }
}

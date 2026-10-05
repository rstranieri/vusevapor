/* eslint-disable */
/* global WebImporter */
/**
 * Parser for cards-feature. Base: cards.
 * Source: https://www.vusevapor.com/originals.html
 * Selector: .cmp-section.key-features > .cmp-section__container > .aem-Grid > .grid-container
 *
 * Output (2 columns, one row per feature):
 *   [icon image] | [h3 title, p description]
 *
 * The matched element also holds the section heading ("Key Features", h1 at parse time)
 * in its first grid column. That heading is moved out and kept as default content
 * immediately before the block.
 *
 * Each feature is a nested .grid-container (block-level div) holding an icon column and a
 * text column. The icon is duplicated for mobile (.d-md-none.d-edit-block) - that copy is
 * skipped if the cleanup transformer has not already removed it.
 */
const MOBILE_DUP = '.d-md-none.d-edit-block';

export default function parse(element, { document }) {
  // Feature items: nested grid containers that contain a heading
  const features = [...element.querySelectorAll('.grid-container')]
    .filter((gc) => gc !== element)
    .filter((gc) => gc.querySelector('h3, h4, h2'))
    // keep the innermost container per feature
    .filter((gc) => ![...gc.querySelectorAll('.grid-container')].some((inner) => inner.querySelector('h3, h4, h2')));

  // Section heading(s) outside any feature item -> default content before the block
  const leadHeadings = [...element.querySelectorAll('h1, h2')]
    .filter((h) => !features.some((f) => f.contains(h)))
    .filter((h) => h.textContent.trim());

  const cells = [];
  features.forEach((feature) => {
    const img = [...feature.querySelectorAll('img')].find((i) => !i.closest(MOBILE_DUP))
      || feature.querySelector('img');
    const title = feature.querySelector('h3, h4, h2');
    const descriptions = [...feature.querySelectorAll('p')]
      .filter((p) => !p.closest(MOBILE_DUP))
      .filter((p) => p.textContent.trim());

    const body = [];
    if (title) {
      const h3 = document.createElement('h3');
      h3.textContent = title.textContent.replace(/\s+/g, ' ').trim();
      body.push(h3);
    }
    descriptions.forEach((p) => {
      const np = document.createElement('p');
      np.innerHTML = p.innerHTML.trim();
      body.push(np);
    });

    if (!img && !body.length) return;
    cells.push([img || '', body]);
  });

  if (!cells.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  // Keep the section heading as default content directly before the block
  leadHeadings.forEach((h) => element.before(h));

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards-feature', cells });
  element.replaceWith(block);
}

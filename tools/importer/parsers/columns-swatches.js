/* eslint-disable */
/* global WebImporter */
/**
 * Parser for columns-swatches. Base: columns.
 * Source: https://www.vusevapor.com/originals.html
 * Selector: .section.d-md-block.cmp-section--small-padding
 *
 * Output: 1 row x N cells (4 on originals), each cell = one device colour image (alt preserved).
 * Iterates .grid-column wrappers (block-level divs); falls back to images directly.
 */
export default function parse(element, { document }) {
  let columns = [...element.querySelectorAll('.grid-column')]
    .filter((col) => !col.parentElement.closest('.grid-column'))
    .filter((col) => col.querySelector('img'));

  const row = [];
  if (columns.length) {
    columns.forEach((col) => {
      const img = col.querySelector('.cmp-image__img, img');
      const cell = [];
      // Keep a wrapping link if the swatch is clickable
      const link = img.closest('a[href]');
      if (link && col.contains(link) && link.getAttribute('href') !== '#') {
        const a = document.createElement('a');
        a.href = link.getAttribute('href');
        a.append(img);
        cell.push(a);
      } else {
        cell.push(img);
      }
      // Optional caption text in the column
      const caption = col.querySelector('.cmp-image__title, figcaption, p');
      if (caption && caption.textContent.trim()) {
        const p = document.createElement('p');
        p.textContent = caption.textContent.trim();
        cell.push(p);
      }
      row.push(cell);
    });
  } else {
    [...element.querySelectorAll('img')].forEach((img) => row.push([img]));
  }

  if (!row.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const cells = [row];
  const block = WebImporter.Blocks.createBlock(document, { name: 'columns-swatches', cells });
  element.replaceWith(block);
}

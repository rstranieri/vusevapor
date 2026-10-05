/* eslint-disable */
/* global WebImporter */
/**
 * Parser for cards-promo. Base: cards.
 * Source: https://www.vusevapor.com/originals.html
 * Selector: .cmp-experiencefragment--tiles .cmp-grid-container--full-viewport
 *
 * Output (2 columns, one row per tile):
 *   [background image (+ optional mobile image)] | [logo image (alt kept), p text, p > a CTA]
 *
 * Iterates the tile wrapper .cmp-section--background-img (block-level div). Mobile text
 * duplicates (.d-md-none.d-edit-block) are skipped if cleanup has not already removed them.
 * CTA anchors are reused as-is (original href), same as links in default content.
 */
const MOBILE_DUP = '.d-md-none.d-edit-block';

export default function parse(element, { document }) {
  let tiles = [...element.querySelectorAll('.cmp-section--background-img')]
    .filter((t) => !t.parentElement.closest('.cmp-section--background-img'));
  if (!tiles.length) {
    // Fallback: top-level grid columns
    tiles = [...element.querySelectorAll('.grid-column')]
      .filter((c) => !c.parentElement.closest('.grid-column'));
  }

  const cells = [];
  tiles.forEach((tile) => {
    const bgImg = tile.querySelector('.cmp-section__background-picture img, img.cmp-section__background-img');
    const logo = [...tile.querySelectorAll('.cmp-image img, img')]
      .find((img) => img !== bgImg && !img.closest(MOBILE_DUP));

    const body = [];
    if (logo) body.push(logo);

    const texts = [...tile.querySelectorAll('.cmp-text p, p')]
      .filter((p) => !p.closest(MOBILE_DUP))
      .filter((p) => p.textContent.replace(/\u00a0/g, ' ').trim());
    const seen = new Set();
    texts.forEach((p) => {
      const key = p.textContent.replace(/\s+/g, ' ').trim();
      if (seen.has(key)) return;
      seen.add(key);
      const np = document.createElement('p');
      np.innerHTML = p.innerHTML.trim();
      body.push(np);
    });

    [...tile.querySelectorAll('a[href]')]
      .filter((a) => !a.closest(MOBILE_DUP))
      .filter((a) => a.textContent.trim() && a.getAttribute('href') !== '#')
      .forEach((a) => {
        const link = document.createElement('a');
        link.href = a.getAttribute('href');
        link.textContent = a.textContent.replace(/\s+/g, ' ').trim();
        const p = document.createElement('p');
        p.append(link);
        body.push(p);
      });

    if (!bgImg && !body.length) return;

    // Optional mobile background: <source media="(max-width: ...)"> in the tile's background
    // picture. Emitted as a second image in the image cell (same convention as cards-teaser).
    const media = [bgImg || ''];
    const mobileSrc = tile.querySelector('.cmp-section__background-picture source[media*="max-width"]')
      ?.getAttribute('srcset')?.split(',')[0].trim().split(/\s+/)[0];
    if (bgImg && mobileSrc && mobileSrc !== bgImg.getAttribute('src')) {
      const mobileImg = document.createElement('img');
      mobileImg.src = mobileSrc;
      mobileImg.alt = bgImg.getAttribute('alt') || '';
      media.push(mobileImg);
    }
    cells.push([media, body]);
  });

  if (!cells.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards-promo', cells });
  element.replaceWith(block);
}

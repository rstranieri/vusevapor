/* eslint-disable */
/* global WebImporter */
/**
 * Parser for cards-teaser. Base: cards.
 * Source: https://www.vusevapor.com/originals.html
 * Selector: .section.cmp-section--no-padding:not(.d-md-none):has(.cmp-teaser) .cmp-grid-container__items
 *
 * Output (2 columns, one row per teaser):
 *   [background image] | [h3 title, p description, p > a CTA]
 *
 * Iterates the top-level .grid-column wrappers (block-level divs) and takes the FIRST
 * .cmp-teaser in each column. The "Offers" column holds several geo-targeted copies of the
 * same teaser; the cleanup transformer keeps only the first, and this guarantees one card
 * per column even if it has not run. Fallback: every .cmp-teaser, de-duplicated.
 */
function text(el) {
  return el ? el.textContent.replace(/\s+/g, ' ').trim() : '';
}

export default function parse(element, { document }) {
  const columns = [...element.querySelectorAll('.grid-column')]
    .filter((col) => !col.parentElement.closest('.grid-column'));

  let teasers = columns
    .map((col) => col.querySelector('.cmp-teaser'))
    .filter(Boolean);

  if (!teasers.length) {
    const seen = new Set();
    teasers = [...element.querySelectorAll('.cmp-teaser')].filter((t) => {
      const key = `${text(t.querySelector('.cmp-teaser__title'))}|${t.querySelector('a[href]')?.getAttribute('href') || ''}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  const cells = [];
  teasers.forEach((teaser) => {
    const bgImg = teaser.querySelector('.cmp-teaser__background-picture img, img.cmp-teaser__background-img')
      || teaser.querySelector('img');
    const titleEl = teaser.querySelector('.cmp-teaser__title, h3, h2, h4');
    const descEl = teaser.querySelector('.cmp-teaser__description');

    const body = [];
    const title = text(titleEl);
    if (title) {
      const h3 = document.createElement('h3');
      h3.textContent = title;
      body.push(h3);
    }
    if (descEl) {
      const paras = [...descEl.querySelectorAll('p')].filter((p) => p.textContent.trim());
      if (paras.length) {
        paras.forEach((p) => {
          const np = document.createElement('p');
          np.innerHTML = p.innerHTML.trim();
          body.push(np);
        });
      } else if (descEl.textContent.trim()) {
        const np = document.createElement('p');
        np.innerHTML = descEl.innerHTML.trim();
        body.push(np);
      }
    }
    [...teaser.querySelectorAll('.cmp-teaser__action-link, .cmp-teaser__action-container a')]
      .filter((a, i, arr) => arr.indexOf(a) === i)
      .filter((a) => a.getAttribute('href') && a.getAttribute('href') !== '#' && text(a))
      .forEach((a) => {
        const link = document.createElement('a');
        link.href = a.getAttribute('href');
        link.textContent = text(a);
        const p = document.createElement('p');
        p.append(link);
        body.push(p);
      });

    if (!bgImg && !body.length) return;

    // Optional mobile background: <source media="(max-width: ...)"> in the teaser picture.
    // Emitted as a second image in the image cell (the block swaps it in below 600px).
    const media = [bgImg || ''];
    const mobileSrc = teaser.querySelector('.cmp-teaser__background-picture source[media*="max-width"]')
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

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards-teaser', cells });
  element.replaceWith(block);
}

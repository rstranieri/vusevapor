/* eslint-disable */
/* global WebImporter */
/**
 * Parser for cards-product. Base: cards.
 * Source: https://www.vusevapor.com/originals.html
 * Selector: .section.cmp-section--background-color-grey .cmp-grid-container__items
 *
 * Output (2 columns, one row per product):
 *   [pack image] | [p tag, h3 title, p strengths, p description]
 *
 * Iterates the inner .cmp-product-card wrapper (block-level div) rather than grid columns,
 * so the 'see more' toggle column (if not already removed by cleanup) never becomes a card.
 */
function text(el) {
  return el ? el.textContent.replace(/\s+/g, ' ').trim() : '';
}

export default function parse(element, { document }) {
  const cards = [...element.querySelectorAll('.cmp-product-card')]
    // skip nested matches and hidden mobile duplicates
    .filter((card) => !card.parentElement.closest('.cmp-product-card'))
    .filter((card) => !card.closest('.d-md-none.d-edit-block'));

  const cells = [];

  cards.forEach((card) => {
    // Tag: "Fresh New Look." + "Same Original Taste." -> one paragraph
    const tagParts = [
      text(card.querySelector('.cmp-product-card__topSection')),
      text(card.querySelector('.cmp-product-card__label')),
    ].filter(Boolean);

    const titleEl = card.querySelector('.cmp-product-card__flavor_title, h3, h2, h4');
    const strengthsEl = card.querySelector('.cmp-product-card__specialTitle');
    const descEl = card.querySelector('.cmp-product-card__flavor_description');
    const img = card.querySelector('.cmp-product-card__flavorImage img, img');

    const title = text(titleEl);
    if (!title && !img) return;

    const body = [];
    if (tagParts.length) {
      const p = document.createElement('p');
      p.textContent = tagParts.join(' ');
      body.push(p);
    }
    if (title) {
      const h3 = document.createElement('h3');
      h3.textContent = title;
      body.push(h3);
    }
    const strengths = text(strengthsEl);
    if (strengths) {
      const p = document.createElement('p');
      p.textContent = strengths;
      body.push(p);
    }
    const desc = text(descEl);
    if (desc) {
      const p = document.createElement('p');
      p.textContent = desc;
      body.push(p);
    }
    // CTA links inside the card (none on originals; kept if present on other pages)
    card.querySelectorAll('a[href]').forEach((a) => {
      if (text(a) && a.getAttribute('href') !== '#') {
        const p = document.createElement('p');
        p.append(a);
        body.push(p);
      }
    });

    if (img && !img.getAttribute('alt') && title) img.setAttribute('alt', title);

    cells.push([img || '', body]);
  });

  if (!cells.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards-product', cells });
  element.replaceWith(block);
}

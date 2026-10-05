import { createOptimizedPicture } from '../../scripts/aem.js';

/**
 * Product cards: one row per product -> [pack image] | [tag, title, strengths, description].
 * The paragraph before the heading becomes the tag (shown above the image) and the
 * first paragraph after the heading becomes the strengths line.
 * @param {Element} block
 */
export default function decorate(block) {
  const ul = document.createElement('ul');

  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    const cells = [...row.children];

    const imageCell = cells.find((cell) => cell.querySelector('picture') && !cell.querySelector('h1, h2, h3, h4, h5, h6'));
    const bodyCell = cells.find((cell) => cell !== imageCell) || document.createElement('div');

    // A picture authored inside the body cell (single-cell rows) is treated as the image
    let picture = imageCell?.querySelector('picture');
    if (!picture) {
      picture = bodyCell.querySelector('picture');
      const holder = picture?.closest('p');
      if (holder && holder.children.length === 1) holder.replaceWith(picture);
    }

    const image = document.createElement('div');
    image.className = 'cards-product-card-image';
    if (picture) image.append(picture);

    bodyCell.className = 'cards-product-card-body';
    const heading = bodyCell.querySelector('h1, h2, h3, h4, h5, h6');
    const items = [...bodyCell.children];
    let tag = null;
    if (heading) {
      const idx = items.indexOf(heading);
      tag = items.slice(0, idx).find((el) => el.tagName === 'P') || null;
      const strengths = items.slice(idx + 1).find((el) => el.tagName === 'P' && !el.querySelector('a'));
      if (strengths) strengths.classList.add('cards-product-card-strengths');
      heading.classList.add('cards-product-card-title');
    }
    if (tag) {
      tag.classList.add('cards-product-card-tag');
      // Plain-text tags show one sentence per line (e.g. "Fresh New Look." / "Same ...")
      const sentences = tag.children.length ? [] : tag.textContent.trim().split(/(?<=[.!?])\s+/);
      if (sentences.length > 1) {
        tag.replaceChildren(...sentences.map((text) => {
          const line = document.createElement('span');
          line.textContent = text;
          return line;
        }));
      }
      li.append(tag);
    }

    if (picture) li.append(image);
    else li.classList.add('cards-product-card-no-image');
    li.append(bodyCell);
    ul.append(li);
  });

  ul.querySelectorAll('picture > img').forEach((img) => {
    img.closest('picture').replaceWith(createOptimizedPicture(img.src, img.alt || '', false, [{ width: '750' }]));
  });

  block.replaceChildren(ul);
}

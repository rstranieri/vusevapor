import { createOptimizedPicture } from '../../scripts/aem.js';

/**
 * Feature cards: one row per feature -> [icon image] | [title, description].
 * Rendered as an icon-left list item.
 * @param {Element} block
 */
export default function decorate(block) {
  const ul = document.createElement('ul');

  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    const cells = [...row.children];
    const iconCell = cells.find((cell) => cell.querySelector('picture, .icon') && !cell.textContent.trim());
    const bodyCells = cells.filter((cell) => cell !== iconCell);

    if (iconCell) {
      iconCell.className = 'cards-feature-card-icon';
      li.append(iconCell);
    } else {
      li.classList.add('cards-feature-card-no-icon');
    }

    const body = document.createElement('div');
    body.className = 'cards-feature-card-body';
    bodyCells.forEach((cell) => body.append(...cell.childNodes));
    li.append(body);
    ul.append(li);
  });

  ul.querySelectorAll('picture > img').forEach((img) => {
    img.closest('picture').replaceWith(createOptimizedPicture(img.src, img.alt || '', false, [{ width: '200' }]));
  });

  block.replaceChildren(ul);
}

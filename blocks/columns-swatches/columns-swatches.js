import { createOptimizedPicture } from '../../scripts/aem.js';

/**
 * Swatch columns: image-only cells shown side by side (4-up on desktop,
 * horizontally scrollable on small screens). Every cell of every row becomes one swatch.
 * @param {Element} block
 */
export default function decorate(block) {
  const ul = document.createElement('ul');

  [...block.children].forEach((row) => {
    [...row.children].forEach((cell) => {
      if (!cell.textContent.trim() && !cell.querySelector('picture, img')) return;
      const li = document.createElement('li');
      li.className = 'columns-swatches-item';
      const img = cell.querySelector('picture img, img');
      if (img) {
        const picture = createOptimizedPicture(img.src, img.alt || '', false, [{ width: '600' }]);
        const link = img.closest('a');
        const media = document.createElement('div');
        media.className = 'columns-swatches-image';
        if (link) {
          link.replaceChildren(picture);
          media.append(link);
        } else {
          media.append(picture);
        }
        li.append(media);
        // Keep any authored caption text alongside the image
        img.closest('picture')?.remove();
        const rest = [...cell.children].filter((el) => el.textContent.trim());
        if (rest.length) {
          const caption = document.createElement('div');
          caption.className = 'columns-swatches-caption';
          caption.append(...rest);
          li.append(caption);
        }
      } else {
        li.append(...cell.childNodes);
      }
      ul.append(li);
    });
  });

  block.classList.add(`columns-swatches-${ul.children.length}-items`);
  block.replaceChildren(ul);
}

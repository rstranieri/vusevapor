import { createOptimizedPicture } from '../../scripts/aem.js';

/**
 * Promo tiles: one row per tile -> [background image] | [logo image, text, CTA link].
 * The background fills the tile; logo, text and CTA are overlaid on top.
 * @param {Element} block
 */
export default function decorate(block) {
  const ul = document.createElement('ul');

  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    const cells = [...row.children];
    const first = cells[0];
    const hasBackground = cells.length > 1
      && first?.querySelector('picture') && !first.textContent.trim();

    if (hasBackground) {
      first.className = 'cards-promo-card-background';
      li.append(first);
    } else {
      li.classList.add('cards-promo-card-no-background');
    }

    const body = document.createElement('div');
    body.className = 'cards-promo-card-body';
    cells.filter((cell) => cell !== first || !hasBackground)
      .forEach((cell) => body.append(...cell.childNodes));

    // An image-only paragraph inside the body is the program logo
    const logo = [...body.querySelectorAll('picture')]
      .map((pic) => pic.closest('p') || pic)
      .find((el) => !el.textContent.trim());
    if (logo) logo.classList.add('cards-promo-card-logo');

    li.append(body);
    ul.append(li);
  });

  // background cell: 1st image = tile art; optional 2nd image = mobile art for small screens
  ul.querySelectorAll('.cards-promo-card-background').forEach((cell) => {
    const [desktop, mobile] = [...cell.querySelectorAll('picture > img')];
    if (!desktop) return;
    const wide = createOptimizedPicture(desktop.src, desktop.alt || mobile?.alt || '', false, [
      { media: '(width >= 900px)', width: '1200' },
      { media: '(width >= 600px)', width: '750' },
      { width: '750' },
    ]);
    if (!mobile) {
      cell.replaceChildren(wide);
      return;
    }
    const picture = createOptimizedPicture(mobile.src, desktop.alt || mobile.alt || '', false, [
      { width: '750' },
    ]);
    picture.prepend(...wide.querySelectorAll('source[media]'));
    cell.replaceChildren(picture);
  });
  ul.querySelectorAll('.cards-promo-card-body picture > img').forEach((img) => {
    img.closest('picture').replaceWith(createOptimizedPicture(img.src, img.alt || '', false, [{ width: '400' }]));
  });

  block.replaceChildren(ul);
}

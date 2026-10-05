import { createOptimizedPicture } from '../../scripts/aem.js';

/**
 * Teaser tiles: one row per teaser -> [background image] | [title, description, CTA link].
 * The background illustration fills the tile; text and CTA are overlaid on the left.
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
      first.className = 'cards-teaser-card-background';
      li.append(first);
    } else {
      li.classList.add('cards-teaser-card-no-background');
    }

    const body = document.createElement('div');
    body.className = 'cards-teaser-card-body';
    cells.filter((cell) => cell !== first || !hasBackground)
      .forEach((cell) => body.append(...cell.childNodes));
    li.append(body);
    ul.append(li);
  });

  ul.querySelectorAll('picture > img').forEach((img) => {
    img.closest('picture').replaceWith(createOptimizedPicture(img.src, img.alt || '', false, [
      { media: '(width >= 900px)', width: '750' },
      { width: '600' },
    ]));
  });

  // background cell: 1st image = tile art; optional 2nd image = taller art for small screens
  ul.querySelectorAll('.cards-teaser-card-background').forEach((cell) => {
    const [desktop, mobile] = [...cell.querySelectorAll('picture > img')];
    if (!mobile) return;
    const picture = createOptimizedPicture(mobile.src, desktop.alt || mobile.alt, false, [
      { width: '600' },
    ]);
    const wide = createOptimizedPicture(desktop.src, '', false, [
      { media: '(width >= 900px)', width: '750' },
      { media: '(width >= 600px)', width: '600' },
      { width: '600' },
    ]);
    picture.prepend(...wide.querySelectorAll('source[media]'));
    cell.replaceChildren(picture);
  });

  // hover ring: feed the pointer position to the CSS radial gradient (pointer devices only)
  if (window.matchMedia('(hover: hover)').matches) {
    ul.addEventListener('pointermove', (e) => {
      const li = e.target.closest('li');
      if (!li) return;
      const rect = li.getBoundingClientRect();
      li.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
      li.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
    });
  }

  block.replaceChildren(ul);
}

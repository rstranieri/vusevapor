/**
 * VUSE footer variant (pages with metadata `template: vuse`).
 * Content comes from the /vuse/footer fragment, three sections in order:
 *   columns (bold heading paragraph + its links) | copyright | back-to-top label
 * All copy and links are read from the fragment; this module only builds structure
 * and behaviour.
 */
import { loadCSS } from '../../scripts/aem.js';

async function fetchFooter() {
  // metadata-independent: /content first (local preview), then site root (DA/EDS)
  let resp = await fetch('/content/vuse/footer.plain.html');
  if (!resp.ok) resp = await fetch('/vuse/footer.plain.html');
  if (!resp.ok) return null;
  const tpl = document.createElement('template');
  tpl.innerHTML = await resp.text();
  return tpl.content;
}

function el(tag, className, ...children) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  children.flat().filter(Boolean).forEach((c) => node.append(c));
  return node;
}

/** Each bold-only paragraph starts a column; everything after it belongs to that column. */
function buildColumns(section) {
  const columns = [];
  [...section.children].forEach((node) => {
    const strong = node.tagName === 'P' && node.children.length === 1 ? node.querySelector(':scope > strong') : null;
    if (strong && node.textContent.trim() === strong.textContent.trim()) {
      columns.push(el('div', 'vuse-footer-column', el('p', 'vuse-footer-heading', ...strong.childNodes)));
    } else if (columns.length) {
      const column = columns[columns.length - 1];
      if (node.tagName === 'UL') node.className = 'vuse-footer-links';
      if (node.tagName === 'P') node.className = 'vuse-footer-line';
      column.append(node);
    }
  });
  return el('nav', 'vuse-footer-columns', columns);
}

/** Copyright: an authored {Year} token is replaced with the current year. */
function buildCopyright(section) {
  const copy = section.querySelector('p');
  if (!copy) return null;
  copy.className = 'vuse-footer-copyright';
  copy.innerHTML = copy.innerHTML.replace(/\{year\}/gi, String(new Date().getFullYear()));
  return copy;
}

function buildBackToTop(section) {
  const label = section?.textContent.replace(/\s+/g, ' ').trim();
  if (!label) return null;
  const button = el('button', 'vuse-back-to-top');
  button.type = 'button';
  button.setAttribute('aria-label', label);
  button.hidden = true;
  button.addEventListener('click', () => {
    const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: smooth ? 'smooth' : 'auto' });
  });
  const update = () => { button.hidden = window.scrollY < window.innerHeight; };
  window.addEventListener('scroll', update, { passive: true });
  update();
  return button;
}

/** @param {Element} block */
export default async function decorate(block) {
  loadCSS(`${window.hlx.codeBasePath}/blocks/footer/vuse-footer.css`);
  const fragment = await fetchFooter();
  if (!fragment) return;
  const [columns, legal, utilities] = [...fragment.children];

  block.textContent = '';
  block.append(el(
    'div',
    'vuse-footer',
    el(
      'div',
      'vuse-footer-inner',
      columns ? buildColumns(columns) : null,
      legal ? buildCopyright(legal) : null,
    ),
    buildBackToTop(utilities),
  ));
}

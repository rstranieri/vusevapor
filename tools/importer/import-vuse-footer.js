/* eslint-disable */
/* global WebImporter */

/**
 * Import script for the VUSE footer fragment (/vuse/footer).
 * Source: the authenticated footer on https://www.vusevapor.com/originals.html.
 *
 * Output sections (flat, semantic — read by blocks/footer/vuse-footer.js):
 *   1. columns    — per column: bold heading paragraph, then its links
 *                   (paragraph links for text lines, a list for link lists)
 *   2. legal      — copyright paragraph
 *   3. utilities  — back-to-top button label
 */

const text = (el) => (el ? el.textContent.replace(/\s+/g, ' ').trim() : '');

function p(document, ...children) {
  const el = document.createElement('p');
  children.forEach((c) => el.append(typeof c === 'string' ? document.createTextNode(c) : c));
  return el;
}

function link(document, a) {
  const out = document.createElement('a');
  out.href = a.getAttribute('href');
  out.textContent = text(a);
  return out;
}

export default {
  transform: ({ document }) => {
    const footer = document.querySelector('footer.footer .cmp-authenticated-container__authenticated-content')
      || document.querySelector('footer.footer');
    const out = document.createElement('div');
    const section = (...children) => {
      const div = document.createElement('div');
      children.flat().filter(Boolean).forEach((c) => div.append(c));
      if (out.children.length) out.append(document.createElement('hr'));
      out.append(div);
    };

    // 1. link columns
    const columns = [];
    footer.querySelectorAll('.cmp-footer__navList > .cmp-footer__navListItem, .cmp-footer__navList > li').forEach((col) => {
      const title = col.querySelector(':scope > .cmp-footer__navListLink, :scope > span, :scope > a');
      if (!text(title)) return;
      const strong = document.createElement('strong');
      strong.textContent = text(title);
      columns.push(p(document, strong));
      // free-text lines (e.g. contact details) stay paragraphs
      col.querySelectorAll(':scope .cmp-footer__navListItem-text p').forEach((line) => {
        const a = line.querySelector('a');
        if (text(line)) columns.push(a ? p(document, link(document, a)) : p(document, text(line)));
      });
      const links = [...col.querySelectorAll(':scope ul a[href]')].filter((a) => text(a));
      if (links.length) {
        const ul = document.createElement('ul');
        links.forEach((a) => {
          const li = document.createElement('li');
          li.append(link(document, a));
          ul.append(li);
        });
        columns.push(ul);
      }
    });
    section(columns);

    // 2. copyright
    section(p(document, text(footer.querySelector('.cmp-footer__copyright'))));

    // 3. back-to-top label (icon-only button on the source)
    const backToTop = document.querySelector('.button-back-to-top');
    const backLabel = backToTop?.getAttribute('aria-label') || text(backToTop);
    if (backLabel) section(p(document, backLabel));

    return [{
      element: out,
      path: '/vuse/footer',
      report: { title: 'VUSE footer', columns: columns.filter((c) => c.querySelector && c.querySelector('strong')).length },
    }];
  },
};

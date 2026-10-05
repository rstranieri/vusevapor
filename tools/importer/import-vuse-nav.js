/* eslint-disable */
/* global WebImporter */

/**
 * Import script for the VUSE header nav fragment (/vuse/nav).
 * Source: the authenticated header on https://www.vusevapor.com/originals.html
 * (header experience fragment + surgeon-general warning).
 *
 * Output sections (flat, semantic — read by blocks/header/vuse-header.js):
 *   1. warning        — warning text, notice-left, notice-right paragraphs
 *   2. announcements  — one list per announcement bar (one item per rotating message)
 *   3. brand          — logo link
 *   4. sections       — primary nav links (visual order)
 *   5. tools          — Join Rewards link, notifications (label, heading, links), profile, store
 * Images reference the local icon set in /vuse/images/.
 */

const IMAGES = {
  logo: 'images/vuse-logo.svg',
  notifications: 'images/icon-notifications.svg',
  profile: 'images/icon-profile.svg',
  store: 'images/icon-store.svg',
};

const text = (el) => (el ? el.textContent.replace(/\s+/g, ' ').trim() : '');

function img(document, src, alt) {
  const i = document.createElement('img');
  i.src = src;
  i.alt = alt;
  return i;
}

function link(document, href, content) {
  const a = document.createElement('a');
  a.href = href;
  [].concat(content).forEach((c) => a.append(typeof c === 'string' ? document.createTextNode(c) : c));
  return a;
}

function p(document, ...children) {
  const el = document.createElement('p');
  children.forEach((c) => el.append(typeof c === 'string' ? document.createTextNode(c) : c));
  return el;
}

/** Copy a message paragraph keeping only text and links. */
function cleanMessage(document, source) {
  const li = document.createElement('li');
  source.childNodes.forEach((n) => {
    if (n.nodeType === 3) li.append(document.createTextNode(n.textContent.replace(/\s+/g, ' ')));
    else if (n.tagName === 'A') li.append(link(document, n.getAttribute('href'), text(n)));
    else li.append(document.createTextNode(text(n)));
  });
  li.innerHTML = li.innerHTML.trim();
  return li;
}

/** Visual order of nav links (source reorders items with CSS `order`); falls back to DOM order. */
function navLinks(root) {
  const view = root.ownerDocument.defaultView;
  return [...root.querySelectorAll('.cmp-header .cmp-navigation__group > .cmp-navigation__item > a.cmp-navigation__item-link')]
    .filter((a) => text(a) && !a.matches('.cmp-header__profile-link, .cmp-header__location-link'))
    .map((a, i) => ({ a, i, order: Number(view.getComputedStyle(a.parentElement).order) || 0 }))
    .sort((l1, l2) => (l1.order - l2.order) || (l1.i - l2.i))
    .map((l) => l.a);
}

/** Icon links carry their visible label in the title attribute (rendered by script on the source). */
const label = (a) => text(a) || a.getAttribute('title') || '';

export default {
  transform: ({ document, params }) => {
    const out = document.createElement('div');
    const section = (...children) => {
      const div = document.createElement('div');
      children.flat().filter(Boolean).forEach((c) => div.append(c));
      if (out.children.length) out.append(document.createElement('hr'));
      out.append(div);
    };

    // 1. warning
    const warning = document.querySelector('.cmp-surgeon-general-warning');
    section(
      p(document, text(warning?.querySelector('.cmp-surgeon-general-warning__warning-text'))),
      p(document, text(warning?.querySelector('.cmp-surgeon-general-warning__notice'))),
      p(document, text(warning?.querySelector('.cmp-surgeon-general-warning__name'))),
    );

    // 2. announcements (one list per bar)
    const header = document.querySelector('.cmp-experiencefragment--header') || document;
    const bars = [...header.querySelectorAll('.cmp-announcement')].map((bar) => {
      const ul = document.createElement('ul');
      bar.querySelectorAll('.cmp-announcement__content p').forEach((msg) => {
        if (text(msg)) ul.append(cleanMessage(document, msg));
      });
      return ul.children.length ? ul : null;
    });
    section(bars);

    // 3. brand
    const auth = header.querySelector('.cmp-authenticated-container__authenticated-content') || header;
    const logoLink = auth.querySelector('.cmp-header__logo-link');
    const logoImg = auth.querySelector('.cmp-header__logo-img');
    section(p(document, link(document, logoLink?.getAttribute('href') || '/', img(document, IMAGES.logo, logoImg?.getAttribute('alt') || 'Vuse'))));

    // 4. sections — mobile menu toggle label (CSS-generated on the source) + nav links
    const toggle = auth.querySelector('.hamburger-wrapper');
    const view = document.defaultView;
    const generated = toggle ? view.getComputedStyle(toggle, '::after').content : '';
    // without the site CSS, fall back to the visible word of the accessible name ("hamburger menu" -> "Menu")
    const ariaWord = (toggle?.getAttribute('aria-label') || '').trim().split(/\s+/).pop() || '';
    const menuLabel = (generated && !['none', 'normal'].includes(generated))
      ? generated.replace(/^["']|["']$/g, '')
      : ariaWord.charAt(0).toUpperCase() + ariaWord.slice(1);
    const ul = document.createElement('ul');
    navLinks(auth).forEach((a) => {
      const li = document.createElement('li');
      const navLink = link(document, a.getAttribute('href'), text(a));
      // highlighted items (gradient text on the source) are authored in bold
      if (a.parentElement.classList.contains('nav-gradient')) {
        const strong = document.createElement('strong');
        strong.append(navLink);
        li.append(strong);
      } else {
        li.append(navLink);
      }
      ul.append(li);
    });
    section(menuLabel ? p(document, menuLabel) : null, ul);

    // 5. tools
    const join = auth.querySelector('.cmp-lplus-rewardstatus__action');
    const bell = auth.querySelector('.cmp-activity-feed__notification-icon-button');
    const drawer = auth.querySelector('.cmp-activity-feed__drawer, .cmp-activity-feed');
    const drawerHeading = drawer && [...drawer.querySelectorAll('h1,h2,h3,h4,h5,h6')].find((h) => text(h));
    const drawerLinks = drawer ? [...drawer.querySelectorAll('a[href]')].filter((a) => text(a) && a.getAttribute('href') !== '#') : [];
    const profile = auth.querySelector('.cmp-header__profile-link');
    const store = auth.querySelector('.cmp-header__location-link');
    const tools = [];
    if (join) tools.push(p(document, link(document, join.getAttribute('href'), text(join))));
    if (bell) {
      tools.push(p(document, img(document, IMAGES.notifications, ''), text(bell.querySelector('.sr-only')) || 'open notifications'));
      // drawer title as bold text (headings get auto ids, which nav fragments must not carry);
      // vuse-header.js renders it as the drawer heading
      if (drawerHeading) {
        const strong = document.createElement('strong');
        strong.textContent = text(drawerHeading);
        tools.push(p(document, strong));
      }
      // close-button label (plain paragraph), also used for the announcement close buttons
      const closeLabel = text(drawer?.querySelector('.cmp-activity-feed__close, button[class*="close"]'));
      if (closeLabel) tools.push(p(document, closeLabel));
      const dl = document.createElement('ul');
      drawerLinks.forEach((a) => {
        const li = document.createElement('li');
        li.append(link(document, a.getAttribute('href'), text(a)));
        dl.append(li);
      });
      if (dl.children.length) tools.push(dl);
    }
    if (profile) tools.push(p(document, link(document, profile.getAttribute('href'), [img(document, IMAGES.profile, ''), label(profile)])));
    if (store) tools.push(p(document, link(document, store.getAttribute('href'), [img(document, IMAGES.store, ''), label(store)])));
    section(tools);

    return [{
      element: out,
      path: '/vuse/nav',
      report: { title: 'VUSE nav', sections: out.querySelectorAll(':scope > div').length },
    }];
  },
};

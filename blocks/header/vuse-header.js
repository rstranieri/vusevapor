/**
 * VUSE header variant (pages with metadata `template: vuse`).
 * Content comes from the /vuse/nav fragment, five sections in order:
 *   warning | announcements | brand | sections | tools
 * All copy, links and images are read from the fragment; this module only builds
 * structure and behaviour.
 */
import { loadCSS } from '../../scripts/aem.js';

const ROTATE_MS = 6000;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const isDesktop = window.matchMedia('(width >= 900px)');

async function fetchNav() {
  // metadata-independent: /content first (local preview), then site root (DA/EDS)
  let resp = await fetch('/content/vuse/nav.plain.html');
  if (!resp.ok) resp = await fetch('/vuse/nav.plain.html');
  if (!resp.ok) return null;
  const tpl = document.createElement('template');
  tpl.innerHTML = await resp.text();
  // resolve fragment-relative media against the fragment location
  const base = new URL(resp.url, window.location.href);
  tpl.content.querySelectorAll('img[src]').forEach((img) => {
    img.src = new URL(img.getAttribute('src'), base).href;
  });
  tpl.content.querySelectorAll('source[srcset]').forEach((source) => {
    source.srcset = new URL(source.getAttribute('srcset'), base).href;
  });
  return tpl.content;
}

function el(tag, className, ...children) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  children.flat().filter(Boolean).forEach((c) => node.append(c));
  return node;
}

const text = (node) => (node ? node.textContent.replace(/\s+/g, ' ').trim() : '');

/** Normalise a path for current-page matching (/content prefix, .html, trailing slash). */
const normPath = (path) => path.replace(/^\/content(?=\/)/, '').replace(/\.html$/, '').replace(/\/$/, '') || '/';

function buildWarning(section) {
  const [warning, ...notices] = [...section.querySelectorAll(':scope > p')];
  if (!warning) return null;
  return el(
    'div',
    'vuse-warning',
    el('div', 'vuse-warning-box', el('p', 'vuse-warning-text', ...warning.childNodes)),
    notices.length ? el('div', 'vuse-warning-notice', notices.map((n) => el('span', '', ...n.childNodes))) : null,
  );
}

function closeButton(className, label) {
  const button = el('button', className);
  button.type = 'button';
  if (label) button.setAttribute('aria-label', label);
  return button;
}

/** Rotating, dismissible announcement bars — one per list in the section. */
function buildAnnouncements(section, closeLabel) {
  const bars = [...section.querySelectorAll(':scope > ul')].map((list, index) => {
    const items = [...list.children];
    if (!items.length) return null;
    list.className = 'vuse-announcement-messages';
    items[0].classList.add('is-active');
    const close = closeButton('vuse-announcement-close', closeLabel);
    const bar = el('div', `vuse-announcement vuse-announcement-${index + 1}`, list, close);
    close.addEventListener('click', () => bar.remove());

    if (items.length > 1) {
      let current = 0;
      let paused = false;
      bar.addEventListener('mouseenter', () => { paused = true; });
      bar.addEventListener('mouseleave', () => { paused = false; });
      bar.addEventListener('focusin', () => { paused = true; });
      bar.addEventListener('focusout', () => { paused = false; });
      const timer = setInterval(() => {
        if (!bar.isConnected) { clearInterval(timer); return; }
        if (paused || reducedMotion.matches) return;
        items[current].classList.remove('is-active');
        current = (current + 1) % items.length;
        items[current].classList.add('is-active');
      }, ROTATE_MS);
    }
    return bar;
  }).filter(Boolean);
  return bars.length ? el('div', 'vuse-announcements', bars) : null;
}

function buildBrand(section) {
  const link = section.querySelector('a');
  if (!link) return null;
  link.className = 'vuse-brand';
  return link;
}

/**
 * Primary nav; icon links from the tools section are repeated as mobile-only menu items.
 * A leading paragraph in the section is the mobile menu toggle label.
 */
function buildSections(section, mobileLinks = []) {
  const list = section.querySelector('ul');
  if (!list) return {};
  const here = normPath(window.location.pathname);
  list.className = 'vuse-nav-list';
  list.querySelectorAll(':scope > li').forEach((li) => {
    const link = li.querySelector('a');
    if (!link) return;
    if (li.querySelector('strong')) {
      li.classList.add('is-highlight');
      li.querySelector('strong').replaceWith(link);
    }
    if (normPath(new URL(link.href, window.location.href).pathname) === here) {
      link.setAttribute('aria-current', 'page');
    }
  });
  mobileLinks.forEach((link) => {
    const copy = link.cloneNode(true);
    copy.className = 'vuse-nav-icon-link';
    list.append(el('li', 'vuse-nav-mobile-only', copy));
  });

  const nav = el('nav', 'vuse-nav', list);
  nav.id = 'vuse-nav';

  const label = text(section.querySelector(':scope > p'));
  const toggle = el('button', 'vuse-hamburger', el('span', 'vuse-hamburger-icon'), el('span', 'vuse-hamburger-label', label));
  toggle.type = 'button';
  toggle.setAttribute('aria-controls', nav.id);
  toggle.setAttribute('aria-expanded', 'false');

  const setOpen = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    nav.classList.toggle('is-open', open);
    document.body.style.overflowY = open ? 'hidden' : '';
  };
  toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && nav.classList.contains('is-open')) { setOpen(false); toggle.focus(); }
  });
  // crossing to desktop closes the mobile menu and restores page scroll
  isDesktop.addEventListener('change', () => setOpen(false));
  return { nav, toggle };
}

/**
 * Notification drawer: trigger (icon + accessible label), title (bold paragraph),
 * close label (plain paragraph) and the list of links that follows.
 */
function buildDrawer(trigger, title, closeLabel, links) {
  const icon = trigger.querySelector('picture, img');
  const label = text(trigger);
  const button = el('button', 'vuse-tool vuse-notifications', icon, el('span', 'vuse-sr-only', label));
  button.type = 'button';
  button.setAttribute('aria-expanded', 'false');

  const heading = el('h2', 'vuse-drawer-title', text(title));
  heading.id = 'vuse-drawer-title';
  const close = closeButton('vuse-drawer-close', closeLabel);
  if (links) {
    links.className = 'vuse-drawer-links';
    links.querySelectorAll('a').forEach((a) => a.append(el('span', 'vuse-drawer-badge')));
  }
  const drawer = el('div', 'vuse-drawer', close, heading, links);
  drawer.id = 'vuse-drawer';
  drawer.setAttribute('role', 'dialog');
  drawer.setAttribute('aria-labelledby', heading.id);
  // closed drawer stays rendered off-canvas (slide transition) but inert
  drawer.inert = true;
  button.setAttribute('aria-controls', drawer.id);

  const isOpen = () => drawer.classList.contains('is-open');
  const toggle = (open) => {
    button.setAttribute('aria-expanded', String(open));
    drawer.inert = !open;
    if (open) {
      const bar = button.closest('.vuse-navbar');
      drawer.style.top = `${Math.max(0, bar.getBoundingClientRect().bottom)}px`;
      drawer.classList.add('is-open');
      close.focus();
    } else {
      drawer.classList.remove('is-open');
    }
  };
  button.addEventListener('click', () => toggle(!isOpen()));
  close.addEventListener('click', () => { toggle(false); button.focus(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen()) { toggle(false); button.focus(); }
  });
  document.addEventListener('click', (e) => {
    if (isOpen() && !drawer.contains(e.target) && !button.contains(e.target)) toggle(false);
  });
  return { button, drawer };
}

function buildTools(section) {
  const tools = el('div', 'vuse-tools');
  let drawer = null;
  let closeLabel = '';
  const nodes = [...section.children];
  for (let i = 0; i < nodes.length; i += 1) {
    const node = nodes[i];
    const link = node.querySelector('a');
    const media = node.querySelector('picture, img');
    if (node.tagName === 'P' && link && !media) {
      link.className = 'vuse-cta';
      tools.append(link);
    } else if (node.tagName === 'P' && link && media) {
      link.className = 'vuse-tool vuse-icon-link';
      const label = [...link.childNodes].filter((n) => n.nodeType === Node.TEXT_NODE);
      link.append(el('span', 'vuse-icon-label', ...label));
      tools.append(link);
    } else if (node.tagName === 'P' && media) {
      // notification trigger: following bold paragraph, plain paragraph and list belong to it
      let title = null;
      let links = null;
      while (nodes[i + 1] && !nodes[i + 1].querySelector('a, picture, img') && nodes[i + 1].tagName === 'P') {
        i += 1;
        if (nodes[i].querySelector('strong')) title = nodes[i];
        else closeLabel = text(nodes[i]);
      }
      if (nodes[i + 1]?.tagName === 'UL') { i += 1; links = nodes[i]; }
      const built = buildDrawer(node, title, closeLabel, links);
      tools.append(built.button);
      drawer = built.drawer;
    }
  }
  return { tools, drawer, closeLabel };
}

/** @param {Element} block */
export default async function decorate(block) {
  loadCSS(`${window.hlx.codeBasePath}/blocks/header/vuse-header.css`);
  const fragment = await fetchNav();
  if (!fragment) return;
  const [warning, announcements, brand, sections, toolsSection] = [...fragment.children];

  const { tools, drawer, closeLabel } = toolsSection ? buildTools(toolsSection) : {};
  const iconLinks = tools ? [...tools.querySelectorAll('.vuse-icon-link')] : [];
  const { nav, toggle } = sections ? buildSections(sections, iconLinks) : {};
  const navbar = el(
    'div',
    'vuse-navbar',
    brand ? buildBrand(brand) : null,
    nav,
    tools,
    toggle,
  );

  const warningEl = warning ? buildWarning(warning) : null;
  const header = el(
    'div',
    'vuse-header',
    warningEl,
    announcements ? buildAnnouncements(announcements, closeLabel) : null,
    navbar,
    drawer,
  );
  block.textContent = '';
  block.append(header);

  // the warning is pinned to the top on mobile: reserve its measured height so it never covers content
  if (warningEl && 'ResizeObserver' in window) {
    new ResizeObserver(([entry]) => {
      header.style.setProperty('--vh-warning-height', `${Math.ceil(entry.borderBoxSize[0].blockSize)}px`);
    }).observe(warningEl);
  }
}

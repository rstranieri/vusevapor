/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: vusevapor.com site-wide cleanup.
 *
 * All selectors verified in migration-work/cleaned.html (line refs below) or listed in
 * migration-work/page-structure.json "excluded" (captured from the live DOM).
 *
 * The source is age/login-gated client-side (body starts with style="visibility: hidden;"
 * and a .please-wait-container overlay). The server-rendered HTML is complete, so nothing
 * here depends on client JS having run — we simply un-hide the body and drop the overlays.
 */
const TransformHook = { beforeTransform: 'beforeTransform', afterTransform: 'afterTransform' };

const HERO_H1_ATTR = 'data-vuse-hero-h1';

// Global chrome / overlays (non-authorable)
const CHROME_SELECTORS = [
  'div.mfa-layout-header', // global header wrapper (live DOM, page-structure.json)
  '.surgeon-general-warning', // L5 fixed nicotine warning bar
  '.cmp-experiencefragment--header', // L19 header XF (announcements, nav, rewards/login overlays, camera modal)
  'header.header', // L138, L611 header components
  '.cmp-experiencefragment--footer', // L2076 footer XF
  'footer.footer', // L2083, L2219 (footer.footer.aem-GridColumn)
  '.cmp-experiencefragment--tobacco-preference-notification', // L2320 preference survey popup
  '.cmp-experiencefragment--modal-disruptor', // L2619 discount modal popup
  '.backtotop', // L2067 back-to-top button
  '.please-wait-container', // L2706 login "Please wait..." overlay
];

// Hidden / duplicate / non-authorable bits inside the main content
const CONTENT_NOISE_SELECTORS = [
  '.raw-html', // empty raw-html script containers (L643..., L709, L748, L1984, ...)
  '.spacer', // div.spacer > .cmp-spacer (&nbsp;) layout spacers
  '.cmp-spacer',
  '.d-md-none.d-edit-block', // mobile-only duplicates: carousel section L1033, feature icons L1259.., tile text L1633/L1695
];

/**
 * AEM core image lazy-loading: the server HTML wraps every .cmp-image <img> in
 * <noscript class="loading-lazy"> (client JS swaps it in). With scripting enabled (setContent)
 * noscript content is raw text, so parsers would see no <img>. Materialize it as real DOM.
 */
function materializeNoscriptImages(element) {
  const doc = element.ownerDocument;
  [...element.querySelectorAll('noscript')].forEach((ns) => {
    let nodes;
    if (ns.children.length) {
      nodes = [...ns.childNodes];
    } else {
      const raw = ns.textContent || '';
      if (!/<img\b/i.test(raw)) return;
      const tpl = doc.createElement('template');
      tpl.innerHTML = raw;
      nodes = [...tpl.content.childNodes];
    }
    if (!nodes.some((n) => n.nodeType === 1 && (n.matches('img') || n.querySelector('img')))) return;
    ns.replaceWith(...nodes);
  });
}

function unhideBody(element) {
  [element, element.ownerDocument && element.ownerDocument.body].forEach((el) => {
    if (el && el.style && el.style.visibility === 'hidden') {
      el.style.removeProperty('visibility');
      if (!el.getAttribute('style')) el.removeAttribute('style');
    }
  });
}

/**
 * "Offers" geo-targeted teaser: several d-none .cmp-section.offers-tile copies (L1815, L1860),
 * one per US state group. Keep only the first copy and un-hide it.
 */
function keepFirstOfferTile(element) {
  const parents = new Set();
  element.querySelectorAll('.cmp-section.offers-tile').forEach((tile) => {
    const wrapper = tile.closest('.section') || tile;
    parents.add(wrapper.parentElement);
  });
  parents.forEach((parent) => {
    if (!parent) return;
    const tiles = [...parent.querySelectorAll(':scope > .section > .cmp-section.offers-tile, :scope > .cmp-section.offers-tile')];
    tiles.forEach((tile, idx) => {
      if (idx === 0) {
        tile.classList.remove('d-none');
      } else {
        (tile.closest('.section') || tile).remove();
      }
    });
  });
}

/**
 * Remove sections hidden on every viewport (.cmp-section.d-none), except the kept offers tile:
 * - L1146 hidden duplicate "Your Style. Your Vuse." + .color-picker
 * - L1989 hidden "Liquids Blended in the USA" (.cmp-section--background-img.d-none:not(.tiles))
 * - L591 hidden FDA notice (inside header XF)
 */
function removeHiddenSections(element) {
  element.querySelectorAll('.cmp-section.d-none:not(.offers-tile)').forEach((sec) => {
    const wrapper = sec.parentElement && sec.parentElement.classList.contains('section')
      ? sec.parentElement
      : sec;
    wrapper.remove();
  });
  // Stray color picker outside a hidden section (page-structure.json excluded)
  WebImporter.DOMUtils.remove(element, ['.color-picker']);
}

/**
 * 'see more' mobile toggle (href="#"), L916: .button.cmp-button--product-page-link-white sits
 * alone in its own product-grid column — remove the column too so no empty card is produced.
 */
function removeSeeMoreToggles(element) {
  element.querySelectorAll('.cmp-button--product-page-link-white').forEach((btn) => {
    const col = btn.closest('.grid-column');
    if (col && !col.querySelector('img, h1, h2, h3, h4, h5, h6, p')) {
      col.remove();
    } else {
      btn.remove();
    }
  });
}

export default function transform(hookName, element, payload) {
  if (hookName === TransformHook.beforeTransform) {
    unhideBody(element);
    WebImporter.DOMUtils.remove(element, CHROME_SELECTORS);
    materializeNoscriptImages(element);
    keepFirstOfferTile(element);
    removeHiddenSections(element);
    removeSeeMoreToggles(element);
    WebImporter.DOMUtils.remove(element, CONTENT_NOISE_SELECTORS);

    // Mark the hero heading so it remains the only h1 after parsing.
    const heroH1 = element.querySelector('.hero-banner h1');
    if (heroH1) heroH1.setAttribute(HERO_H1_ATTR, '');
  }

  if (hookName === TransformHook.afterTransform) {
    // Leftovers (in case anything was re-introduced or missed)
    WebImporter.DOMUtils.remove(element, CHROME_SELECTORS);
    WebImporter.DOMUtils.remove(element, ['.raw-html', '.spacer', '.cmp-spacer']);
    WebImporter.DOMUtils.remove(element, ['script', 'style', 'noscript', 'link', 'iframe', 'source']);

    // Source uses h1 for every section heading; keep only the hero h1, demote the rest to h2.
    const h1s = [...element.querySelectorAll('h1')];
    let keep = h1s.find((h) => h.hasAttribute(HERO_H1_ATTR));
    if (!keep) keep = h1s[0];
    h1s.forEach((h1) => {
      h1.removeAttribute(HERO_H1_ATTR);
      if (h1 === keep) return;
      const h2 = element.ownerDocument.createElement('h2');
      h2.innerHTML = h1.innerHTML;
      h1.replaceWith(h2);
    });

    unhideBody(element);
  }
}

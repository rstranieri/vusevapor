import { readBlockConfig, toCamelCase, toClassName } from '../../scripts/aem.js';

/**
 * Applies authored Section Metadata (e.g. style: grey) to its section on VUSE pages:
 * style values become section classes, other keys become data attributes.
 * No-op when the delivery pipeline has already processed the metadata.
 * @param {Element} section
 */
function applySectionMetadata(section) {
  const meta = section.querySelector(':scope > div > .section-metadata');
  if (!meta) return;
  const config = readBlockConfig(meta);
  Object.entries(config).forEach(([key, value]) => {
    if (key === 'style') {
      String(value).split(',').map((s) => toClassName(s.trim())).filter(Boolean)
        .forEach((cls) => section.classList.add(cls));
    } else {
      section.dataset[toCamelCase(key)] = value;
    }
  });
  const wrapper = meta.parentElement;
  meta.remove();
  if (wrapper && !wrapper.children.length) wrapper.remove();
  section.classList.remove('section-metadata-container');
}

/**
 * VUSE template: scoped brand theme for migrated vusevapor.com pages.
 * @param {Document|Element} root
 */
export default function decorate(root) {
  const main = root.querySelector('main') || root;
  main.querySelectorAll(':scope > .section').forEach(applySectionMetadata);
}

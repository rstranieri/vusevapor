/* eslint-disable */
/* global WebImporter */

// PARSER IMPORTS
import heroVideoParser from './parsers/hero-video.js';
import cardsProductParser from './parsers/cards-product.js';
import columnsSwatchesParser from './parsers/columns-swatches.js';
import cardsFeatureParser from './parsers/cards-feature.js';
import cardsPromoParser from './parsers/cards-promo.js';
import cardsTeaserParser from './parsers/cards-teaser.js';

// TRANSFORMER IMPORTS
import cleanupTransformer from './transformers/vusevapor-cleanup.js';
import sectionsTransformer from './transformers/vusevapor-sections.js';

// PARSER REGISTRY
const parsers = {
  'hero-video': heroVideoParser,
  'cards-product': cardsProductParser,
  'columns-swatches': columnsSwatchesParser,
  'cards-feature': cardsFeatureParser,
  'cards-promo': cardsPromoParser,
  'cards-teaser': cardsTeaserParser,
};

// PAGE TEMPLATE CONFIGURATION - Embedded from page-templates.json
const PAGE_TEMPLATE = {
  "name": "originals",
  "description": "Product series landing page: video hero, intro statement, product flavor grid, device color swatches, key features, responsibility statement, program tiles and utility teasers",
  "urls": [
    "https://www.vusevapor.com/originals.html"
  ],
  "blocks": [
    {
      "name": "hero-video",
      "instances": [
        ".hero-banner.cmp-hero-banner--content-left"
      ]
    },
    {
      "name": "cards-product",
      "instances": [
        ".section.cmp-section--background-color-grey .cmp-grid-container__items"
      ]
    },
    {
      "name": "columns-swatches",
      "instances": [
        ".section.d-md-block.cmp-section--small-padding"
      ]
    },
    {
      "name": "cards-feature",
      "instances": [
        ".cmp-section.key-features > .cmp-section__container > .aem-Grid > .grid-container"
      ]
    },
    {
      "name": "cards-promo",
      "instances": [
        ".cmp-experiencefragment--tiles .cmp-grid-container--full-viewport"
      ]
    },
    {
      "name": "cards-teaser",
      "instances": [
        ".section.cmp-section--no-padding:not(.d-md-none):has(.cmp-teaser) .cmp-grid-container__items"
      ]
    }
  ],
  "sections": [
    {
      "id": "1",
      "name": "Hero",
      "selector": [
        ".section:has(.hero-banner)"
      ],
      "style": null,
      "blocks": [
        "hero-video"
      ],
      "defaultContent": []
    },
    {
      "id": "2",
      "name": "Intro statement",
      "selector": [
        ".section:has(> .cmp-section.high-quality-ingredients)",
        ".cmp-section.high-quality-ingredients"
      ],
      "style": "gradient-headline",
      "blocks": [],
      "defaultContent": [
        ".cmp-section.high-quality-ingredients h1"
      ]
    },
    {
      "id": "3",
      "name": "Product flavors grid",
      "selector": [
        ".section.cmp-section--background-color-grey"
      ],
      "style": "grey",
      "blocks": [
        "cards-product"
      ],
      "defaultContent": [
        ".section.cmp-section--background-color-grey .cmp-section__container > .aem-Grid > .button"
      ]
    },
    {
      "id": "4",
      "name": "Device colors",
      "selector": [
        ".responsivegrid > .aem-Grid > .text",
        ".section.d-md-block.cmp-section--small-padding"
      ],
      "style": null,
      "blocks": [
        "columns-swatches"
      ],
      "defaultContent": [
        ".responsivegrid > .aem-Grid > .text"
      ]
    },
    {
      "id": "5",
      "name": "Key features",
      "selector": [
        ".section:has(> .cmp-section.key-features)",
        ".cmp-section.key-features"
      ],
      "style": null,
      "blocks": [
        "cards-feature"
      ],
      "defaultContent": [
        ".cmp-section.key-features .text h1",
        ".cmp-section.key-features > .cmp-section__container > .aem-Grid > .button"
      ]
    },
    {
      "id": "6",
      "name": "Responsibility statement",
      "selector": [
        ".section:has(> .cmp-section.vapor-is-for-adults)",
        ".cmp-section.vapor-is-for-adults"
      ],
      "style": "gradient-headline",
      "blocks": [],
      "defaultContent": [
        ".cmp-section.vapor-is-for-adults .title",
        ".cmp-section.vapor-is-for-adults .text",
        ".cmp-section.vapor-is-for-adults .button"
      ]
    },
    {
      "id": "7",
      "name": "Program tiles",
      "selector": [
        ".section.cmp-section--small-padding:has(.cmp-experiencefragment--tiles)"
      ],
      "style": null,
      "blocks": [
        "cards-promo"
      ],
      "defaultContent": []
    },
    {
      "id": "8",
      "name": "Utility teasers",
      "selector": [
        ".section.cmp-section--no-padding:not(.d-md-none):has(.cmp-teaser)"
      ],
      "style": null,
      "blocks": [
        "cards-teaser"
      ],
      "defaultContent": []
    }
  ]
};

// TRANSFORMER REGISTRY - cleanup first, then section breaks/metadata
const transformers = [
  cleanupTransformer,
  ...(PAGE_TEMPLATE.sections && PAGE_TEMPLATE.sections.length > 1 ? [sectionsTransformer] : []),
];

/**
 * Execute all page transformers for a specific hook
 * @param {string} hookName - The hook name ('beforeTransform' or 'afterTransform')
 * @param {Element} element - The DOM element to transform
 * @param {Object} payload - The payload containing { document, url, html, params }
 */
function executeTransformers(hookName, element, payload) {
  const enhancedPayload = { ...payload, template: PAGE_TEMPLATE };
  transformers.forEach((transformerFn) => {
    try {
      transformerFn.call(null, hookName, element, enhancedPayload);
    } catch (e) {
      console.error(`Transformer failed at ${hookName}:`, e);
    }
  });
}

/**
 * Find all blocks on the page based on the embedded template configuration
 * @param {Document} document - The DOM document
 * @param {Object} template - The embedded PAGE_TEMPLATE object
 * @returns {Array} Array of block instances found on the page
 */
function findBlocksOnPage(document, template) {
  const pageBlocks = [];
  template.blocks.forEach((blockDef) => {
    blockDef.instances.forEach((selector) => {
      const elements = document.querySelectorAll(selector);
      if (elements.length === 0) {
        console.warn(`Block "${blockDef.name}" selector not found: ${selector}`);
      }
      elements.forEach((element) => {
        pageBlocks.push({
          name: blockDef.name,
          selector,
          element,
          section: blockDef.section || null,
        });
      });
    });
  });
  console.log(`Found ${pageBlocks.length} block instances on page`);
  return pageBlocks;
}

export default {
  transform: (payload) => {
    const { document, url, params } = payload;
    const main = document.body;

    // 1. beforeTransform (cleanup + section breaks)
    executeTransformers('beforeTransform', main, payload);

    // 2. Find blocks on page
    const pageBlocks = findBlocksOnPage(document, PAGE_TEMPLATE);

    // 3. Parse each block (skip elements already replaced by an earlier parser)
    pageBlocks.forEach((block) => {
      if (!block.element.parentNode) return;
      const parser = parsers[block.name];
      if (parser) {
        try {
          parser(block.element, { document, url, params });
        } catch (e) {
          console.error(`Failed to parse ${block.name} (${block.selector}):`, e);
        }
      } else {
        console.warn(`No parser found for block: ${block.name}`);
      }
    });

    // 4. afterTransform (final cleanup, heading demotion, section metadata)
    executeTransformers('afterTransform', main, payload);

    // 5. WebImporter built-in rules
    const hr = document.createElement('hr');
    main.appendChild(hr);
    // Page metadata + Template: vuse (scopes the VUSE theme to migrated pages)
    // Keys are lowercased to match getMetadata() lookups and existing content
    const meta = Object.fromEntries(
      Object.entries(WebImporter.Blocks.getMetadata(document) || {})
        .map(([k, v]) => [k.toLowerCase(), v]),
    );
    meta.template = 'vuse';
    main.append(WebImporter.Blocks.getMetadataBlock(document, meta));
    WebImporter.rules.transformBackgroundImages(main, document);
    WebImporter.rules.adjustImageUrls(main, url, params.originalURL);

    // 6. Sanitized path (root URL maps to /index)
    const rawPath = new URL(params.originalURL).pathname
      .replace(/\/$/, '')
      .replace(/\.html?$/, '');
    const path = WebImporter.FileUtils.sanitizePath(rawPath === '' ? '/index' : rawPath);

    return [{
      element: main,
      path,
      report: {
        title: document.title,
        template: PAGE_TEMPLATE.name,
        blocks: pageBlocks.map((b) => b.name),
      },
    }];
  },
};

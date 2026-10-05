/* eslint-disable */
/* global WebImporter */
/**
 * Parser for hero-video. Base: hero.
 * Source: https://www.vusevapor.com/originals.html
 * Selector: .hero-banner.cmp-hero-banner--content-left
 *
 * Output (1 column):
 *   Row 1: links to desktop MP4 (+ mobile MP4 if present) and optional poster image
 *   Row 2: eyebrow <p>, <h1> (asterisk kept as <sup>), subheading <p>
 */
const SOURCE_ORIGIN = 'https://www.vusevapor.com';

function absoluteUrl(src) {
  if (!src) return '';
  try {
    return new URL(src.trim(), SOURCE_ORIGIN).href;
  } catch (e) {
    return src;
  }
}

function videoSrc(video) {
  if (!video) return '';
  const source = video.querySelector('source[src]');
  return (source && source.getAttribute('src')) || video.getAttribute('src') || '';
}

function makeLink(document, href) {
  const p = document.createElement('p');
  const a = document.createElement('a');
  a.href = href;
  a.textContent = href;
  p.append(a);
  return p;
}

export default function parse(element, { document }) {
  // --- Media row ---
  const desktopVideo = element.querySelector('video[class*="--desktop"]')
    || element.querySelector('video');
  const mobileVideo = element.querySelector('video[class*="--mobile"]');

  const sources = [];
  const desktopSrc = videoSrc(desktopVideo);
  if (desktopSrc) sources.push(absoluteUrl(desktopSrc));
  const mobileSrc = videoSrc(mobileVideo);
  if (mobileSrc && mobileVideo !== desktopVideo) {
    const abs = absoluteUrl(mobileSrc);
    if (!sources.includes(abs)) sources.push(abs);
  }

  const mediaCell = sources.map((href) => makeLink(document, href));

  // Optional poster: video poster attribute, or a background image in the banner
  const posterAttr = desktopVideo && desktopVideo.getAttribute('poster');
  if (posterAttr) {
    const img = document.createElement('img');
    img.src = absoluteUrl(posterAttr);
    img.alt = '';
    mediaCell.push(img);
  } else {
    const bgImg = element.querySelector('.cmp-hero-banner__image img, picture img, img');
    if (bgImg) mediaCell.push(bgImg);
  }

  // --- Text row ---
  // Server HTML stores headline/description text only in data-text (client JS fills it in);
  // prefer data-text, fall back to rendered markup.
  const htmlOf = (el) => {
    if (!el) return '';
    const dataText = (el.getAttribute('data-text') || '').trim();
    return dataText || el.innerHTML.trim();
  };
  const hasText = (html) => {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent.trim().length > 0;
  };

  const heading = element.querySelector('h1, h2');
  const contentCell = [];

  if (heading) {
    const eyebrowSpan = heading.querySelector('.cmp-hero-banner__eyebrow');
    const headlineSpan = heading.querySelector('.cmp-hero-banner__headline1');

    if (eyebrowSpan && eyebrowSpan.textContent.trim()) {
      const eyebrow = document.createElement('p');
      eyebrow.textContent = eyebrowSpan.textContent.replace(/\s+/g, ' ').trim();
      contentCell.push(eyebrow);
    }

    let headlineHtml = '';
    if (headlineSpan) {
      headlineHtml = htmlOf(headlineSpan);
    } else {
      if (eyebrowSpan) eyebrowSpan.remove();
      headlineHtml = heading.innerHTML.trim();
    }
    if (hasText(headlineHtml)) {
      const h1 = document.createElement('h1');
      h1.innerHTML = headlineHtml;
      // Preserve marker attribute used by the cleanup transformer to keep this as the only h1
      if (heading.hasAttribute('data-vuse-hero-h1')) h1.setAttribute('data-vuse-hero-h1', '');
      contentCell.push(h1);
    }
  }

  const description = element.querySelector('.cmp-hero-banner__description, .cmp-hero-banner__subheadline');
  const descHtml = htmlOf(description);
  if (hasText(descHtml)) {
    const p = document.createElement('p');
    p.innerHTML = descHtml;
    contentCell.push(p);
  }

  // CTA links in the text area (none on originals, supported for other pages)
  element.querySelectorAll('.cmp-hero-banner__body a[href]').forEach((a) => {
    if (a.textContent.trim()) {
      const p = document.createElement('p');
      p.append(a);
      contentCell.push(p);
    }
  });

  if (!mediaCell.length && !contentCell.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const cells = [];
  if (mediaCell.length) cells.push([mediaCell]);
  cells.push([contentCell]);

  const block = WebImporter.Blocks.createBlock(document, { name: 'hero-video', cells });
  element.replaceWith(block);
}

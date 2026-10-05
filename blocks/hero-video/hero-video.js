import { createOptimizedPicture } from '../../scripts/aem.js';

const VIDEO_EXT = /\.(mp4|webm|ogv|mov)$/i;
const DESKTOP_QUERY = '(width >= 900px)';

/**
 * Whether a link points at a video file (query/hash ignored).
 * @param {HTMLAnchorElement} a
 * @returns {boolean}
 */
function isVideoLink(a) {
  try {
    const { pathname } = new URL(a.href, window.location.href);
    return VIDEO_EXT.test(pathname);
  } catch {
    return false;
  }
}

/**
 * Build a decorative, muted, looping background video.
 * @param {string} src
 * @param {string} [poster]
 * @returns {HTMLVideoElement}
 */
function buildVideo(src, poster) {
  const video = document.createElement('video');
  video.className = 'hero-video-video';
  video.muted = true;
  video.loop = true;
  video.playsInline = true;
  video.setAttribute('muted', '');
  video.setAttribute('playsinline', '');
  video.setAttribute('aria-hidden', 'true');
  video.setAttribute('tabindex', '-1');
  video.preload = 'metadata';
  if (poster) video.poster = poster;
  video.src = src;
  return video;
}

/**
 * Attach the video once the page has loaded so it never competes with LCP.
 * @param {Element} media
 * @param {string[]} sources [desktop, mobile]
 * @param {string} [poster]
 */
function attachVideo(media, sources, poster) {
  const [desktop, mobile] = sources;
  const mq = window.matchMedia(DESKTOP_QUERY);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const mount = () => {
    const src = (!mq.matches && mobile) ? mobile : desktop;
    const existing = media.querySelector('video');
    if (existing && existing.getAttribute('src') === src) return;
    const video = buildVideo(src, poster);
    video.addEventListener('canplay', () => media.classList.add('hero-video-playing'), { once: true });
    if (existing) existing.replaceWith(video); else media.append(video);
    if (!reducedMotion) {
      video.autoplay = true;
      video.play().catch(() => {});
    }
  };

  if (document.readyState === 'complete') mount();
  else window.addEventListener('load', mount, { once: true });
  if (mobile) mq.addEventListener('change', mount);
}

/** @param {Element} block The hero-video block element */
export default function decorate(block) {
  const rows = [...block.children];
  const h1 = block.querySelector('h1, h2');
  const textRow = h1 ? h1.closest('.hero-video > div') : rows[rows.length - 1];
  const mediaRow = rows.find((row) => row !== textRow) || null;

  // Text
  if (textRow) {
    textRow.classList.add('hero-video-content');
    const heading = textRow.querySelector('h1, h2');
    if (heading) {
      const container = heading.parentElement;
      const siblings = [...container.children];
      const idx = siblings.indexOf(heading);
      const eyebrow = siblings.slice(0, idx).find((el) => el.tagName === 'P' && !el.querySelector('a, picture'));
      if (eyebrow) eyebrow.classList.add('hero-video-eyebrow');
    }
  }

  if (!mediaRow) {
    block.classList.add('no-media');
    return;
  }

  mediaRow.classList.add('hero-video-media');

  // Video sources (first = desktop, second = optional mobile)
  const videoLinks = [...mediaRow.querySelectorAll('a[href]')].filter(isVideoLink);
  const sources = videoLinks.map((a) => a.href);
  videoLinks.forEach((a) => {
    const p = a.closest('p');
    a.remove();
    if (p && !p.textContent.trim() && !p.children.length) p.remove();
  });

  // Poster image (also the LCP candidate and the reduced-motion fallback)
  const img = mediaRow.querySelector('picture img');
  let poster;
  if (img) {
    const optimized = createOptimizedPicture(img.src, img.alt || '', true, [
      { media: DESKTOP_QUERY, width: '2000' },
      { width: '900' },
    ]);
    optimized.classList.add('hero-video-poster');
    poster = optimized.querySelector('img')?.src;
    img.closest('picture').replaceWith(optimized);
  }

  // Flatten the media row so the poster/video sit directly in it
  const media = mediaRow;
  const picture = media.querySelector('picture');
  media.replaceChildren(...(picture ? [picture] : []));

  if (sources.length) {
    attachVideo(media, sources, poster);
  } else if (!picture) {
    block.classList.add('no-media');
  }
}

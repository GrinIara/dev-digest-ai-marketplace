import DOMPurify from 'dompurify';
import { marked } from 'marked';

/**
 * README and SKILL.md bodies are untrusted (they arrive through pull requests), so the HTML from
 * marked is always sanitised. Links open in a new tab; relative links resolve against the file's
 * folder on GitHub because the site itself has no such files. Headings are demoted one level
 * (h1 becomes h2, and so on) because the page already has its own h1.
 */
export function renderMarkdown(src: string, baseUrl: string): string {
  const html = marked.parse(src, { async: false, gfm: true }) as string;
  const clean = DOMPurify.sanitize(html, { USE_PROFILES: { html: true }, FORBID_TAGS: ['style', 'form', 'input', 'button'] });
  const doc = new DOMParser().parseFromString(clean, 'text/html');
  doc.querySelectorAll('a[href]').forEach((a) => {
    const href = a.getAttribute('href') ?? '';
    if (!/^(https?:|mailto:|#)/i.test(href)) {
      try {
        a.setAttribute('href', new URL(href, baseUrl).href);
      } catch {
        a.removeAttribute('href');
      }
    }
    if (!href.startsWith('#')) {
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener noreferrer');
    }
  });
  doc.querySelectorAll('h1,h2,h3,h4,h5').forEach((h) => {
    const demoted = doc.createElement('h' + (Number(h.tagName[1]) + 1));
    demoted.innerHTML = h.innerHTML;
    h.replaceWith(demoted);
  });
  doc.querySelectorAll('img').forEach((img) => {
    const src = img.getAttribute('src') ?? '';
    if (!/^https:/i.test(src)) img.remove();
  });
  return doc.body.innerHTML;
}

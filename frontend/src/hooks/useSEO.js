import { useEffect } from 'react';

/**
 * Custom hook to dynamically manage SEO head tags in a Single Page Application (SPA).
 * Updates document.title, meta tags, canonical link, Open Graph, Twitter cards, and JSON-LD schema.
 */
export function useSEO({
  title,
  description,
  canonical = 'https://vedixaerp.com/',
  ogTitle,
  ogDescription,
  ogImage = 'https://vedixaerp.com/vedixa_logo.png',
  schema,
  noIndex = false,
}) {
  useEffect(() => {
    if (title) {
      document.title = title;
    }

    const setMetaTag = (nameOrProperty, content, isProperty = false) => {
      if (!content) return;
      const attr = isProperty ? 'property' : 'name';
      let element = document.querySelector(`meta[${attr}="${nameOrProperty}"]`);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attr, nameOrProperty);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    if (description) {
      setMetaTag('description', description);
      setMetaTag('og:description', ogDescription || description, true);
      setMetaTag('twitter:description', ogDescription || description);
    }

    if (ogTitle || title) {
      setMetaTag('og:title', ogTitle || title, true);
      setMetaTag('twitter:title', ogTitle || title);
    }

    if (ogImage) {
      setMetaTag('og:image', ogImage, true);
      setMetaTag('twitter:image', ogImage);
    }

    if (canonical) {
      let linkCanonical = document.querySelector('link[rel="canonical"]');
      if (!linkCanonical) {
        linkCanonical = document.createElement('link');
        linkCanonical.setAttribute('rel', 'canonical');
        document.head.appendChild(linkCanonical);
      }
      linkCanonical.setAttribute('href', canonical);
      setMetaTag('og:url', canonical, true);
    }

    if (noIndex) {
      setMetaTag('robots', 'noindex, nofollow');
    } else {
      setMetaTag('robots', 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1');
    }

    let scriptTag = null;
    if (schema) {
      scriptTag = document.getElementById('dynamic-page-schema');
      if (!scriptTag) {
        scriptTag = document.createElement('script');
        scriptTag.type = 'application/ld+json';
        scriptTag.id = 'dynamic-page-schema';
        document.head.appendChild(scriptTag);
      }
      scriptTag.text = JSON.stringify(schema);
    }

    return () => {
      if (scriptTag && document.head.contains(scriptTag)) {
        scriptTag.remove();
      }
    };
  }, [title, description, keywords, canonical, ogTitle, ogDescription, ogImage, schema, noIndex]);
}

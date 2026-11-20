
(() => {
  'use strict';

  const API_URL = 'https://tiktak-real-estate.onrender.com/api/analytics/visit';
  const STORAGE_KEY = 'tiktak-analytics-visitor';

  const allowedPages = [
    '/',
    '/index.html',
    '/listing.html',
    '/account.html',
    '/dashboard.html'
  ];

  const path = window.location.pathname;
  if (!allowedPages.includes(path)) return;

  let visitorId;

  try {
    visitorId = localStorage.getItem(STORAGE_KEY);

    if (!visitorId) {
      if (crypto.randomUUID) {
        visitorId = crypto.randomUUID();
      } else {
        visitorId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
          const r = Math.random() * 16 | 0;
          return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });
      }

      localStorage.setItem(STORAGE_KEY, visitorId);
    }
  } catch {
    return;
  }

  const payload = {
    visitorId,
    path
  };

  if (path === '/listing.html') {
    const listingId = new URLSearchParams(window.location.search).get('id');
    if (!listingId) return;
    payload.listingId = listingId;
  }

  fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload),
    credentials: 'omit',
    keepalive: true
  }).catch(() => {
    // Analytics failure must never interrupt the website.
  });
})();

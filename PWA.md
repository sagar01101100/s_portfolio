# PWA setup

The portfolio is installable as a Progressive Web App on supported browsers.

## Features
- Web app manifest with standalone display mode and matching dark theme.
- Service worker that caches the app shell and same-origin assets for repeat visits and basic offline loading.
- SVG app icon.
- Service-worker registration in the page.

## Deploy
Deploy the contents of `dist/` to an HTTPS static host (Netlify supports HTTPS automatically). After deployment, open the site in Chrome on Android and choose **Install app** or **Add to Home screen** from the browser menu.

## Offline notes
The first visit must be online so the service worker can install and cache the portfolio assets. External links, hosted services, and the contact form may still require a connection. After updating the app, the service worker uses a new cache version when its cache name is changed.

## Testing
- Open DevTools → Application → Manifest and Service Workers.
- Check the console for failed app-shell requests; a missing cached file can prevent installation of the service worker.
- Test installation and offline launch on an Android device over HTTPS.

/* Glow Up service worker.
   ➜ Every time you change index.html (or anything else) on GitHub, change VERSION below
     (e.g. 2.0.0 → 2.0.1). Phones that installed the app then show "A new version is ready",
     and if update alerts are on, a phone notification too. */
const VERSION = "2.0.0";
const CACHE = "glowup-" + VERSION;
const SHELL = ["./", "./index.html", "./manifest.json", "./icons/icon-192.png", "./icons/icon-512.png", "./icons/apple-touch-icon.png"];
const CDN = /^(https:\/\/(cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net|www\.gstatic\.com\/firebasejs|fonts\.googleapis\.com|fonts\.gstatic\.com))/;

function canNotify() {
  try { return self.Notification && Notification.permission === "granted"; } catch (e) { return false; }
}

self.addEventListener("install", e => {
  const isUpdate = !!self.registration.active; // an older version is already installed
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => {
    if (isUpdate && canNotify()) {
      return self.registration.showNotification("✨ Glow Up update ready", {
        body: "Version " + VERSION + " is here. Open the app and tap “Update now”.",
        icon: "./icons/icon-192.png",
        badge: "./icons/icon-192.png",
        tag: "glowup-update",
        renotify: true
      });
    }
  }));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith("glowup-") && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("message", e => {
  if (!e.data) return;
  if (e.data.type === "SKIP_WAITING") self.skipWaiting();
  if (e.data.type === "VERSION" && e.source) e.source.postMessage({ type: "VERSION", version: VERSION, ask: e.data.ask || "" });
});
self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => {
    for (const c of list) { if ("focus" in c) return c.focus(); }
    return self.clients.openWindow("./#home");
  }));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // Never cache Firebase data or sign-in traffic
  if (/googleapis\.com$/.test(url.hostname) && !/^fonts\./.test(url.hostname)) return;
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put("./index.html", copy)); return r; })
      .catch(() => caches.match("./index.html").then(r => r || caches.match("./"))));
    return;
  }
  if (url.origin === location.origin || CDN.test(req.url)) {
    e.respondWith(caches.match(req).then(hit => {
      const net = fetch(req).then(r => { if (r && (r.ok || r.type === "opaque")) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(req, copy)); } return r; }).catch(() => hit);
      return hit || net;
    }));
  }
});

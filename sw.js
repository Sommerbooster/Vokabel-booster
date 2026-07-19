/* Vokabel-Sommer-Booster – Service Worker
   Strategie: Seite und PDFs bei jedem Aufruf direkt vom Server prüfen (cache:"no-cache"
   erzwingt die Rückfrage beim Server statt beim Browser-Zwischenspeicher) – damit kommen
   Updates sofort an. Der Cache dient nur als Offline-Ersatz.
   Diese Datei muss bei App-Updates NICHT geändert werden. */
"use strict";
const CACHE = "vb-cache-v4";
const ASSETS = ["./", "./manifest.json", "./icon-192.png", "./icon-512.png", "./icon-180.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;

  // 1) PDFs (Rechtstexte) – MUSS vor dem Seiten-Zweig stehen, denn ein PDF im neuen
  //    Tab ist ebenfalls eine Navigation. Immer direkt vom Server, Cache nur offline.
  if (new URL(req.url).pathname.endsWith(".pdf")) {
    e.respondWith(
      fetch(req, { cache: "no-cache" })
        .then((res) => {
          if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // 2) Seitenaufrufe der App: direkt vom Server prüfen, sonst Cache (offline)
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req, { cache: "no-cache" })
        .then((res) => {
          if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put("./", copy)); }
          return res;
        })
        .catch(() => caches.match("./"))
    );
    return;
  }

  // 3) Übrige Dateien (Icons, Manifest): erst Cache, sonst Netz
  e.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
          return res;
        })
    )
  );
});

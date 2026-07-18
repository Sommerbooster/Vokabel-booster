/* Vokabel-Sommer-Booster – Service Worker
   Strategie: Seite immer frisch aus dem Netz laden (damit Updates sofort ankommen),
   bei fehlendem Internet aus dem Cache (offline nutzbar).
   Diese Datei muss bei App-Updates NICHT geändert werden. */
"use strict";
const CACHE = "vb-cache-v3";
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
  // Seitenaufrufe: erst Netz (frische Version), sonst Cache (offline)
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put("./", copy));
          return res;
        })
        .catch(() => caches.match("./"))
    );
    return;
  }
  // PDFs (Rechtstexte): immer erst frisch aus dem Netz, Cache nur als Offline-Ersatz
  if (new URL(req.url).pathname.endsWith(".pdf")) {
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }
  // Übrige Dateien (Icons, Manifest): erst Cache, sonst Netz
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

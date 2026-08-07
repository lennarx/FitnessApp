import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

// Precache-only, per the brief: no custom fetch/sync logic here. The data
// sync engine (lib/sync/*) runs entirely in the page, never in the worker.
// `defaultCache` is Serwist's own built-in Next.js preset (not code we
// wrote) — it's what lets navigations resolve from cache while offline,
// which a bare precache manifest alone can't do for dynamically rendered
// pages that aren't part of the build-time asset list.
const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
});

serwist.addEventListeners();

"use client";

import { MutationCache, QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { get, set, del } from "idb-keyval";
import { useState, useEffect } from "react";
import { Toaster } from "sonner";

const WEEK = 1000 * 60 * 60 * 24 * 7;

// Persist the query cache to IndexedDB so the library is readable offline and
// a flaky connection doesn't lose your list. Writes need a connection.
const persister = createAsyncStoragePersister({
  storage: {
    getItem: (k) => get(k),
    setItem: (k, v) => set(k, v),
    removeItem: (k) => del(k),
  },
  key: "stacks-query-cache",
  throttleTime: 1000,
});

export function Providers({ children }: { children: React.ReactNode }) {
  const [qc] = useState(
    () =>
      new QueryClient({
        // Offline is read-only for now: a change made without a connection
        // fails straight away with a clear message, instead of being queued
        // and then lost if the app is closed before you're back online.
        mutationCache: new MutationCache({
          onError: () => {
            if (typeof navigator !== "undefined" && !navigator.onLine)
              toast.error("You're offline — that change wasn't saved.", { id: "offline-write" });
          },
        }),
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            gcTime: WEEK, // must outlive the persisted cache to be restored
            refetchOnWindowFocus: false,
            retry: 1,
            networkMode: "offlineFirst",
          },
          mutations: { networkMode: "always" },
        },
      }),
  );

  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  useEffect(() => {
    function onOnline() {
      qc.resumePausedMutations().then(() => qc.invalidateQueries());
    }
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [qc]);

  return (
    <PersistQueryClientProvider
      client={qc}
      persistOptions={{
        persister,
        maxAge: WEEK,
        buster: "v1",
        dehydrateOptions: { shouldDehydrateMutation: () => false },
      }}
      onSuccess={() => {
        qc.resumePausedMutations();
      }}
    >
      {children}
      <Toaster richColors position="top-center" toastOptions={{ duration: 2500 }} />
    </PersistQueryClientProvider>
  );
}

// Serialize a library filter combination (ViewQuery) to/from URL search params
// so the library view is shareable + bookmarkable, and saved shelves can be
// opened from anywhere (command palette, shelf chips) by linking to /library.

import type {
  BookFormat,
  Ownership,
  ReadStatus,
  ViewQuery,
} from "./types";

export function viewQueryToParams(v: ViewQuery): URLSearchParams {
  const p = new URLSearchParams();
  if (v.q) p.set("q", v.q);
  if (v.status?.length) p.set("status", v.status.join(","));
  if (v.ownership?.length) p.set("ownership", v.ownership.join(","));
  if (v.formats?.length) p.set("formats", v.formats.join(","));
  if (v.tagIds?.length) p.set("tags", v.tagIds.join(","));
  if (v.collectionId) p.set("collection", v.collectionId);
  if (v.locationId) p.set("location", v.locationId);
  if (v.favOnly) p.set("fav", "1");
  if (v.minRating) p.set("rating", String(v.minRating));
  if (v.sort && v.sort !== "added") p.set("sort", v.sort);
  return p;
}

export function paramsToViewQuery(
  params: URLSearchParams | ReadonlyURLSearchParamsLike,
): ViewQuery {
  const get = (k: string) => params.get(k);
  const csv = (k: string): string[] => {
    const v = get(k);
    return v ? v.split(",").filter(Boolean) : [];
  };
  const tags = csv("tags");
  const legacyTag = get("tag"); // older deep links used ?tag=<id>
  if (legacyTag && !tags.includes(legacyTag)) tags.push(legacyTag);
  return {
    q: get("q") || undefined,
    status: csv("status") as ReadStatus[],
    ownership: csv("ownership") as Ownership[],
    formats: csv("formats") as BookFormat[],
    tagIds: tags,
    collectionId: get("collection") || undefined,
    locationId: get("location") || undefined,
    favOnly: get("fav") === "1" || undefined,
    minRating: get("rating") ? Number(get("rating")) : undefined,
    sort: get("sort") || undefined,
  };
}

export function libraryHref(v: ViewQuery): string {
  const s = viewQueryToParams(v).toString();
  return s ? `/library?${s}` : "/library";
}

// Next's ReadonlyURLSearchParams has the same `.get` we need.
interface ReadonlyURLSearchParamsLike {
  get(name: string): string | null;
}

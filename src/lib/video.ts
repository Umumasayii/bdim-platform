/** Converts a YouTube or Vimeo page link into an embeddable player URL. */
export function toEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url.trim());
    const host = u.hostname.replace(/^www\.|^m\./, "");
    if (host === "youtu.be") return `https://www.youtube-nocookie.com/embed/${u.pathname.slice(1)}`;
    if (host === "youtube.com" || host === "youtube-nocookie.com") {
      if (u.pathname === "/watch" && u.searchParams.get("v")) return `https://www.youtube-nocookie.com/embed/${u.searchParams.get("v")}`;
      const m = /^\/(embed|shorts|live)\/([\w-]+)/.exec(u.pathname);
      if (m) return `https://www.youtube-nocookie.com/embed/${m[2]}`;
    }
    if (host === "vimeo.com") {
      const id = /^\/(\d+)/.exec(u.pathname)?.[1];
      if (id) return `https://player.vimeo.com/video/${id}`;
    }
    if (host === "player.vimeo.com") return u.toString();
    return null;
  } catch {
    return null;
  }
}

export const isStoragePath = (url?: string) => Boolean(url?.startsWith("storage:"));

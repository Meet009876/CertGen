/**
 * GET /api/proxy-asset?url=<encoded-url>
 *
 * Server-side proxy for fetching external assets (e.g. Dropbox URLs) that
 * would be blocked by CORS if requested directly from the browser.
 * The Next.js server fetches the resource server-to-server (no CORS restriction)
 * and streams the bytes back to the browser under the same origin.
 */
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const url = searchParams.get("url");

    if (!url) {
        return new Response("Missing 'url' query parameter", { status: 400 });
    }

    try {
        const upstream = await fetch(url, {
            // Follow redirects (Dropbox shared links do a 302 → CDN)
            redirect: "follow",
        });

        if (!upstream.ok) {
            return new Response(`Upstream error: ${upstream.status}`, { status: upstream.status });
        }

        const contentType = upstream.headers.get("Content-Type") ?? "application/octet-stream";

        return new Response(upstream.body, {
            status: 200,
            headers: {
                "Content-Type": contentType,
                // Allow browser to cache the proxied asset
                "Cache-Control": "private, max-age=300",
            },
        });
    } catch (err) {
        console.error("[proxy-asset] fetch error:", err);
        return new Response("Failed to fetch upstream resource", { status: 502 });
    }
}

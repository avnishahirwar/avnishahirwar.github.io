import { createMcpHandler } from "agents/mcp/server";
import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { handleAuthRequest, type AuthEnv } from "./auth";
import { handleBillingRequest } from "./billing";
import { handleContactRequest } from "./contact";

const SITE_URL = "https://avnishahirwar.github.io/";
const MAX_RESOURCE_BYTES = 20_000;
const RESOURCE_FETCH_TIMEOUT_MS = 8_000;

const publicSections = [
  { id: "book-store", label: "Book Store / Publications" },
  { id: "tools", label: "Smart Utility Tools" },
  { id: "google-reviews", label: "Reviews" },
  { id: "contact-form", label: "Contact" },
  { id: "connect-newsletter", label: "Social Links and Newsletter" },
  { id: "careers", label: "Careers" }
];

const publicLinks = [
  { label: "Official website", url: SITE_URL },
  { label: "Instagram", url: "https://www.instagram.com/avnish_ahirwar/" },
  { label: "LinkedIn", url: "https://www.linkedin.com/in/avnishahirwar415" },
  { label: "YouTube", url: "https://youtube.com/@avnishahirwar415" },
  { label: "Facebook", url: "https://www.facebook.com/avnishahirwar4" },
  { label: "Blog", url: "https://avnishahirwar415.blogspot.com/" },
  { label: "RSS feed", url: "https://avnishahirwar.github.io/feed.xml" },
  { label: "Sitemap", url: "https://avnishahirwar.github.io/sitemap.xml" }
];

function asText(value: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }]
  };
}

async function readLimitedText(response: Response, maxBytes: number) {
  if (!response.body) return "";

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let totalBytes = 0;
  let output = "";
  let truncated = false;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const remaining = maxBytes - totalBytes;
      if (value.byteLength > remaining) {
        if (remaining > 0) {
          output += decoder.decode(value.subarray(0, remaining), { stream: true });
        }
        truncated = true;
        await reader.cancel();
        break;
      }

      totalBytes += value.byteLength;
      output += decoder.decode(value, { stream: true });
    }
    output += decoder.decode();
  } finally {
    reader.releaseLock();
  }

  return truncated ? output + "\n[Truncated at " + maxBytes + " bytes]" : output;
}

function createServer() {
  const server = new McpServer({
    name: "avnish-ai-connector",
    version: "0.2.0"
  });

  server.registerTool(
    "get_public_site_profile",
    {
      title: "Get public website profile",
      description: "Returns basic public information about the Avnish Ahirwar official website. Read-only.",
      inputSchema: {}
    },
    async () =>
      asText({
        name: "Avnish Ahirwar",
        website: SITE_URL,
        pageTitle: "Avnish Ahirwar | Portfolio",
        description:
          "Official portfolio website containing biography, publications, smart utility tools, social links and contact sections.",
        access: "public website information only"
      })
  );

  server.registerTool(
    "list_public_site_sections",
    {
      title: "List public website sections",
      description: "Lists the public sections detected in the website source. Read-only.",
      inputSchema: {}
    },
    async () => asText({ website: SITE_URL, sections: publicSections })
  );

  server.registerTool(
    "get_public_social_links",
    {
      title: "Get public social links",
      description: "Returns social profile links published on the official website. Read-only.",
      inputSchema: {}
    },
    async () => asText({ links: publicLinks })
  );

  server.registerTool(
    "get_public_site_resource",
    {
      title: "Get public website resource",
      description:
        "Fetches one of the website's fixed public text resources. Only the listed same-site resources can be requested.",
      inputSchema: {
        resource: z.enum(["robots.txt", "sitemap.xml", "feed.xml"])
      }
    },
    async ({ resource }) => {
      try {
        const response = await fetch(new URL(resource, SITE_URL), {
          headers: { Accept: "text/plain, application/xml, application/rss+xml" },
          signal: AbortSignal.timeout(RESOURCE_FETCH_TIMEOUT_MS)
        });

        if (!response.ok) {
          return {
            isError: true,
            content: [{ type: "text" as const, text: `Could not fetch ${resource}: HTTP ${response.status}` }]
          };
        }

        const body = await readLimitedText(response, MAX_RESOURCE_BYTES);
        return { content: [{ type: "text" as const, text: body }] };
      } catch {
        return {
          isError: true,
          content: [{ type: "text" as const, text: `Could not fetch ${resource}: request failed or timed out` }]
        };
      }
    }
  );

  server.registerTool(
    "get_connector_capabilities",
    {
      title: "Get connector capabilities",
      description:
        "Explains the current connector stage and its security boundaries. Read-only.",
      inputSchema: {}
    },
    async () =>
      asText({
        connector: "Avnish AI",
        version: "0.2.0",
        stage: "read-only public-data connector",
        transport: "Streamable HTTP",
        endpoint: "/mcp",
        healthEndpoint: "/health",
        availableTools: [
          "get_public_site_profile",
          "list_public_site_sections",
          "get_public_social_links",
          "get_public_site_resource",
          "get_connector_capabilities"
        ],
        writeActionsEnabled: false,
        authenticationConfigured: false,
        authenticationMode: "public read-only only; OAuth required before private or write access",
        databaseConfigured: false,
        note:
          "This first release exposes public website information only. Enquiries, bookings, content changes, analytics and other private or write operations must wait for authenticated access, a database, consent rules and deployment configuration."
      })
  );

  return server;
}

const mcpHandler = createMcpHandler(createServer);

export default {
  async fetch(request: Request, env: AuthEnv & Parameters<typeof mcpHandler>[1], ctx: Parameters<typeof mcpHandler>[2]) {
    const authResponse = await handleAuthRequest(request, env);
    if (authResponse) return authResponse;
    const billingResponse = await handleBillingRequest(request, env);
    if (billingResponse) return billingResponse;
    const contactResponse = await handleContactRequest(request, env);
    if (contactResponse) return contactResponse;
    const url = new URL(request.url);

    if (url.pathname === "/" && (request.method === "GET" || request.method === "HEAD")) {
      return Response.json(
        {
          service: "avnish-ai-connector",
          status: "available",
          version: "0.2.0",
          endpoints: {
            health: "/health",
            mcp: "/mcp"
          },
          note: "The MCP endpoint requires an MCP-compatible client; opening it as a normal webpage is not a complete MCP test."
        },
        {
          headers: {
            "Cache-Control": "no-store",
            "X-Content-Type-Options": "nosniff"
          }
        }
      );
    }

    if (url.pathname === "/health") {
      if (request.method !== "GET" && request.method !== "HEAD") {
        return new Response("Method Not Allowed", {
          status: 405,
          headers: { Allow: "GET, HEAD" }
        });
      }

      return Response.json(
        {
          status: "ok",
          service: "avnish-ai-connector",
          version: "0.2.0",
          mode: "read-only-public-data",
          mcpEndpoint: "/mcp"
        },
        {
          headers: {
            "Cache-Control": "no-store",
            "X-Content-Type-Options": "nosniff"
          }
        }
      );
    }

    if (url.pathname !== "/mcp") {
      return new Response("Not Found", {
        status: 404,
        headers: { "X-Content-Type-Options": "nosniff" }
      });
    }

    return mcpHandler(request, env, ctx);
  }
};

import { createMcpHandler } from "agents/mcp/server";
import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";

const SITE_URL = "https://avnishahirwar.github.io/";

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

function createServer() {
  const server = new McpServer({
    name: "avnish-ai-connector",
    version: "0.1.0"
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
      const response = await fetch(new URL(resource, SITE_URL), {
        headers: { Accept: "text/plain, application/xml, application/rss+xml" }
      });

      if (!response.ok) {
        return {
          isError: true,
          content: [{ type: "text" as const, text: `Could not fetch ${resource}: HTTP ${response.status}` }]
        };
      }

      const body = await response.text();
      return {
        content: [
          {
            type: "text" as const,
            text: body.slice(0, 20000)
          }
        ]
      };
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
        version: "0.1.0",
        stage: "read-only scaffold",
        transport: "Streamable HTTP",
        endpoint: "/mcp",
        availableTools: [
          "get_public_site_profile",
          "list_public_site_sections",
          "get_public_social_links",
          "get_public_site_resource",
          "get_connector_capabilities"
        ],
        writeActionsEnabled: false,
        authenticationConfigured: false,
        databaseConfigured: false,
        note:
          "This first release exposes public website information only. Enquiries, bookings, content changes, analytics and other private or write operations must wait for authenticated access, a database, consent rules and deployment configuration."
      })
  );

  return server;
}

const handler = createMcpHandler(createServer);

export default {
  fetch: handler
};

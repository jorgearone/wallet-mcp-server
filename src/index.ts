import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { log } from "./helper/nodit-apidoc-helper.js";
import { registerAllTools } from "./tools/index.js";
import { registerWalletTools } from "./tools/wallet-tools.js"; // Nueva funcionalidad

async function main() {
  const server = new McpServer({
    name: "wallet-mcp-server",
    version: "1.0.0",
    capabilities: {
      resources: {},
      tools: {},
    },
  });

  // Registrar herramientas originales de Nodit (APIs blockchain)
  registerAllTools(server);
  
  // Registrar nuevas herramientas de wallet
  registerWalletTools(server);

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().then(() => {
  log("Wallet MCP Server (based on Nodit) started successfully.");
}).catch((error) => {
  log("Fatal error in main():", error);
  process.exit(1);
});

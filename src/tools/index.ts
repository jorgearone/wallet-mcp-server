import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerApiCategoriesTools } from "./api-categories.js";
import { registerNodeApiTools } from "./node-apis.js";
import { registerDataApiTools } from "./data-apis.js";
import { registerAptosIndexerTools } from "./aptos-indexer.js";
import { registerGetNoditApiSpecTool } from "./get-nodit-api-spec.js";
import { registerCallNoditApiTool } from "./call-nodit-api.js";
import { registerWalletTools } from "./wallet-tools.js"; // Nueva línea

export function registerAllTools(server: McpServer) {
  registerApiCategoriesTools(server);
  registerNodeApiTools(server);
  registerDataApiTools(server);
  registerAptosIndexerTools(server);
  registerGetNoditApiSpecTool(server);
  registerCallNoditApiTool(server);
  // registerWalletTools(server); // Se registra en index.ts principal
}

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createErrorResponse, log } from "../helper/nodit-apidoc-helper.js";
import { createTimeoutSignal } from "../helper/call-api-helper.js";
import { ethers } from "ethers";

const TIMEOUT_MS = 60_000;

export function registerWalletTools(server: McpServer) {
  
  server.tool(
    "get_wallet_balance_user_friendly",
    "Obtiene el balance de una billetera de forma amigable para usuarios normales",
    {
      address: z.string().describe("Dirección de la billetera (0x...)"),
      network: z.string().default("ethereum").describe("Red: ethereum, polygon, arbitrum, base")
    },
    async ({ address, network }) => {
      const toolName = "get_wallet_balance_user_friendly";
      
      try {
        // Validar dirección
        if (!ethers.isAddress(address)) {
          return createErrorResponse("La dirección proporcionada no es válida. Debe ser una dirección Ethereum válida (empezar con 0x)", toolName);
        }

        // Usar la infraestructura existente de Nodit
        const apiKey = process.env.NODIT_API_KEY;
        if (!apiKey) {
          return createErrorResponse("API Key de Nodit no configurada. Contacta al administrador.", toolName);
        }

        const { signal, cleanup } = createTimeoutSignal(TIMEOUT_MS);

        try {
          // Llamar a Nodit Data API usando la infraestructura existente
          const response = await fetch(
            `https://web3.nodit.io/v1/${network}/mainnet/getNativeBalanceByAccount`,
            {
              method: 'POST',
              headers: {
                'X-API-KEY': apiKey,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ accountAddress: address }),
              signal
            }
          );

          if (!response.ok) {
            throw new Error(`Error de la API de Nodit: ${response.statusText}`);
          }

          const data = await response.json();
          const balanceWei = data.balance || "0";
          const balanceEth = ethers.formatEther(balanceWei);
          const balanceNumber = parseFloat(balanceEth);

          // Formatear respuesta amigable
          let balanceText = "";
          if (balanceNumber === 0) {
            balanceText = "Sin balance";
          } else if (balanceNumber < 0.001) {
            balanceText = `${balanceNumber.toFixed(6)} ETH (menos de $1)`;
          } else {
            balanceText = `${balanceNumber.toFixed(4)} ETH`;
          }

          const networkName = network.charAt(0).toUpperCase() + network.slice(1);
          const shortAddress = `${address.slice(0, 6)}...${address.slice(-4)}`;

          const userFriendlyResponse = `🏦 **Balance de Billetera**

👤 Dirección: ${shortAddress}
🌐 Red: ${networkName}
💰 Balance: ${balanceText}

📋 **Información Técnica:**
- Dirección completa: ${address}
- Balance exacto: ${balanceEth} ETH
- En Wei: ${balanceWei}

${balanceNumber > 0 ? "✅ Esta billetera tiene fondos" : "⚠️ Esta billetera está vacía"}`;

          log(`Tool (${toolName}): Balance obtenido exitosamente para ${shortAddress} en ${network}`);
          return { content: [{ type: "text", text: userFriendlyResponse }] };

        } finally {
          cleanup();
        }

      } catch (error) {
        return createErrorResponse(
          `Error obteniendo balance: ${(error as Error).message}. Verifica que la dirección sea correcta y la red esté soportada.`,
          toolName
        );
      }
    }
  );

  server.tool(
    "get_wallet_transaction_history",
    "Muestra el historial de transacciones de una billetera de forma fácil de entender",
    {
      address: z.string().describe("Dirección de la billetera"),
      network: z.string().default("ethereum").describe("Red blockchain"),
      limit: z.number().default(5).max(20).describe("Número de transacciones a mostrar (máximo 20)")
    },
    async ({ address, network, limit }) => {
      const toolName = "get_wallet_transaction_history";
      
      try {
        if (!ethers.isAddress(address)) {
          return createErrorResponse("Dirección de billetera inválida", toolName);
        }

        const apiKey = process.env.NODIT_API_KEY;
        if (!apiKey) {
          return createErrorResponse("API Key de Nodit no configurada", toolName);
        }

        const { signal, cleanup } = createTimeoutSignal(TIMEOUT_MS);

        try {
          const response = await fetch(
            `https://web3.nodit.io/v1/${network}/mainnet/getTransactionsByAccount`,
            {
              method: 'POST',
              headers: {
                'X-API-KEY': apiKey,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ 
                accountAddress: address,
                limit: limit
              }),
              signal
            }
          );

          if (!response.ok) {
            throw new Error(`Error de la API: ${response.statusText}`);
          }

          const data = await response.json();
          const transactions = data.transactions || [];

          if (transactions.length === 0) {
            return {
              content: [{
                type: "text",
                text: `📭 **Sin Transacciones**

La billetera ${address.slice(0,6)}...${address.slice(-4)} no tiene transacciones registradas en ${network}.

Esto puede significar:
- Es una billetera nueva que nunca se ha usado
- No ha realizado transacciones en esta red específica
- Los datos aún se están indexando`
              }]
            };
          }

          // Formatear transacciones de forma amigable
          const formattedTransactions = transactions.slice(0, limit).map((tx: any, index: number) => {
            const date = new Date(parseInt(tx.timestamp) * 1000);
            const dateStr = date.toLocaleDateString('es-ES', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });

            const value = ethers.formatEther(tx.value || "0");
            const valueNum = parseFloat(value);
            
            const isOutgoing = tx.from?.toLowerCase() === address.toLowerCase();
            const direction = isOutgoing ? "📤 Enviado" : "📥 Recibido";
            const otherAddress = isOutgoing ? tx.to : tx.from;
            const shortOtherAddress = otherAddress ? `${otherAddress.slice(0,6)}...${otherAddress.slice(-4)}` : "Desconocido";

            let statusEmoji = "✅";
            if (tx.status === "0" || tx.status === false) {
              statusEmoji = "❌";
            }

            return `**${index + 1}. ${direction}**
   💰 Cantidad: ${valueNum.toFixed(4)} ETH
   ${isOutgoing ? "👤 Para:" : "👤 De:"} ${shortOtherAddress}
   📅 Fecha: ${dateStr}
   ${statusEmoji} Estado: ${tx.status === "0" ? "Falló" : "Exitoso"}
   🔗 Hash: ${tx.hash?.slice(0,12)}...`;
          }).join('\n\n');

          const shortAddress = `${address.slice(0,6)}...${address.slice(-4)}`;
          const networkName = network.charAt(0).toUpperCase() + network.slice(1);

          const response = `📊 **Historial de Transacciones**

👤 Billetera: ${shortAddress}
🌐 Red: ${networkName}
📈 Mostrando: ${Math.min(transactions.length, limit)} de ${transactions.length} transacciones

${formattedTransactions}

💡 **Tip:** Las transacciones más recientes aparecen primero`;

          return { content: [{ type: "text", text: response }] };

        } finally {
          cleanup();
        }

      } catch (error) {
        return createErrorResponse(
          `Error obteniendo historial: ${(error as Error).message}`,
          toolName
        );
      }
    }
  );

  server.tool(
    "explain_wallet_address",
    "Explica qué es una dirección de billetera y cómo validarla",
    {},
    async () => {
      const explanation = `🎓 **¿Qué es una Dirección de Billetera?**

Una dirección de billetera es como el "número de cuenta bancaria" de las criptomonedas.

📝 **Características:**
- Empieza con "0x" seguido de 40 caracteres
- Ejemplo: 0x742d35Cc6634C0532925a3b8D8ac9D67C15ce000
- Es pública y segura de compartir
- Cada red blockchain puede tener formatos diferentes

🔍 **Cómo Identificar una Dirección Válida:**
✅ Debe empezar con "0x"
✅ Debe tener exactamente 42 caracteres en total
✅ Solo contiene números (0-9) y letras (a-f, A-F)

❌ **Direcciones Inválidas:**
- Muy cortas o muy largas
- Sin el prefijo "0x"
- Con caracteres especiales como @, !, etc.

🛡️ **Seguridad:**
- NUNCA compartas tu clave privada
- Las direcciones son públicas y seguras
- Siempre verifica la dirección antes de enviar fondos

💡 **Tip:** Puedes usar esta herramienta para verificar balances y transacciones de cualquier dirección pública.`;

      return { content: [{ type: "text", text: explanation }] };
    }
  );
}

import "dotenv/config"
import { z } from "zod"
import colors from "yoctocolors"
import { input } from "@inquirer/prompts"

// Check if agents are available
async function checkAgentsAvailable(): Promise<boolean> {
  try {
    // Just check if the server responds on port 7576
    // Any response (even 404) means the server is running
    await fetch("http://localhost:7576/", {
      method: "GET",
      signal: AbortSignal.timeout(2000) // 2 second timeout
    })
    // If we get any response, the server is running
    return true
  } catch {
    // Connection refused or timeout means server is not running
    return false
  }
}

async function main() {
  console.log(colors.cyan("\n=== USDC to ETH Swap Demo (CLI) ==="))
  console.log(colors.gray("This CLI connects to the swap agents running on localhost"))
  console.log(colors.gray("Make sure the agents are running with: npm run agents:start\n"))
  
  // Check if agents are available
  const agentsAvailable = await checkAgentsAvailable()
  
  if (!agentsAvailable) {
    console.log(colors.red("❌ Agents are not running!"))
    console.log(colors.yellow("\nPlease start the agents first:"))
    console.log(colors.gray("  Run in another terminal: npm run agents:start"))
    console.log(colors.gray("  Or: tsx swap-agents-server.ts\n"))
    process.exit(1)
  }
  
  console.log(colors.green("✅ Agents are running and ready!"))
  console.log(colors.yellow("\nExchange USDC for ETH using the Swap Agent"))
  console.log(colors.gray("Current rate: 3000-4000 USDC per ETH"))
  console.log(colors.gray("Type /exit to quit\n"))

  while (true) {
    const userInput = await input({
      message: colors.cyan("Enter your request (e.g., 'swap 100 USDC for ETH'):")
    })

    if (userInput.trim().toLowerCase() === "/exit") {
      console.log(colors.blue("Goodbye!"))
      break
    }

    console.log(colors.green("\n>>> Processing request:"), userInput)

    try {
      const result = await fetch("http://localhost:7576/chat", {
        method: "POST",
        body: JSON.stringify({ message: userInput }),
        headers: {
          "Content-Type": "application/json"
        }
      })

      if (!result.ok) {
        console.log(colors.red("Error: Failed to communicate with agent"))
        console.log(colors.gray(`Status: ${result.status} ${result.statusText}`))
        continue
      }

      const responseSchema = z.object({ text: z.string() })
      const { text } = responseSchema.parse(await result.json())

      console.log(colors.green("\n>>> Result:"), text)
    } catch (error) {
      console.log(colors.red("\n>>> Error:"), error instanceof Error ? error.message : "Unknown error")
      console.log(colors.yellow("Make sure the agents are still running"))
    }
    
    console.log(colors.gray("\n" + "=".repeat(50) + "\n"))
  }
}

main().catch(console.error)

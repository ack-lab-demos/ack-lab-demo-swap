import "dotenv/config"
import { generateText, stepCountIs, tool } from "ai"
import { serveAgent, serveAuthedAgent } from "./serve-agent"
import { anthropic } from "@ai-sdk/anthropic"
import { z } from "zod"
import { AckLabSdk } from "@ack-hub/sdk"

// Configuration flag to decode and display JWT payloads
const DECODE_JWT = true

// Agent B SDK instance for payment handling
const agentBSdk = new AckLabSdk({
  baseUrl: "https://api.ack-lab.com",
  clientId: process.env.CLIENT_ID_AGENT_B!,
  clientSecret: process.env.CLIENT_SECRET_AGENT_B!
})

// Store pending swap requests and completed swaps
const pendingSwaps = new Map<string, { 
  usdcAmount: number; 
  paymentToken: string;
  ethAmount: number;
  exchangeRate: number;
}>()
const completedSwaps = new Set<string>()

// Mock function to get current exchange rate (USDC per ETH)
function getCurrentExchangeRate(): number {
  // Returns a rate between 3000 and 4000 USDC per ETH
  return Math.floor(Math.random() * 1000) + 3000
}

// Mock function to execute the swap
async function executeSwapOnDex(usdcAmount: number, exchangeRate: number): Promise<{
  success: boolean;
  ethReceived: number;
  txHash: string;
}> {
  // Simulate swap execution
  const ethAmount = usdcAmount / exchangeRate
  console.log(`🔄 Executing swap on DEX...`)
  console.log(`   USDC: ${usdcAmount}`)
  console.log(`   Rate: ${exchangeRate} USDC/ETH`)
  console.log(`   ETH: ${ethAmount.toFixed(6)}`)
  
  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  return {
    success: true,
    ethReceived: ethAmount,
    txHash: `0x${Math.random().toString(16).substring(2, 10)}...`
  }
}

// Mock function to send ETH to Agent A
async function sendEthToAgent(recipientAddress: string, ethAmount: number): Promise<{
  success: boolean;
  txHash: string;
}> {
  console.log(`💸 Sending ${ethAmount.toFixed(6)} ETH to ${recipientAddress}`)
  
  // Simulate transaction
  await new Promise(resolve => setTimeout(resolve, 500))
  
  return {
    success: true,
    txHash: `0x${Math.random().toString(16).substring(2, 10)}...`
  }
}

async function runAgentB(message: string) {
  const result = await generateText({
    model: anthropic("claude-sonnet-4-20250514"),
    system: `You are a swap agent that can exchange USDC for ETH. 
    
    When asked to swap USDC for ETH:
    1. First use the createSwapRequest tool to check the exchange rate and generate a payment request
    2. Return the EXACT paymentToken you receive (it will be a long string starting with "pay_")
    3. Tell the user the exchange rate and how much ETH they will receive
    4. Once they confirm payment with a receipt ID, use the executeSwap tool
    
    IMPORTANT: 
    - Always include the exact paymentToken in your response so the caller can pay
    - The payment amount should be in smallest unit (100 USDC = 10000 units)
    - Show the exchange rate clearly to the user
    
    For any requests that are not about swapping USDC to ETH, say 'I can only swap USDC for ETH'.`,
    prompt: message,
    tools: {
      createSwapRequest: tool({
        description: "Create a payment request for the USDC to ETH swap",
        inputSchema: z.object({
          usdcAmount: z.number().describe("Amount of USDC to swap"),
          recipientAddress: z.string().describe("ETH address to receive the swapped ETH").optional()
        }),
        execute: async ({ usdcAmount }) => {
          console.log(">>> Creating swap request for:", `${usdcAmount} USDC`)
          
          // Get current exchange rate
          const exchangeRate = getCurrentExchangeRate()
          const ethAmount = usdcAmount / exchangeRate
          
          // Create payment request for USDC amount (100 USDC = 10000 units)
          const paymentUnits = usdcAmount * 100
          const { paymentToken } = await agentBSdk.createPaymentRequest(
            paymentUnits,
            `Swap ${usdcAmount} USDC for ${ethAmount.toFixed(6)} ETH`
          )
          
          console.log(">>> Payment token generated:", paymentToken)
          console.log(">>> Exchange rate:", `${exchangeRate} USDC/ETH`)
          console.log(">>> Expected ETH:", `${ethAmount.toFixed(6)} ETH`)
          
          // Decode and display JWT payload if flag is enabled
          if (DECODE_JWT) {
            const tokenParts = paymentToken.split('.')
            if (tokenParts.length === 3) {
              try {
                const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString())
                console.log(">>> Decoded JWT payload:", JSON.stringify(payload, null, 2))
              } catch {
                console.log(">>> Could not decode payment token as JWT")
              }
            }
          }
          
          // Store the pending swap with details
          pendingSwaps.set(paymentToken, { 
            usdcAmount, 
            paymentToken,
            ethAmount,
            exchangeRate
          })
          
          return {
            paymentToken,
            usdcAmount,
            exchangeRate,
            ethAmount: ethAmount.toFixed(6),
            paymentRequired: paymentUnits,
            description: `Swap ${usdcAmount} USDC for ~${ethAmount.toFixed(6)} ETH at rate ${exchangeRate} USDC/ETH`,
            instruction: `Please pay ${usdcAmount} USDC (${paymentUnits} units) using this token to proceed with the swap`
          }
        }
      }),
      executeSwap: tool({
        description: "Execute the swap after payment is confirmed",
        inputSchema: z.object({
          paymentToken: z.string().describe("The payment token that was paid"),
          receiptId: z.string().describe("The receipt ID from the payment"),
          recipientAddress: z.string().describe("ETH address to send the swapped ETH").optional()
        }),
        execute: async ({ paymentToken, receiptId, recipientAddress = "0x742d35Cc6634C0532925a3b844Bc9e7595f" }) => {
          // Check if this payment token exists and hasn't been used
          const pendingSwap = pendingSwaps.get(paymentToken)
          if (!pendingSwap) {
            return { error: "Invalid or expired payment token" }
          }
          
          // Check if swap was already executed
          if (completedSwaps.has(paymentToken)) {
            return { error: "This swap has already been executed" }
          }
          
          // Execute the swap on mock DEX
          const swapResult = await executeSwapOnDex(pendingSwap.usdcAmount, pendingSwap.exchangeRate)
          
          if (!swapResult.success) {
            return { error: "Swap execution failed" }
          }
          
          // Send ETH to recipient
          const sendResult = await sendEthToAgent(recipientAddress, swapResult.ethReceived)
          
          if (!sendResult.success) {
            return { error: "Failed to send ETH" }
          }
          
          // Mark swap as completed
          completedSwaps.add(paymentToken)
          pendingSwaps.delete(paymentToken)
          
          return {
            success: true,
            usdcSwapped: pendingSwap.usdcAmount,
            ethReceived: swapResult.ethReceived.toFixed(6),
            exchangeRate: pendingSwap.exchangeRate,
            recipientAddress,
            swapTxHash: swapResult.txHash,
            sendTxHash: sendResult.txHash,
            receipt: receiptId
          }
        }
      })
    },
    stopWhen: stepCountIs(4)
  })

  return result.text
}

// Agent A SDK instance
const agentASdk = new AckLabSdk({
  baseUrl: "https://api.ack-lab.com",
  clientId: process.env.CLIENT_ID_AGENT_A!,
  clientSecret: process.env.CLIENT_SECRET_AGENT_A!
})

const callAgent = agentASdk.createAgentCaller("http://localhost:7577/chat")

async function runAgentA(message: string) {
  const result = await generateText({
    model: anthropic("claude-sonnet-4-20250514"),
    system: `You are a user who wants to swap USDC for ETH. You have USDC and want to exchange it for ETH using the Swap Agent.
    
    The Swap Agent will:
    1. Give you an exchange rate and calculate how much ETH you'll receive
    2. Provide a payment token for the USDC amount
    3. Execute the swap and send you ETH after payment
    
    When you receive a payment request:
    1. Extract the EXACT paymentToken from the response (it will be a long string)
    2. Use the executePayment tool with that EXACT paymentToken
    3. Send the payment receipt back to the Swap Agent to complete the swap
    
    Your ETH address is: 0x742d35Cc6634C0532925a3b844Bc9e7595f
    
    IMPORTANT: Always use the exact paymentToken provided by the Swap Agent.`,
    prompt: message,
    tools: {
      callSwapAgent: tool({
        description: "Call the Swap Agent to exchange USDC for ETH",
        inputSchema: z.object({
          message: z.string()
        }),
        execute: async ({ message }) => {
          console.log(">>>> Calling swap agent:", message)
          try {
            const response = await callAgent({ message })
            console.log(">>>> Swap agent response:", response)
            
            // Try to extract payment token from response for debugging
            const paymentTokenMatch = response.match(/pay_[a-zA-Z0-9]+/)
            if (paymentTokenMatch) {
              console.log(">>>> Detected payment token:", paymentTokenMatch[0])
            }
            
            return response
          } catch (error) {
            console.error(">>>> Error calling swap agent:", error)
            return {
              error: true,
              message: error instanceof Error ? error.message : "Unknown error"
            }
          }
        }
      }),
      executePayment: tool({
        description: "Execute a USDC payment using a payment token received from the Swap Agent",
        inputSchema: z.object({
          paymentToken: z.string().describe("The exact payment token received from the Swap Agent (usually starts with 'pay_' and is a long string)")
        }),
        execute: async ({ paymentToken }) => {
          console.log(">>>> Executing USDC payment for token:", paymentToken)
          console.log("    Token length:", paymentToken.length)
          console.log("    Token preview:", paymentToken.substring(0, 20) + "...")
          
          try {
            // Decode the payment token to see its contents if flag is enabled
            if (DECODE_JWT) {
              const tokenParts = paymentToken.split('.')
              if (tokenParts.length === 3) {
                try {
                  const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString())
                  console.log("    Decoded JWT payload:", JSON.stringify(payload, null, 2))
                } catch {
                  console.log("    Could not decode payment token as JWT")
                }
              }
            }
            
            const result = await agentASdk.executePayment(paymentToken)
            console.log(">>>> Payment successful! Receipt ID:", result.receipt.id)
            
            // The amount is returned as part of the result, not on the receipt itself
            const paidAmount = 100 * 100 // Default to expected amount for demo
            console.log("    Payment confirmed")
            
            return {
              success: true,
              receiptId: result.receipt.id,
              amount: paidAmount,
              usdcPaid: paidAmount / 100,
              message: "USDC payment completed successfully"
            }
          } catch (error) {
            console.error(">>>> Payment failed:", error)
            
            if (error instanceof Error) {
              console.error("    Error message:", error.message)
            }
            
            const errorWithResponse = error as { response?: { data?: unknown } }
            
            return {
              success: false,
              error: error instanceof Error ? error.message : "Payment failed",
              details: errorWithResponse.response?.data || (error instanceof Error ? error.message : undefined)
            }
          }
        }
      })
    },
    stopWhen: stepCountIs(8) // Increased to handle payment flow
  })

  return result.text
}

export function startAgentServers() {
  // Start Agent A server on port 7576
  serveAgent({
    port: 7576,
    runAgent: runAgentA
  })

  // Start Agent B server on port 7577
  serveAuthedAgent({
    port: 7577,
    runAgent: runAgentB,
    sdk: agentBSdk
  })

  console.log("✅ Agent servers started:")
  console.log("   - Agent A (User): http://localhost:7576")
  console.log("   - Agent B (Swap Service): http://localhost:7577")
  console.log("")
  console.log("The web UI can now communicate with these agents.")
}

// If this file is run directly, start the servers
if (import.meta.url === `file://${process.argv[1]}`) {
  startAgentServers()
}

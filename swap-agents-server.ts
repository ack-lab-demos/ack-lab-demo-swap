import "dotenv/config"
import { generateText, stepCountIs, tool } from "ai"
import { serveAgent, serveAuthedAgent } from "./serve-agent"
import { anthropic } from "@ai-sdk/anthropic"
import { z } from "zod"
import { AckLabSdk } from "@ack-hub/sdk"
import { HermesClient } from "@pythnetwork/hermes-client"
import { logger } from "./logger"

// Configuration flag to decode and display JWT payloads
const DECODE_JWT = process.env.DECODE_JWT !== 'false' // Default to true unless explicitly set to false

// Initialize Pyth Hermes client for real-time price data
const pythClient = new HermesClient("https://hermes.pyth.network", {})

// ETH/USD price ID from Pyth Network
const ETH_USD_PRICE_ID = "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace"

// Agent B SDK instance for payment handling

// const agentBSdk = new AckLabSdk({
//   baseUrl: "https://api.ack-lab.com",
//   clientId: process.env.CLIENT_ID_AGENT_B!,
//   clientSecret: process.env.CLIENT_SECRET_AGENT_B!
// })

const agentBSdk = new AckLabSdk({
  // baseUrl: "https://api.ack-lab.com",
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

// Get current ETH/USD exchange rate from Pyth Network
async function getCurrentExchangeRate(): Promise<number> {
  try {
    // Fetch the latest price update for ETH/USD
    const priceUpdates = await pythClient.getLatestPriceUpdates([ETH_USD_PRICE_ID])
    
    if (priceUpdates && priceUpdates.parsed && priceUpdates.parsed.length > 0) {
      const ethPriceData = priceUpdates.parsed[0]
      
      // Pyth returns price with an exponent, so we need to calculate the actual price
      // price = ethPriceData.price.price * 10^ethPriceData.price.expo
      const price = Number(ethPriceData.price.price) * Math.pow(10, ethPriceData.price.expo)
      
      logger.market('Fetched ETH/USD price from Pyth', {
        'Price': `$${price.toFixed(2)}`,
        'Confidence': `±$${(Number(ethPriceData.price.conf) * Math.pow(10, ethPriceData.price.expo)).toFixed(2)}`,
        'Updated': new Date(ethPriceData.price.publish_time * 1000).toISOString()
      })
      
      // Return the price rounded to 2 decimal places
      // Since USDC is pegged to USD, ETH/USD price is effectively USDC/ETH
      return Math.round(price * 100) / 100
    }
    
    // Fallback if no price data is available
    logger.warn('No price data available from Pyth, using fallback price')
    return 3500 // Fallback price
    
  } catch (error) {
    logger.error('Error fetching price from Pyth', error)
    logger.info('Using fallback price of $3500')
    return 3500 // Fallback price in case of error
  }
}

// Mock function to execute the swap
async function executeSwapOnDex(usdcAmount: number, exchangeRate: number): Promise<{
  success: boolean;
  ethReceived: number;
  txHash: string;
}> {
  // Simulate swap execution
  const ethAmount = usdcAmount / exchangeRate
  logger.swap('Executing swap on DEX', {
    'USDC Amount': usdcAmount,
    'Exchange Rate': `${exchangeRate} USDC/ETH`,
    'ETH Amount': ethAmount.toFixed(6)
  })
  
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
  logger.transaction('Sending ETH', {
    'Amount': `${ethAmount.toFixed(6)} ETH`,
    'Recipient': recipientAddress
  })
  
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
    2. Return the EXACT paymentToken you receive (it will be a long string)
    3. Tell the user the exchange rate and how much ETH they will receive
    4. Once they confirm payment with a receipt ID, use the executeSwap tool. NO need to ask them for their ETH address if they already provided it.
    
    IMPORTANT: 
    - Always include the exact paymentToken in your response so the caller can pay
    - The payment amount should be in cents (100 USDC = 10000 cents)
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
          logger.process('Creating swap request', { 'Amount': `${usdcAmount} USDC` })
          
          // Get current exchange rate from Pyth
          const exchangeRate = await getCurrentExchangeRate()
          const ethAmount = usdcAmount / exchangeRate
          
          // Create payment request for USDC amount (100 USDC = 10000 units)
          const paymentUnits = usdcAmount * 100
          const { paymentToken } = await agentBSdk.createPaymentRequest(
            paymentUnits,
            `Swap ${usdcAmount} USDC for ${ethAmount.toFixed(6)} ETH`
          )
          
          logger.transaction('Payment token generated', {
            'Token': paymentToken,
            'Exchange rate': `${exchangeRate} USDC/ETH`,
            'Expected ETH': `${ethAmount.toFixed(6)} ETH`
          })
          
          // Decode and display JWT payload if flag is enabled
          if (DECODE_JWT && paymentToken) {
            const tokenParts = paymentToken.split('.')
            if (tokenParts.length === 3) {
              try {
                const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString())
                logger.debug('Decoded payment token JWT payload', payload)
              } catch (err) {
                logger.warn('Could not decode payment token as JWT', String(err))
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
// const agentASdk = new AckLabSdk({
//   baseUrl: "https://api.ack-lab.com",
//   clientId: process.env.CLIENT_ID_AGENT_A!,
//   clientSecret: process.env.CLIENT_SECRET_AGENT_A!
// })

const agentASdk = new AckLabSdk({
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
    3. After successful payment, send the receiptId back to the Swap Agent with a message like: "Payment completed successfully. Receipt ID: [INSERT_RECEIPT_ID_HERE]. Payment token: [INSERT_PAYMENT_TOKEN_HERE]. Please proceed with sending ETH to ETH_ADDRESS_HERE."
    
    Your ETH address is: 0x742d35Cc6634C0532925a3b844Bc9e7595f
    
    IMPORTANT: 
    - Always use the exact paymentToken provided by the Swap Agent
    - Always include the receiptId from the payment result when confirming payment to the Swap Agent`,
    prompt: message,
    tools: {
      callSwapAgent: tool({
        description: "Call the Swap Agent to exchange USDC for ETH",
        inputSchema: z.object({
          message: z.string()
        }),
        execute: async ({ message }) => {
          logger.agent('Calling swap agent', message)
          try {
            const response = await callAgent({ message })
            logger.agent('Swap agent response', response)
            
            // Try to extract payment token from response for debugging
            const paymentTokenMatch = response.match(/pay_[a-zA-Z0-9]+/)
            if (paymentTokenMatch) {
              logger.debug('Detected payment token', paymentTokenMatch[0])
            }
            
            return response
          } catch (error) {
            logger.error('Error calling swap agent', error)
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
          paymentToken: z.string().describe("The exact payment token received from the Swap Agent")
        }),
        execute: async ({ paymentToken }) => {
          logger.transaction('Executing USDC payment', {
            'Token length': paymentToken.length,
            'Token': paymentToken.length > 100 ? paymentToken.substring(0, 100) + '...' : paymentToken
          })
          
          try {
            // Decode the payment token to see its contents if flag is enabled
            if (DECODE_JWT && paymentToken) {
              const tokenParts = paymentToken.split('.')
              if (tokenParts.length === 3) {
                try {
                  const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString())
                  logger.debug('Payment token JWT payload (before execution)', payload)
                } catch (err) {
                  logger.warn('Could not decode payment token as JWT', String(err))
                }
              }
            }
            
            const result = await agentASdk.executePayment(paymentToken)
            
            // The receipt is a JWT string, not an object with an id property
            const receiptJwt = result.receipt
            logger.success('Payment successful!', `Receipt ID: ${receiptJwt}`)
            
            // Decode the receipt JWT to see its contents if flag is enabled
            if (DECODE_JWT && receiptJwt) {
              const tokenParts = receiptJwt.split('.')
              if (tokenParts.length === 3) {
                try {
                  const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString())
                  logger.debug('Payment receipt JWT payload', payload)
                } catch (err) {
                  logger.warn('Could not decode payment receipt as JWT', String(err))
                }
              }
            }
            
            // The amount is returned as part of the result, not on the receipt itself
            const paidAmount = 100 * 100 // Default to expected amount for demo
            logger.info('Payment confirmed')
            
            return {
              success: true,
              receiptId: receiptJwt,
              amount: paidAmount,
              usdcPaid: paidAmount / 100,
              message: "USDC payment completed successfully"
            }
          } catch (error) {
            logger.error('Payment failed', error)
            
            if (error instanceof Error) {
              logger.error('Error details', error.message)
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
  logger.section('STARTING AGENT SERVERS')
  
  // Start Agent A server on port 7576
  serveAgent({
    port: 7576,
    runAgent: runAgentA,
    decodeJwt: DECODE_JWT
  })

  // Start Agent B server on port 7577
  serveAuthedAgent({
    port: 7577,
    runAgent: runAgentB,
    sdk: agentBSdk,
    decodeJwt: DECODE_JWT
  })

  logger.success('Agent servers started')
  logger.server('Agent A (User)', 'http://localhost:7576')
  logger.server('Agent B (Swap Service)', 'http://localhost:7577')
  logger.raw('', 'after')
  logger.info('The web UI can now communicate with these agents')
  logger.separator()
}

// If this file is run directly, start the servers
if (import.meta.url === `file://${process.argv[1]}`) {
  startAgentServers()
}

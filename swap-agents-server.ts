import "dotenv/config"
import { generateText, stepCountIs, tool } from "ai"
import { serveAgent, serveAuthedAgent } from "./serve-agent"
import { anthropic } from "@ai-sdk/anthropic"
import { z } from "zod"
import { AckLabSdk } from "@ack-lab/sdk"
import { HermesClient } from "@pythnetwork/hermes-client"
import { logger } from "./logger"

// Configuration flag to decode and display JWT payloads
const DECODE_JWT = process.env.DECODE_JWT !== 'false' // Default to true unless explicitly set to false

// Initialize Pyth Hermes client for real-time price data
const pythClient = new HermesClient("https://hermes.pyth.network", {})

// SOL/USD price ID from Pyth Network
const SOL_USD_PRICE_ID = "0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d"

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
  solAmount: number;
  exchangeRate: number;
}>()
const completedSwaps = new Set<string>()

// Get current SOL/USD exchange rate from Pyth Network
async function getCurrentExchangeRate(): Promise<number> {
  try {
    // Fetch the latest price update for SOL/USD
    const priceUpdates = await pythClient.getLatestPriceUpdates([SOL_USD_PRICE_ID])
    
    if (priceUpdates && priceUpdates.parsed && priceUpdates.parsed.length > 0) {
      const solPriceData = priceUpdates.parsed[0]
      
      // Pyth returns price with an exponent, so we need to calculate the actual price
      // price = solPriceData.price.price * 10^solPriceData.price.expo
      const price = Number(solPriceData.price.price) * Math.pow(10, solPriceData.price.expo)
      
      logger.market('Fetched SOL/USD price from Pyth', {
        'Price': `$${price.toFixed(2)}`,
        'Confidence': `±$${(Number(solPriceData.price.conf) * Math.pow(10, solPriceData.price.expo)).toFixed(2)}`,
        'Updated': new Date(solPriceData.price.publish_time * 1000).toISOString()
      })
      
      // Return the price rounded to 2 decimal places
      // Since USDC is pegged to USD, SOL/USD price is effectively USDC/SOL
      return Math.round(price * 100) / 100
    }
    
    // Fallback if no price data is available
    logger.warn('No price data available from Pyth, using fallback price')
    return 150 // Fallback price
    
  } catch (error) {
    logger.error('Error fetching price from Pyth', error)
    logger.info('Using fallback price of $150')
    return 150 // Fallback price in case of error
  }
}

// Mock function to execute the swap
async function executeSwapOnDex(usdcAmount: number, exchangeRate: number): Promise<{
  success: boolean;
  solReceived: number;
  txHash: string;
}> {
  // Simulate swap execution
  const solAmount = usdcAmount / exchangeRate
  logger.swap('Executing swap on DEX', {
    'USDC Amount': usdcAmount,
    'Exchange Rate': `${exchangeRate} USDC/SOL`,
    'SOL Amount': solAmount.toFixed(6)
  })
  
  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  return {
    success: true,
    solReceived: solAmount,
    txHash: `0x${Math.random().toString(16).substring(2, 10)}...`
  }
}

// Mock function to send SOL to Agent A
async function sendSolToAgent(recipientAddress: string, solAmount: number): Promise<{
  success: boolean;
  txHash: string;
}> {
  logger.transaction('Sending SOL', {
    'Amount': `${solAmount.toFixed(6)} SOL`,
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
    system: `You are a swap agent that can exchange USDC for SOL. 
    
    When asked to swap USDC for SOL:
    1. First use the createSwapRequest tool to check the exchange rate and generate a payment request
    2. Return the payment token in a STRUCTURED format like this:
       
       <payment_token>
       [INSERT_EXACT_PAYMENT_TOKEN_HERE]
       </payment_token>
       
    3. Tell the user the exchange rate and how much SOL they will receive
    4. Once they confirm payment with a payment receipt (JWT string), use the executeSwap tool with that receipt. NO need to ask them for their SOL address if they already provided it.
    
    IMPORTANT: 
    - ALWAYS wrap the payment token between <payment_token> and </payment_token> markers
    - The payment receipt you receive should also be in a structured format (between markers)
    - Extract the ENTIRE content between the markers, including all characters
    - The payment receipt is a JWT that contains the payment token and other payment details
    - The payment amount should be in cents (100 USDC = 10000 cents)
    - Show the exchange rate clearly to the user
    
    For any requests that are not about swapping USDC to SOL, say 'I can only swap USDC for SOL'.`,
    prompt: message,
    tools: {
      createSwapRequest: tool({
        description: "Create a payment request for the USDC to SOL swap",
        inputSchema: z.object({
          usdcAmount: z.number().describe("Amount of USDC to swap"),
          recipientAddress: z.string().describe("SOL address to receive the swapped SOL").optional()
        }),
        execute: async ({ usdcAmount }) => {
          logger.process('Creating swap request', { 'Amount': `${usdcAmount} USDC` })
          
          // Get current exchange rate from Pyth
          const exchangeRate = await getCurrentExchangeRate()
          const solAmount = usdcAmount / exchangeRate
          
          // Create payment request for USDC amount (100 USDC = 10000 units)
          const paymentUnits = usdcAmount * 100
          const { paymentToken } = await agentBSdk.createPaymentRequest(
            paymentUnits,
            `Swap ${usdcAmount} USDC for ${solAmount.toFixed(6)} SOL`
          )
          
          logger.transaction('Payment token generated', {
            'Token': paymentToken,
            'Exchange rate': `${exchangeRate} USDC/SOL`,
            'Expected SOL': `${solAmount.toFixed(6)} SOL`
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
            solAmount,
            exchangeRate
          })
          
          return {
            paymentToken,
            usdcAmount,
            exchangeRate,
            solAmount: solAmount.toFixed(6),
            paymentRequired: paymentUnits,
            description: `Swap ${usdcAmount} USDC for ~${solAmount.toFixed(6)} SOL at rate ${exchangeRate} USDC/SOL`,
            instruction: `Please pay ${usdcAmount} USDC (${paymentUnits} units) using this token to proceed with the swap`
          }
        }
      }),
      executeSwap: tool({
        description: "Execute the swap after payment is confirmed",
        inputSchema: z.object({
          paymentReceipt: z.string().describe("The payment receipt JWT from the payment"),
          recipientAddress: z.string().describe("SOL address to send the swapped SOL").optional()
        }),
        execute: async ({ paymentReceipt, recipientAddress = "7VQo3HWesNfBys5VXJF3NcE5JCBsRs25pAoBxD5MJYGp" }) => {
          // Extract receipt from structured format if it's wrapped in markers
          let actualReceipt = paymentReceipt;
          
          // Check if receipt is in structured format
          const structuredMatch = paymentReceipt.match(/===\s*PAYMENT RECEIPT START\s*===\s*([\s\S]*?)\s*===\s*PAYMENT RECEIPT END\s*===/);
          if (structuredMatch) {
            actualReceipt = structuredMatch[1].trim();
            logger.debug('Extracted receipt from structured format', { length: actualReceipt.length })
          }
          
          // Decode the payment receipt JWT to extract the payment token
          let paymentToken: string;
          let receiptId: string | undefined;
          
          try {
            const receiptParts = actualReceipt.split('.')
            if (receiptParts.length !== 3) {
              return { error: "Invalid payment receipt format" }
            }
            
            const payload = JSON.parse(Buffer.from(actualReceipt.split('.')[1], 'base64').toString())
            
            // Extract payment token from the receipt's credentialSubject
            paymentToken = payload.vc?.credentialSubject?.paymentToken
            if (!paymentToken) {
              return { error: "Payment token not found in receipt" }
            }
            
            // Extract receipt ID (jti field in the JWT)
            receiptId = payload.jti
            
            // Log decoded receipt if debugging is enabled
            if (DECODE_JWT) {
              logger.debug('Decoded payment receipt', {
                paymentToken: paymentToken.substring(0, 50) + '...',
                receiptId,
                subject: payload.sub,
                issuer: payload.iss
              })
            }
          } catch (err) {
            logger.error('Failed to decode payment receipt', String(err))
            return { error: "Failed to decode payment receipt" }
          }
          
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
          
          // Send SOL to recipient
          const sendResult = await sendSolToAgent(recipientAddress, swapResult.solReceived)
          
          if (!sendResult.success) {
            return { error: "Failed to send SOL" }
          }
          
          // Mark swap as completed
          completedSwaps.add(paymentToken)
          pendingSwaps.delete(paymentToken)
          
          return {
            success: true,
            usdcSwapped: pendingSwap.usdcAmount,
            solReceived: swapResult.solReceived.toFixed(6),
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
    system: `You are a user who wants to swap USDC for SOL. You have USDC and want to exchange it for SOL using the Swap Agent.
    
    The Swap Agent will:
    1. Give you an exchange rate and calculate how much SOL you'll receive
    2. Provide a payment token in a structured format between <payment_token> and </payment_token> markers
    3. Execute the swap and send you SOL after payment
    
    When you receive a payment request:
    1. Look for the payment token between <payment_token> and </payment_token> markers
    2. Extract the ENTIRE content between these markers (it will be a long JWT string)
    3. Use the executePayment tool with that EXACT paymentToken
    4. After successful payment, send the receipt back in a STRUCTURED format:
       
       Payment completed successfully. 
       
       <payment_receipt>
       [INSERT_FULL_RECEIPT_JWT_HERE]
       </payment_receipt>
       
       Please proceed with sending SOL to 7VQo3HWesNfBys5VXJF3NcE5JCBsRs25pAoBxD5MJYGp
    
    Your Solana address is: 7VQo3HWesNfBys5VXJF3NcE5JCBsRs25pAoBxD5MJYGp
    
    IMPORTANT: 
    - ALWAYS extract the payment token from between the <payment_token> and </payment_token> markers
    - ALWAYS send the receipt between <payment_receipt> and </payment_receipt> markers
    - Include EVERY character of the tokens/receipts - they are long JWT strings
    - If the payment fails, do NOT try with a smaller amount
    - The payment receipt contains the payment token and proof of payment`,
    prompt: message,
    tools: {
      callSwapAgent: tool({
        description: "Call the Swap Agent to exchange USDC for SOL",
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
              receipt: receiptJwt,  // Return the full receipt JWT
              receiptId: receiptJwt,  // Keep for backward compatibility
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

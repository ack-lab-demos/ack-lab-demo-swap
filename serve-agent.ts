import { serve } from "@hono/node-server"
import { vValidator } from "@hono/valibot-validator"
import { Hono, type TypedResponse } from "hono"
import * as v from "valibot"
import { type JwtString } from "agentcommercekit"
import { jwtStringSchema } from "agentcommercekit/schemas/valibot"
import type { AckLabSdk } from "@ack-hub/sdk"
import { logger } from "./logger"

// Configuration - set to true to decode and display JWT payloads
const DECODE_JWT = process.env.DECODE_JWT !== 'false' // Default to true unless explicitly set to false

type AgentFn = (prompt: string) => Promise<string>

interface ServeAgentConfig {
  runAgent: AgentFn
  port: number
  decodeJwt?: boolean  // Optional flag to decode JWT tokens
}

interface ServeAuthedAgentConfig extends ServeAgentConfig {
  sdk: AckLabSdk
  decodeJwt?: boolean  // Optional flag to decode JWT tokens
}

export function serveAuthedAgent({
  port,
  runAgent,
  sdk,
  decodeJwt = DECODE_JWT
}: ServeAuthedAgentConfig) {
  logger.info('Starting authenticated agent server...')

  const agentHandler = sdk.createRequestHandler(runAgent)

  const app = new Hono()

  // Custom middleware for HTTP logging
  app.use("*", async (c, next) => {
    const start = Date.now()
    await next()
    const time = Date.now() - start
    logger.http(c.req.method, c.req.path, c.res.status, `${time}ms`)
  })
  
  // Root endpoint with agent information
  app.get("/", (c) => {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Agent Commerce Kit - Authenticated Agent</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 2rem;
            background: #f8f9fa;
            color: #333;
        }
        .header {
            text-align: center;
            margin-bottom: 2rem;
            padding: 2rem;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .info-card {
            background: white;
            padding: 1.5rem;
            margin: 1rem 0;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .endpoint {
            background: #f1f3f4;
            padding: 0.5rem 1rem;
            border-radius: 4px;
            font-family: 'Monaco', 'Courier New', monospace;
            margin: 0.5rem 0;
        }
        .status {
            display: inline-block;
            padding: 0.25rem 0.75rem;
            background: #28a745;
            color: white;
            border-radius: 20px;
            font-size: 0.875rem;
            font-weight: 500;
        }
        code {
            background: #f1f3f4;
            padding: 0.2rem 0.4rem;
            border-radius: 3px;
            font-family: 'Monaco', 'Courier New', monospace;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🤖 Agent Commerce Kit</h1>
        <p>Authenticated Agent Server</p>
        <span class="status">Running on Port ${port}</span>
    </div>
    
    <div class="info-card">
        <h2>📡 Available Endpoints</h2>
        <div class="endpoint">
            <strong>POST /chat</strong> - Send authenticated requests with JWT tokens
        </div>
        <p>This agent requires JWT authentication for all chat interactions.</p>
    </div>
    
    <div class="info-card">
        <h2>🔐 Authentication</h2>
        <p>This server uses the Agent Commerce Kit SDK for secure, authenticated agent interactions.</p>
        <p>Send requests to <code>/chat</code> with a JSON payload containing a valid JWT token:</p>
        <pre style="background: #f8f9fa; padding: 1rem; border-radius: 4px; overflow-x: auto;">
{
  "jwt": "your-jwt-token-here"
}</pre>
    </div>
    
    <div class="info-card">
        <h2>🚀 Usage</h2>
        <p>This agent server is designed to handle secure commerce and transaction operations through authenticated API calls.</p>
        <p>The agent processes your requests and returns responses in JWT format for secure communication.</p>
    </div>
</body>
</html>
    `
    return c.html(html)
  })
  
  app.post(
    "/chat",
    vValidator("json", v.object({ jwt: jwtStringSchema })),
    async (c): Promise<TypedResponse<{ jwt: JwtString }>> => {
      const { jwt } = c.req.valid("json")

      logger.incoming('JWT Request', jwt)
      
      // Decode and display JWT payload if flag is enabled
      if (decodeJwt && jwt) {
        try {
          const tokenParts = jwt.split('.')
          if (tokenParts.length === 3) {
            const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString())
            logger.debug('Incoming JWT payload', payload)
          }
        } catch (err) {
          logger.warn('Could not decode incoming JWT', String(err))
        }
      }

      try {
        const result = await agentHandler(jwt)
        
        // Decode response JWT if present
        if (decodeJwt && result?.jwt) {
          try {
            const tokenParts = result.jwt.split('.')
            if (tokenParts.length === 3) {
              const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString())
              logger.debug('Outgoing JWT payload', payload)
            }
          } catch (err) {
            logger.warn('Could not decode outgoing JWT', String(err))
          }
        }
        
        logger.outgoing('JWT Response', result?.jwt || 'Sent JWT response')

        return c.json(result)
      } catch (error) {
        logger.error('Failed to handle JWT request', error)
        throw error
      }
    }
  )

  serve({
    fetch: app.fetch,
    port
  })
}

export function serveAgent({ port, runAgent, decodeJwt = DECODE_JWT }: ServeAgentConfig) {
  logger.info('Starting simple agent server...')

  const app = new Hono()
  
  // Custom middleware for HTTP logging
  app.use("*", async (c, next) => {
    const start = Date.now()
    await next()
    const time = Date.now() - start
    logger.http(c.req.method, c.req.path, c.res.status, `${time}ms`)
  })
  
  // Root endpoint with agent information
  app.get("/", (c) => {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Agent Commerce Kit - Simple Agent</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 2rem;
            background: #f8f9fa;
            color: #333;
        }
        .header {
            text-align: center;
            margin-bottom: 2rem;
            padding: 2rem;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .info-card {
            background: white;
            padding: 1.5rem;
            margin: 1rem 0;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .endpoint {
            background: #f1f3f4;
            padding: 0.5rem 1rem;
            border-radius: 4px;
            font-family: 'Monaco', 'Courier New', monospace;
            margin: 0.5rem 0;
        }
        .status {
            display: inline-block;
            padding: 0.25rem 0.75rem;
            background: #28a745;
            color: white;
            border-radius: 20px;
            font-size: 0.875rem;
            font-weight: 500;
        }
        code {
            background: #f1f3f4;
            padding: 0.2rem 0.4rem;
            border-radius: 3px;
            font-family: 'Monaco', 'Courier New', monospace;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🤖 Agent Commerce Kit</h1>
        <p>Simple Agent Server</p>
        <span class="status">Running on Port ${port}</span>
    </div>
    
    <div class="info-card">
        <h2>📡 Available Endpoints</h2>
        <div class="endpoint">
            <strong>POST /chat</strong> - Send messages directly to the agent
        </div>
        <p>This is a simple agent that accepts plain text messages without authentication.</p>
    </div>
    
    <div class="info-card">
        <h2>💬 Usage</h2>
        <p>Send requests to <code>/chat</code> with a JSON payload containing your message:</p>
        <pre style="background: #f8f9fa; padding: 1rem; border-radius: 4px; overflow-x: auto;">
{
  "message": "Hello, agent!"
}</pre>
        <p>The agent will process your message and return a response in the following format:</p>
        <pre style="background: #f8f9fa; padding: 1rem; border-radius: 4px; overflow-x: auto;">
{
  "text": "Agent response here"
}</pre>
    </div>
    
    <div class="info-card">
        <h2>🚀 About</h2>
        <p>This is a simple agent server that processes text messages and returns responses.</p>
        <p>Perfect for testing and development purposes without the complexity of authentication.</p>
    </div>
</body>
</html>
    `
    return c.html(html)
  })
  
  app.post(
    "/chat",
    vValidator("json", v.object({ message: v.string() })),
    async (c) => {
      const { message } = c.req.valid("json")

      logger.incoming('Message', message)
      
      // Check if message contains JWT tokens and decode them if flag is enabled
      if (decodeJwt && message) {
        // Look for JWT-like patterns in the message
        const jwtPattern = /\b[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\b/g
        const matches = message.match(jwtPattern)
        if (matches) {
          matches.forEach((token, index) => {
            try {
              const tokenParts = token.split('.')
              if (tokenParts.length === 3) {
                const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString())
                logger.debug(`JWT token #${index + 1} in message`, payload)
              }
            } catch {
              // Not a valid JWT, skip
            }
          })
        }
      }

      try {
        const text = await runAgent(message)
        
        logger.outgoing('Response', text)

        return c.json({ text })
      } catch (error) {
        logger.error('Failed to process message', error)
        throw error
      }
    }
  )

  serve({
    fetch: app.fetch,
    port
  })
}
# ACK USDC to SOL Swap Demo

![Agent Commerce Kit](./assets/README-Header.png)

[![Run on Replit](https://replit.com/badge?caption=Run%20on%20Replit)](https://replit.new/github.com/catena-labs/ack-swap-demo)

[Explore ACK-Lab Developer Preview](https://ack-lab.catenalabs.com)

A demonstration of secure agent-to-agent commerce using the Agent Commerce Kit (ACK), showcasing how autonomous AI agents can negotiate and execute USDC to SOL swaps with built-in authentication and payment processing.

> ⚠️ **Disclaimer**: This is a **vibe-coded demonstration example** created to showcase ACK capabilities. Unlike ACK-Lab and other production components, this demo hasn't undergone extensive testing or security audits. It's designed for educational purposes to help developers understand agent-to-agent commerce patterns.

This demo showcases agent-to-agent communication using the ACK Lab SDK. It 
demonstrates how AI agents collaborate to execute cryptocurrency swaps, with 
one agent (Swap User) representing a user who wants to swap USDC for SOL, and 
another agent (Swap Service) providing the swap service.

### Prerequisites

To run this demo, you need to:

1. **Sign up for ACK-Lab Developer Preview** at [ack-lab.catenalabs.com](https://ack-lab.catenalabs.com)
2. If you have not done so already in ACK-Lab, **register your agents** to obtain credentials.(see [Registering Your Agents on ACK-Lab](#registering-your-agents-on-ack-lab) below)
3. **Get an Anthropic API key** from [console.anthropic.com](https://console.anthropic.com) Note: This demo requires `claude-sonnet-4-20250514`. We cannot guarantee it works end-to-end with smaller models from Anthropic or other providers.
4. **Save your Secrets in Replit** (see [Quick Start on Replit](#quick-start-on-replit))


When you're done, click "Run" at the top of your screen to get started.

<div align="center">
  <img src="./assets/replit-run-icon.png" alt="Get Started on Replit" width="100">
</div>

## Registering Your Agents on ACK-Lab
ACK-Lab makes it easy for you to register some demo agents for this flow.

   **Follow these steps on ACK-Lab to create your agents and get the necessary API keys**. You will have to generate the keys for your first agent, enter them in .env or Replit Secrets, then do the same for the second agent:
   <div align="center">
      <img src="./assets/instructions-screenshots/swap_demo_1.png" width="50%" style="display: block; margin-bottom: 10px;">
      <img src="./assets/instructions-screenshots/swap_demo_2.png" width=50%" style="display: block; margin-bottom: 10px;">
      <img src="./assets/instructions-screenshots/swap_demo_4.png" width="50%" style="display: block; margin-bottom: 10px;">
      <img src="./assets/instructions-screenshots/swap_demo_5.png" width="50%" style="display: block; margin-bottom: 10px;">
      <img src="./assets/instructions-screenshots/swap_demo_6.png" width="50%" style="display: block; margin-bottom: 10px;">
   </div>


## 🔐 Agent Commerce Kit Integration

This demo leverages the **Agent Commerce Kit (ACK)** to enable secure, robust transactions between autonomous agents. ACK provides enterprise-grade infrastructure for agent commerce through two core components:

### ACK-ID (Identity & Authentication)
- **Secure Agent Identity**: Each agent receives unique credentials (CLIENT_ID and CLIENT_SECRET) that serve as their digital identity
- **Credential Management**: Handles authentication tokens and secure credential exchange between agents
- **Trust Framework**: Ensures only authorized agents can participate in transactions

### ACK-Pay (Payment Processing)
- **Secure Transactions**: Processes payments between agents with built-in security and compliance
- **Payment Request Tokens**: Generates cryptographically secure payment request tokens for transaction authorization
- **Settlement**: Handles the financial settlement between agent wallets

### ack-lab SDK
The `@ack-lab/sdk` npm package abstracts the complexity of credential exchange and payment processing, providing:
- **Simple API Interface**: Clean methods for agent authentication and payment operations
- **Built-in Security**: Automatic handling of JWT tokens, signatures, and encryption
- **Agent Communication**: `createAgentCaller()` method for establishing secure agent-to-agent connections
- **Transaction Safety**: Ensures atomicity and reliability of financial operations

## 📚 Interactive Tutorial Mode

The swap demo includes an **educational onboarding guide** that teaches developers how to use ACK-Lab's powerful rule system through hands-on experience:

### Tutorial Flow

1. **Step 1: Initial Swap** - Execute a successful 25 USDC to SOL swap with no restrictions
2. **Step 2: Transaction Limits** - Learn to set a $10 maximum transaction size rule in ACK-Lab
3. **Step 3: Rule Enforcement** - See how the same swap is now blocked by your rule
4. **Step 4: Rate Limiting** - Replace the size limit with a $60/hour spend limit
5. **Step 5: Testing Limits** - Execute swaps within the hourly budget
6. **Step 6: Hit Rate Limit** - Experience rate limiting protection in action

The tutorial guides you through each step, automatically detecting rule violations and providing educational context about how ACK-Lab's rules protect your automated transactions.

## 🏗️ Architecture & Agent Communication

### Agent Server Architecture

The demo spins up two independent agent servers that communicate via HTTP endpoints:

```
                                          ┌─────────────────┐
                                          │  Pyth Network   │
                                          │ (Price Oracle)  │
                                          │ • SOL/USD rates │
                                          └────────┬────────┘
                                                   │
┌─────────────────┐                      ┌────────▼────────┐
│   Swap User     │  HTTP POST /chat     │  Swap Service   │
│                 │─────────────────────▶│                 │
│  Port: 7576     │◀─────────────────────│  Port: 7577     │
└─────────────────┘  Negotiation Flow    └─────────────────┘
        │                                          │
        └──────────────────┬───────────────────────┘
                           │
                    ACK Lab SDK
                 (api.ack-lab.com)
              ┌────────────┴────────────┐
              │ • Identity Verification  │
              │ • Payment Processing     │
              │ • Token Generation       │
              └─────────────────────────┘
```

### How Agents Communicate

1. **Agent Initialization**: Each agent is instantiated with ACK Lab SDK credentials:
   ```typescript
   const swapUserSdk = new AckLabSdk({
     baseUrl: "https://api.ack-lab.com",
     clientId: process.env.CLIENT_ID_SWAP_USER,
     clientSecret: process.env.CLIENT_SECRET_SWAP_USER
   })
   ```

2. **Secure Connection**: Swap User creates a secure caller to Swap Service's `/chat` endpoint:
   ```typescript
   const callSwapService = swapUserSdk.createAgentCaller("http://localhost:7577/chat")
   ```

3. **Message Exchange**: Agents communicate through structured HTTP requests to `/chat` endpoints, with the SDK handling:
   - Authentication
   - Request signing
   - Token validation
   - Response verification

4. **Payment Flow**: When agents agree on a swap:
   - Swap Service fetches real-time SOL/USD price from Pyth Network
   - Swap Service generates a payment request token via ACK-Pay
   - Swap User validates and processes the payment
   - Swap Service executes the swap and sends SOL upon payment confirmation

## 🚀 Running on Replit (Primary Method)

The demo is optimized for Replit's cloud environment with automatic port forwarding:

### Replit Port Configuration
- **Swap User**: Internal port 7576 → External port 3000
- **Swap Service**: Internal port 7577 → External port 3001

### Quick Start on Replit

1. **Import the Repository**
   - Click "Import from GitHub" in Replit
   - Enter the repository URL

2. **Configure Environment Variables**
   - Create a `.env` file or use [Replit Secrets](https://docs.replit.com/replit-workspace/workspace-features/secrets). Note that public Replit projects expose all files, including .env files. We strongly recommending using Replit's Secrets tool.
   - Add your ACK Lab credentials:
   ```env
   ANTHROPIC_API_KEY=your_anthropic_key
   CLIENT_ID_SWAP_USER=your_swap_user_client_id
   CLIENT_SECRET_SWAP_USER=your_swap_user_client_secret
   CLIENT_ID_SWAP_SERVICE=your_swap_service_client_id
   CLIENT_SECRET_SWAP_SERVICE=your_swap_service_client_secret
   ```
   **Follow these steps on Replit to add your Secrets**:
   <div align="center">
      <img src="./assets/instructions-screenshots/swap_demo_7.png" width="50%" style="display: block; margin-bottom: 10px;">
      <img src="./assets/instructions-screenshots/swap_demo_8.png" width="50%" style="display: block; margin-bottom: 10px;">
      <img src="./assets/instructions-screenshots/swap_demo_9.png" width="50%" style="display: block; margin-bottom: 10px;">
      <img src="./assets/instructions-screenshots/swap_demo_10.png" width="50%" style="display: block; margin-bottom: 10px;">
   </div>

3. **Run the Demo**
   - Click the "Run" button in Replit
   - The setup script (`./setup-and-run.sh`) will automatically:
     - Install dependencies
     - Start both agent servers
     - Launch the interactive menu

4. **Access Points on Replit**
   - Swap User API: `https://[your-repl-name].[username].repl.co:3000`
   - Swap Service API: `https://[your-repl-name].[username].repl.co:3001`

## 💻 Local Execution (Secondary Method)

For local development and testing:

### Prerequisites
- Node.js 18+ with npm

### Setup

1. **Clone and Configure**
```bash
   git clone <repository-url>
   cd ack-private-swap-demo
```

2. **Create `.env` file** with your credentials:
```env
   ANTHROPIC_API_KEY=your_anthropic_key
   CLIENT_ID_SWAP_USER=your_swap_user_client_id
   CLIENT_SECRET_SWAP_USER=your_swap_user_client_secret
   CLIENT_ID_SWAP_SERVICE=your_swap_service_client_id
   CLIENT_SECRET_SWAP_SERVICE=your_swap_service_client_secret
   ```

3. **Run the Setup Script**
```bash
   ./setup-and-run.sh
   ```

### Quick Start Options

You can also run specific modes directly:

```bash
# Run the interactive tutorial (recommended)
npm run tutorial

# Run free-form CLI demo
npm run demo

# Start agent servers only
npm run agents:start
```

### Local Access Points
- Swap User: `http://localhost:7576`
- Swap Service: `http://localhost:7577`

## 🔧 Setup Script Deep Dive

The `setup-and-run.sh` script orchestrates the entire demo environment:

### 1. Environment Verification
- Checks for required ACK Lab credentials
- Prompts for missing credentials interactively
- Validates all five required environment variables

### 2. Dependency Management
- Installs root dependencies via npm
- Detects and uses appropriate package manager

### 3. Agent Server Initialization
```bash
npx tsx swap-agents-server.ts &
```
This command:
- Spawns two Node.js processes for Swap User and Swap Service
- Each agent runs an Express server with `/chat` endpoints
- Agents are equipped with ACK Lab SDK instances for secure communication

### 4. Service Health Checks
- Polls `localhost:7576` and `localhost:7577` to verify agent availability
- Provides feedback on server startup status
- Handles graceful degradation if servers are slow to start

### 5. Interactive Menu System
- **Tutorial Mode**: Step-by-step ACK-Lab rules tutorial (recommended for first-time users)
- **CLI Demo**: Free-form command-line interaction with agents
- **Exit**: Graceful shutdown of all services

## 📊 Demo Scenario

The demo simulates a cryptocurrency swap service where:

### Swap User
- Represents a user wanting to swap USDC for SOL
- Uses a mock wallet address (7VQo3HWesNfBys5VXJF3NcE5JCBsRs25pAoBxD5MJYGp)
- Executes payments using ACK-Pay (real payment request tokens, settled in Solana testnet)
- Confirms transaction receipts

### Swap Service
- Fetches real-time SOL/USD prices from Pyth Network (REAL price data)
- Creates payment requests for exact USDC amounts (REAL ACK-Pay tokens)
- **Simulates** DEX swap execution (no actual blockchain interaction)
- **Simulates** sending SOL to user's wallet (returns mock transaction hash)

### Price Oracle Integration
- **Pyth Network**: Provides real-time SOL/USD price feeds
- **Price Updates**: Fetched on-demand for each swap request
- **Confidence Intervals**: Displays price confidence data
- **Fallback Pricing**: Uses $150 if oracle is unavailable

## 🔑 Security Features

- **End-to-End Encryption**: All agent communications are secured
- **Token-Based Auth**: JWT tokens for session management
- **Credential Isolation**: Each agent has separate credentials
- **Payment Security**: ACK-Pay ensures secure financial transactions
- **Price Oracle Verification**: Real-time price data from trusted source

## 🛠️ Technical Implementation

### Agent Configuration
```typescript
// Swap Service with payment capabilities and price oracle
const pythClient = new HermesClient("https://hermes.pyth.network", {})
const swapServiceSdk = new AckLabSdk({
  baseUrl: "https://api.ack-lab.com",
  clientId: process.env.CLIENT_ID_SWAP_SERVICE,
  clientSecret: process.env.CLIENT_SECRET_SWAP_SERVICE
})

// Serve authenticated agent with SDK
serveAuthedAgent({
  port: 7577,
  runAgent: runSwapService,
  sdk: swapServiceSdk
})
```

### Communication Protocol
- **Request**: JSON payload with swap instructions
- **Processing**: AI model generates contextual responses
- **Tools**: Agents use function calling for payments and swaps
- **Response**: Structured JSON with transaction details

### Swap Execution Flow
1. **Rate Discovery**: Fetch current SOL/USD from Pyth Network *(REAL)*
2. **Payment Request**: Generate JWT token with swap details *(REAL ACK-Pay)*
3. **Payment Processing**: Execute USDC payment via ACK-Pay *(REAL tokens, settled in Solana testnet)*
4. **Swap Simulation**: Process swap on mock DEX *(SIMULATED - no blockchain)*
5. **SOL Delivery**: Transfer SOL to user's wallet *(SIMULATED - mock transaction)*
6. **Confirmation**: Return transaction hashes and receipt *(SIMULATED hashes)*

## 💬 Example Usage

### CLI Interaction
```
=== USDC to SOL Swap Demo (CLI) ===
✅ Agents are running and ready!

Enter your request: swap 25 USDC for SOL

>>> Processing request: swap 25 USDC for SOL

📊 Fetched SOL/USD price from Pyth: $150.50         [REAL PRICE DATA]
   Price confidence: ±$0.30
   Publish time: 2024-01-15T10:30:45.000Z

Current exchange rate: 150.50 USDC/SOL
You will receive: 0.664452 SOL

Payment request created for 100 USDC (10000 units)
Payment request token: pay_abc123xyz...                    [REAL ACK-PAY TOKEN]

Executing payment...
✅ Payment successful! Receipt ID: rcpt_def456...  [REAL ACK-PAY RECEIPT]

🔄 Executing swap on DEX...                        [SIMULATED]
   USDC: 100
   Rate: 150.50 USDC/SOL
   SOL: 0.664452

💸 Sending 0.664452 SOL to 7VQo3HWes...           [SIMULATED]

Swap completed successfully!
- Swap TX: 0x7f8a9b2c...                          [MOCK TRANSACTION HASH]
- Send TX: 0x3d4e5f6a...                          [MOCK TRANSACTION HASH]
```

## 🐛 Troubleshooting

### Replit-Specific Issues
- **Port conflicts**: Check `.replit` file for correct port mappings
- **External access**: Ensure your Repl is set to "Always On" for consistent availability
- **Environment variables**: Use Replit Secrets for secure credential storage

### General Issues
- **Missing credentials**: Ensure all five environment variables are set
- **Connection refused**: Verify agent servers are running on correct ports
- **Payment failures**: Check ACK Lab API connectivity and credentials
- **Price oracle errors**: Verify internet connectivity for Pyth Network access

## 🎭 What's Real vs. Mocked

This demo uses **real ACK-Lab infrastructure** for authentication and payment processing, but **simulates** some components:

### ✅ Real Components
- **ACK-Lab Authentication**: Actual agent identity verification and JWT token generation
- **ACK-Pay Payment Processing**: Real payment request token creation and validation
- **Pyth Network Price Oracle**: Live SOL/USD price feeds from Pyth
- **Agent Communication**: Authentic HTTP-based agent-to-agent messaging

### 🎬 Mocked/Simulated Components
- **SOL Transfer**: The demo simulates sending SOL to the user's wallet - no actual SOL is transferred
- **DEX Swap Execution**: The swap is simulated, not executed on any real DEX

## 🌟 About Agent Commerce Kit (ACK)

**Agent Commerce Kit (ACK)** is a set of open-source patterns built by [Catena Labs](https://www.catenalabs.com) to enable AI agents to participate securely in commerce. As we advance toward an AI-native financial future, ACK addresses the fundamental challenge that today's financial infrastructure was not designed for intelligent machines.

### The Vision

Rapid advancements in AI are creating a new "agent economy" where autonomous agents can become powerful economic participants. However, existing financial systems present significant barriers:

- **Identity Crisis**: No widely adopted standards for identifying and authorizing AI agents
- **Transaction Barriers**: Legacy systems impose friction incompatible with autonomous, high-speed agent workflows
- **Untapped Economic Potential**: Current systems cannot support novel transaction models like micropayments for data or direct agent-to-agent payments

ACK solves these challenges through two complementary protocols:
- **ACK-ID**: Verifiable agent identity through DIDs and Verifiable Credentials
- **ACK-Pay**: Agent-native payment patterns for seamless transactions

Learn more at [agentcommercekit.com](https://agentcommercekit.com)

## 🚀 Getting Started with ACK-Lab

**ACK-Lab** ([ack-lab.catenalabs.com](https://ack-lab.catenalabs.com)) is the trust and control plane for agents - a developer preview platform where you can leverage ACK implementations to give your agents:

1. **An Identity**: A verifiable, cryptographic ID so your agent can prove who it is
2. **A Wallet**: A secure wallet so your agent can pay and get paid
3. **A Rulebook**: Policies that govern what your agent is allowed to do


## 💡 What Else Can You Build with ACK?

This swap demo is just one example of what's possible with ACK. Developers are using ACK to build:

### Financial Applications
- **Treasury Management**: Agents that handle SME treasury operations, monitoring cash positions and optimizing working capital
- **Supply Chain Payments**: Systems that automate payments based on verified deliveries
- **Personal Finance Automation**: Consumer agents that pay bills, manage subscriptions, and execute transfers based on spending patterns

### Agent-to-Agent Commerce
- **Specialized Service Marketplaces**: Verified agents offering and purchasing specialized services from each other
- **Data Marketplaces**: Agents autonomously purchasing datasets with micropayments
- **Compute Resource Trading**: Agents negotiating and paying for computational resources

### Content & Services
- **Monetized MCP Servers**: Model Context Protocol servers that require payment for premium tools or resources
- **Paywalled Content Access**: Agents accessing publisher content through automated micropayments
- **API Monetization**: Transform any API into an agent-accessible paid service

### Novel Economic Models
- **Value-Based Pricing**: Dynamic pricing for AI services based on actual value delivered
- **Micropayment Streams**: Continuous small payments for ongoing services
- **Agent Reputation Systems**: Economic incentives tied to verifiable performance metrics

These use cases demonstrate how ACK enables a new economy where AI agents can be trusted economic participants, opening unprecedented opportunities for innovation.

## 📚 Additional Resources

- [ACK Lab Developer Portal](https://ack-lab.catenalabs.com)
- [Agent Commerce Kit Documentation](https://agentcommercekit.com)
- [ACK Lab API Documentation](https://api.ack-lab.com)
- [Catena Labs](https://www.catenalabs.com)
- [Pyth Network Price Feeds](https://pyth.network)
- [Replit Port Configuration Guide](https://docs.replit.com/hosting/deploying-http-servers)

## ⚠️ Production Readiness

This repository is a **demonstration example** that hasn't undergone the extensive testing, security audits, or hardening that production ACK-Lab components receive. It's designed to showcase ACK capabilities and help developers understand agent-to-agent commerce patterns.

**For production use**:

- ACK-Lab SDK and infrastructure undergo rigorous testing
- The patterns shown here can be adapted for real-world applications
- Always implement proper error handling, security measures, and testing for production systems

## 📄 License

MIT

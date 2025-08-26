# ACK USDC to SOL Swap Demo

![Agent Commerce Kit](./assets/README-Header.png)

[![Run on Replit](https://replit.com/badge?caption=Run%20on%20Replit)](https://replit.new/github.com/catena-labs/ack-swap-demo)

[Explore ACK-Lab Developer Preview](https://ack-lab.catenalabs.com)

A demonstration of secure agent-to-agent commerce using the Agent Commerce Kit (ACK), showcasing how autonomous AI agents can negotiate and execute USDC to SOL swaps with built-in authentication and payment processing.

This demo showcases agent-to-agent communication using the ACK Hub SDK. It 
demonstrates how AI agents collaborate to execute cryptocurrency swaps, with 
one agent (Agent A) representing a user who wants to swap USDC for SOL, and 
another agent (Agent B) providing the swap service.


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

### Prerequisites

To run this demo, you need to:

1. **Sign up for ACK-Lab Developer Preview** at [ack-lab.catenalabs.com](https://ack-lab.catenalabs.com)
2. **Register your agents** in the ACK-Lab app to obtain credentials
3. **Get an Anthropic API key** from [console.anthropic.com](https://console.anthropic.com)

Once you have registered two agents (one for the user, one for the swap service), you'll receive CLIENT_ID and CLIENT_SECRET credentials for each agent to use with the SDK.

On Replit, click "Run" at the top of your screen to get started.

<div align="center">
  <img src="./assets/replit-run-icon.png" alt="Get Started on Replit" width="100">
</div>

## 🔐 Agent Commerce Kit Integration

This demo leverages the **Agent Commerce Kit (ACK)** to enable secure, robust transactions between autonomous agents. ACK provides enterprise-grade infrastructure for agent commerce through two core components:

### ACK-ID (Identity & Authentication)
- **Secure Agent Identity**: Each agent receives unique credentials (CLIENT_ID and CLIENT_SECRET) that serve as their digital identity
- **Credential Management**: Handles authentication tokens and secure credential exchange between agents
- **Trust Framework**: Ensures only authorized agents can participate in transactions

### ACK-Pay (Payment Processing)
- **Secure Transactions**: Processes payments between agents with built-in security and compliance
- **Payment Tokens**: Generates cryptographically secure payment tokens for transaction authorization
- **Settlement**: Handles the financial settlement between agent wallets

### ack-lab SDK
The `@ack-hub/sdk` npm package abstracts the complexity of credential exchange and payment processing, providing:
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

### Educational Benefits

- **Learn by Doing**: Set real rules and see immediate effects
- **Understand Protection**: See how rules protect against accidents and attacks
- **No Code Changes**: Rules operate at the infrastructure level
- **Full Control**: Learn to modify and remove rules based on needs

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
│   Agent A       │  HTTP POST /chat     │   Agent B       │
│    (User)       │─────────────────────▶│ (Swap Service)  │
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
   const agentASdk = new AckLabSdk({
     baseUrl: "https://api.ack-lab.com",
     clientId: process.env.CLIENT_ID_AGENT_A,
     clientSecret: process.env.CLIENT_SECRET_AGENT_A
   })
   ```

2. **Secure Connection**: Agent A creates a secure caller to Agent B's `/chat` endpoint:
   ```typescript
   const callAgent = agentASdk.createAgentCaller("http://localhost:7577/chat")
   ```

3. **Message Exchange**: Agents communicate through structured HTTP requests to `/chat` endpoints, with the SDK handling:
   - Authentication
   - Request signing
   - Token validation
   - Response verification

4. **Payment Flow**: When agents agree on a swap:
   - Agent B fetches real-time SOL/USD price from Pyth Network
   - Agent B generates a payment token via ACK-Pay
   - Agent A validates and processes the payment
   - Agent B executes the swap and sends SOL upon payment confirmation

## 🚀 Running on Replit (Primary Method)

The demo is optimized for Replit's cloud environment with automatic port forwarding:

### Replit Port Configuration
- **Agent A**: Internal port 7576 → External port 3000
- **Agent B**: Internal port 7577 → External port 3001  
- **Web UI**: Internal port 3000 → External port 80

### Quick Start on Replit

1. **Import the Repository**
   - Click "Import from GitHub" in Replit
   - Enter the repository URL

2. **Configure Environment Variables**
   - Create a `.env` file or use Replit Secrets
   - Add your ACK Lab credentials:
   ```env
   ANTHROPIC_API_KEY=your_anthropic_key
   CLIENT_ID_AGENT_A=your_agent_a_client_id
   CLIENT_SECRET_AGENT_A=your_agent_a_client_secret
   CLIENT_ID_AGENT_B=your_agent_b_client_id
   CLIENT_SECRET_AGENT_B=your_agent_b_client_secret
   ```

3. **Run the Demo**
   - Click the "Run" button in Replit
   - The setup script (`./setup-and-run.sh`) will automatically:
     - Install dependencies
     - Start both agent servers
     - Launch the interactive menu

4. **Access Points on Replit**
   - Agent A API: `https://[your-repl-name].[username].repl.co:3000`
   - Agent B API: `https://[your-repl-name].[username].repl.co:3001`
   - Web UI: `https://[your-repl-name].[username].repl.co`

## 💻 Local Execution (Secondary Method)

For local development and testing:

### Prerequisites
- Node.js 18+
- npm or pnpm

### Setup

1. **Clone and Configure**
```bash
   git clone <repository-url>
   cd ack-private-swap-demo
```

2. **Create `.env` file** with your credentials:
```env
   ANTHROPIC_API_KEY=your_anthropic_key
   CLIENT_ID_AGENT_A=your_agent_a_client_id
   CLIENT_SECRET_AGENT_A=your_agent_a_client_secret
   CLIENT_ID_AGENT_B=your_agent_b_client_id
   CLIENT_SECRET_AGENT_B=your_agent_b_client_secret
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
- Agent A: `http://localhost:7576`
- Agent B: `http://localhost:7577`
- Web UI: `http://localhost:3000`

## 🔧 Setup Script Deep Dive

The `setup-and-run.sh` script orchestrates the entire demo environment:

### 1. Environment Verification
- Checks for required ACK Lab credentials
- Prompts for missing credentials interactively
- Validates all five required environment variables

### 2. Dependency Management
- Installs root dependencies via npm/pnpm
- Conditionally installs web UI dependencies
- Detects and uses appropriate package manager

### 3. Agent Server Initialization
```bash
npx tsx swap-agents-server.ts &
```
This command:
- Spawns two Node.js processes for Agent A and Agent B
- Each agent runs an Express server with `/chat` endpoints
- Agents are equipped with ACK Lab SDK instances for secure communication

### 4. Service Health Checks
- Polls `localhost:7576` and `localhost:7577` to verify agent availability
- Provides feedback on server startup status
- Handles graceful degradation if servers are slow to start

### 5. Interactive Menu System
- **Tutorial Mode**: Step-by-step ACK-Lab rules tutorial (recommended for first-time users)
- **CLI Demo**: Free-form command-line interaction with agents
- **Web UI**: Visual interface for monitoring swap execution
- **Exit**: Graceful shutdown of all services

## 📊 Demo Scenario

The demo simulates a cryptocurrency swap service where:

### Agent A (User)
- Represents a user wanting to swap USDC for SOL
- Manages wallet address (7VQo3HWesNfBys5VXJF3NcE5JCBsRs25pAoBxD5MJYGp)
- Executes payments using ACK-Pay
- Confirms transaction receipts

### Agent B (Swap Service)
- Fetches real-time SOL/USD prices from Pyth Network
- Creates payment requests for exact USDC amounts
- Simulates DEX swap execution
- Sends SOL to user's wallet upon payment confirmation

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
// Agent B with payment capabilities and price oracle
const pythClient = new HermesClient("https://hermes.pyth.network", {})
const agentBSdk = new AckLabSdk({
  baseUrl: "https://api.ack-lab.com",
  clientId: process.env.CLIENT_ID_AGENT_B,
  clientSecret: process.env.CLIENT_SECRET_AGENT_B
})

// Serve authenticated agent with SDK
serveAuthedAgent({
  port: 7577,
  runAgent: runAgentB,
  sdk: agentBSdk
})
```

### Communication Protocol
- **Request**: JSON payload with swap instructions
- **Processing**: AI model generates contextual responses
- **Tools**: Agents use function calling for payments and swaps
- **Response**: Structured JSON with transaction details

### Swap Execution Flow
1. **Rate Discovery**: Fetch current SOL/USD from Pyth Network
2. **Payment Request**: Generate JWT token with swap details
3. **Payment Processing**: Execute USDC payment via ACK-Pay
4. **Swap Simulation**: Process swap on mock DEX
5. **SOL Delivery**: Transfer SOL to user's wallet
6. **Confirmation**: Return transaction hashes and receipt

## 💬 Example Usage

### CLI Interaction
```
=== USDC to SOL Swap Demo (CLI) ===
✅ Agents are running and ready!

Enter your request: swap 25 USDC for SOL

>>> Processing request: swap 25 USDC for SOL

📊 Fetched SOL/USD price from Pyth: $150.50
   Price confidence: ±$0.30
   Publish time: 2024-01-15T10:30:45.000Z

Current exchange rate: 150.50 USDC/SOL
You will receive: 0.664452 SOL

Payment request created for 100 USDC (10000 units)
Payment token: pay_abc123xyz...

Executing payment...
✅ Payment successful! Receipt ID: rcpt_def456...

🔄 Executing swap on DEX...
   USDC: 100
   Rate: 150.50 USDC/SOL
   SOL: 0.664452

💸 Sending 0.664452 SOL to 7VQo3HWesNfBys5VXJF3NcE5JCBsRs25pAoBxD5MJYGp

Swap completed successfully!
- Swap TX: 0x7f8a9b2c...
- Send TX: 0x3d4e5f6a...
```

### Web UI Features
- **Visual Step Tracking**: Real-time progress through swap stages
- **Live Price Updates**: Simulated exchange rate fluctuations
- **JWT Token Decoder**: Educational tool to inspect payment tokens
- **Transaction Results**: Complete swap details and hashes
- **Flow Diagram**: Interactive visualization of agent architecture

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

## 📄 License

MIT
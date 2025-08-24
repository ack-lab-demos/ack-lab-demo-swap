# USDC to ETH Swap Demo

This demo showcases agent-to-agent communication using the ACK Hub SDK. It demonstrates how AI agents collaborate to execute cryptocurrency swaps, with one agent (Agent A) representing a user who wants to swap USDC for ETH, and another agent (Agent B) providing the swap service.

## 🎯 Overview

- **Agent A (User)**: Represents a user wanting to swap USDC for ETH, handles payment execution
- **Agent B (Swap Service)**: A specialized swap agent that:
  - Provides current exchange rates (3000-4000 USDC per ETH)
  - Creates payment requests
  - Executes swaps on a mock DEX
  - Sends ETH to the user's wallet

## 🚀 Quick Start

### Prerequisites

- Node.js 18 or higher
- npm or pnpm
- Anthropic API key
- ACK Lab SDK credentials (for both agents)

### Setup

1. **Install dependencies**:
```bash
npm install
```

2. **Configure environment variables**:

Create a `.env` file in the root directory with your credentials:

```env
# AckLab SDK Credentials for Agent A (User)
CLIENT_ID_AGENT_A=<your-agent-a-client-id>
CLIENT_SECRET_AGENT_A=<your-agent-a-client-secret>

# AckLab SDK Credentials for Agent B (Swap Service)
CLIENT_ID_AGENT_B=<your-agent-b-client-id>
CLIENT_SECRET_AGENT_B=<your-agent-b-client-secret>

# Anthropic API Key
ANTHROPIC_API_KEY=<your-anthropic-api-key>
```

## 📱 Running the Demo

### Option 1: CLI Demo

1. **Start the agent servers** (in one terminal):
```bash
npm run agents:start
```

This starts:
- Agent A (User) on port 7576
- Agent B (Swap Service) on port 7577

2. **Run the CLI demo** (in another terminal):
```bash
npm start
# or
npm run demo:swap
```

### Option 2: Web UI Demo

1. **Start the agent servers** (in one terminal):
```bash
npm run agents:start
```

2. **Set up and run the Web UI** (in another terminal):
```bash
cd web-ui
npm install
npm run dev
```

3. **Open your browser** to `http://localhost:3000`

## 💬 Example Usage

### CLI Interaction
```
=== USDC to ETH Swap Demo (CLI) ===
✅ Agents are running and ready!

Enter your request: swap 100 USDC for ETH

>>> Processing request: swap 100 USDC for ETH
>>> Result: I'll help you swap 100 USDC for ETH. 

Current exchange rate: 3542 USDC/ETH
You will receive: 0.028234 ETH

Payment request created for 100 USDC (10000 units)
Payment token: pay_abc123xyz...

Executing payment...
✅ Payment successful! Receipt ID: rcpt_def456...

Swap executed successfully!
- USDC swapped: 100
- ETH received: 0.028234
- Transaction hash: 0x7f8a9b2c...

Your ETH has been sent to: 0x742d35Cc6634C0532925a3b844Bc9e7595f
```

### Web UI Features
- Visual step-by-step swap process
- Real-time exchange rate updates
- JWT payment token decoder for educational purposes
- Transaction result display with all details
- Interactive flow diagram showing agent architecture

## 🏗️ Architecture

```
User Input → Agent A (Port 7576) → Agent B (Port 7577)
                ↓                          ↓
          [Payment Execution]        [Swap Service]
                ↓                          ↓
          [Send Receipt]  →  →  →  [Execute Swap on DEX]
                ↓                          ↓
            Response ← ← ← ← ← ← ← [Send ETH to User]
```

### How It Works

1. **User Request**: User requests to swap USDC for ETH
2. **Rate Check**: Agent A contacts Agent B to get the current exchange rate
3. **Payment Request**: Agent B creates a payment request with the swap details
4. **Payment Execution**: Agent A executes the USDC payment using ACK Lab SDK
5. **Swap Execution**: Agent B receives payment confirmation and executes the swap on a mock DEX
6. **ETH Transfer**: Agent B sends the swapped ETH to the user's wallet address
7. **Confirmation**: User receives transaction details and confirmation

## 📝 Scripts

- `npm start` / `npm run demo:swap`: Run the CLI demo
- `npm run agents:start`: Start both agent servers
- `npm run dev`: Run CLI demo in watch mode
- `npm run build`: Compile TypeScript files
- `npm run lint`: Run ESLint

## 🎓 Educational Notes

This demo is designed to teach:
- **Agent-to-Agent Communication**: How AI agents can collaborate on complex tasks
- **Payment Token Architecture**: JWT-based payment authorization with ACK Lab SDK
- **Swap Process Flow**: Step-by-step execution of a token swap
- **Multi-Agent Systems**: Delegation and specialization in agent networks

**Note**: Exchange rates and transactions are simulated for demonstration purposes. In production, these would connect to real DEXs and blockchain networks.

## 📁 Project Structure

```
ack-swap-demo/
├── cli-demos/
│   └── swap-demo.ts         # CLI interface for the demo
├── swap-agents-server.ts    # Agent A and Agent B server implementations
├── serve-agent.ts           # Agent server utilities
├── web-ui/                  # Next.js web interface (optional)
│   ├── src/
│   │   ├── app/            # Next.js app router
│   │   └── components/     # React components
│   └── README.md           # Web UI specific documentation
├── package.json
├── .env                    # Environment variables (create this)
└── README.md              # This file
```

## 🔧 Troubleshooting

### Agents not starting
- Check that ports 7576 and 7577 are not in use
- Verify all environment variables are set correctly
- Ensure Anthropic API key is valid

### Payment failures
- Verify ACK Lab SDK credentials for both agents
- Check that both agents have proper permissions
- Ensure payment amounts are in the correct units (100 USDC = 10000 units)

### Web UI issues
- Make sure agent servers are running first
- Check browser console for errors
- Verify `.env.local` file exists in `web-ui/` directory

## 📚 Learn More

- [ACK Lab SDK Documentation](https://docs.ack-lab.com)
- [AI SDK Documentation](https://sdk.vercel.ai/docs)
- [Anthropic Claude API](https://docs.anthropic.com)

## 📄 License

MIT
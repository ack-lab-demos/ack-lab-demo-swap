# USDC to ETH Swap Demo - Web UI

An educational web interface demonstrating agent-to-agent communication for cryptocurrency swaps using the ACK Lab SDK.

## 🎯 Overview

This web UI provides a visual, interactive demonstration of the swap process from the CLI demo. It shows:

- **Real-time Agent Communication**: Watch as Agent A (user) and Agent B (swap service) negotiate and execute swaps
- **Step-by-Step Process Visualization**: See each stage of the swap process in real-time
- **JWT Token Decoder**: Inspect the payment token structure for educational purposes
- **Transaction Results**: View detailed results of completed swaps

## 🚀 Getting Started

### Prerequisites

1. **Environment Variables**: Copy the `.env` file from the root directory to the web-ui folder:
   ```bash
   cp ../.env web-ui/.env.local
   ```

   Or create a new `.env.local` file in the web-ui directory with:
   ```env
   # AckLab SDK Credentials
   CLIENT_ID_AGENT_A=your_agent_a_client_id
   CLIENT_SECRET_AGENT_A=your_agent_a_client_secret
   CLIENT_ID_AGENT_B=your_agent_b_client_id
   CLIENT_SECRET_AGENT_B=your_agent_b_client_secret
   
   # Anthropic API Key
   ANTHROPIC_API_KEY=your_anthropic_api_key
   ```

### Installation & Running

1. **Start the Agent Servers** (from the root directory):
   ```bash
   npm run agents:start
   ```
   
   This will start:
   - Agent A (User) on `http://localhost:7576`
   - Agent B (Swap Service) on `http://localhost:7577`

2. **Install Web UI Dependencies** (in a new terminal, from the web-ui directory):
   ```bash
   cd web-ui
   npm install
   ```

3. **Start the Web UI**:
   ```bash
   npm run dev
   ```

4. **Open the Application**:
   Navigate to `http://localhost:3000` in your browser

## 🏗️ Architecture

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│   Web UI    │────▶│   Agent A    │────▶│   Agent B    │
│  (Next.js)  │     │   (User)     │     │ (Swap Agent) │
└─────────────┘     └──────────────┘     └──────────────┘
                          │                      │
                          └──────────────────────┘
                               ACK Lab SDK
```

### How It Works

1. **User Input**: Enter the amount of USDC to swap in the web interface
2. **Agent A Activation**: The UI sends the request to Agent A (via `/api/swap`)
3. **Agent Communication**: Agent A communicates with Agent B to:
   - Get the current exchange rate
   - Create a payment request
   - Execute the USDC payment
   - Process the swap on the (mock) DEX
   - Send ETH to the user's wallet
4. **Real-time Updates**: The UI shows each step's progress in real-time
5. **Results Display**: View transaction details, payment tokens, and receipts

## 🎨 Features

### Main Interface
- **Swap Form**: Simple input for USDC amount with live ETH estimation
- **Live Exchange Rate**: Updates every 5 seconds (3000-4000 USDC/ETH range)
- **Progress Tracking**: Visual indicators for each step of the process

### Educational Tabs
1. **Flow Diagram**: Understand the agent architecture and communication flow
2. **JWT Decoder**: Inspect the payment token structure and payload
3. **Transaction Results**: View detailed swap results including hashes and receipts

### Visual Feedback
- Real-time step progression with status indicators
- Toast notifications for important events
- Smooth animations and transitions
- Dark theme optimized for developer focus

## 📁 Project Structure

```
web-ui/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── swap/
│   │   │       └── route.ts      # API route to communicate with Agent A
│   │   ├── layout.tsx            # Root layout with dark theme
│   │   └── page.tsx              # Main page
│   ├── components/
│   │   ├── ui/                   # shadcn/ui components
│   │   └── swap-interface.tsx    # Main swap interface component
│   └── lib/
│       └── utils.ts              # Utility functions
├── public/                       # Static assets
├── package.json
└── README.md
```

## 🔧 Troubleshooting

### Agents Not Responding
- Ensure the agent servers are running (`npm run agents:start` from root)
- Check that ports 7576 and 7577 are not in use
- Verify environment variables are properly set

### Web UI Issues
- Clear browser cache and refresh
- Check console for errors
- Ensure all dependencies are installed (`npm install`)

### Payment Token Issues
- Verify ACK Lab SDK credentials are correct
- Check that both agents have valid credentials
- Ensure the Anthropic API key is set

## 🎓 Educational Notes

This demo is designed to teach:
- **Agent-to-Agent Communication**: How AI agents can interact to complete complex tasks
- **Payment Token Architecture**: JWT-based payment authorization
- **Swap Process Flow**: Step-by-step execution of a token swap
- **Real-time Updates**: WebSocket-like updates through polling

The exchange rates and transactions are simulated for demonstration purposes. In a production environment, these would connect to real DEXs and blockchain networks.

## 📚 Learn More

- [ACK Lab SDK Documentation](https://docs.ack-lab.com)
- [AI SDK Documentation](https://sdk.vercel.ai/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com)
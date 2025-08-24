# Agent Communication Demo

This demo showcases agent-to-agent communication using the ACK Hub SDK. It demonstrates how one AI agent (Agent A) can delegate addition tasks to another specialized agent (Agent B).

## Overview

- **Agent A**: A general assistant that delegates addition requests to Agent B
- **Agent B**: A specialized agent that only performs addition operations

## Prerequisites

- Node.js 18 or higher
- pnpm (or npm/yarn)

## Setup

1. Install dependencies:
```bash
pnpm install
```

2. Configure your ACK Lab credentials:

Edit `addition-demo.ts` and replace the placeholder credentials with your actual values:

```typescript
// Line 31-34 and 79-82
const ackLabSdk = new AckLabSdk({
  clientId: "<your-client-id>",
  clientSecret: "<your-client-secret>"
})
```

## Running the Demo

Start the demo with:

```bash
pnpm start
```

Or use the development mode with auto-reload:

```bash
pnpm dev
```

## How it Works

1. The demo starts two local HTTP servers:
   - Port 7576: Agent A (General Assistant)
   - Port 7577: Agent B (Addition Agent)

2. When you run the demo, you'll be prompted to enter messages
3. Agent A receives your messages and decides whether to handle them directly or delegate to Agent B
4. For addition requests, Agent A calls Agent B via the ACK Hub SDK
5. Agent B performs the addition and returns the result

## Example Usage

```
Enter your input (type /exit to quit): What is 5 + 3?
Processing input: What is 5 + 3?
Result: The sum of 5 and 3 is 8.

Enter your input (type /exit to quit): Tell me a joke
Processing input: Tell me a joke
Result: Why don't scientists trust atoms? Because they make up everything!

Enter your input (type /exit to quit): /exit
Goodbye!
```

## Architecture

```
User Input → Agent A (Port 7576) → [If addition task] → Agent B (Port 7577)
                ↓                                              ↓
          [Other tasks]                                  [Addition result]
                ↓                                              ↓
            Response ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ←
```

## Scripts

- `pnpm start`: Run the demo
- `pnpm dev`: Run in development mode with auto-reload
- `pnpm build`: Compile TypeScript files
- `pnpm lint`: Run ESLint

## License

MIT

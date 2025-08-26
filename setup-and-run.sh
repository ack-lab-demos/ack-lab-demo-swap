#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

print_color() {
    echo -e "${1}${2}${NC}"
}

print_color "$CYAN" "💱 USDC to SOL Swap Demo Setup"
print_color "$BLUE" "======================================="
echo ""

# Check if .env file exists
if [ ! -f ".env" ]; then
    print_color "$YELLOW" "📝 Creating .env file..."
    # Create .env with required first two lines
    echo "DECODE_JWT=true" > .env
    echo "NODE_NO_WARNINGS=1" >> .env
    print_color "$GREEN" "✅ .env file created with required settings"
else
    print_color "$GREEN" "✅ .env file found"
    
    # Check if required lines exist, add them if missing
    NEEDS_UPDATE=false
    
    # Check for DECODE_JWT
    if ! grep -q "^DECODE_JWT=" .env 2>/dev/null; then
        NEEDS_UPDATE=true
    fi
    
    # Check for NODE_NO_WARNINGS
    if ! grep -q "^NODE_NO_WARNINGS=" .env 2>/dev/null; then
        NEEDS_UPDATE=true
    fi
    
    # If either is missing, we need to restructure the file
    if [ "$NEEDS_UPDATE" = true ]; then
        print_color "$YELLOW" "📝 Updating .env file with required settings..."
        
        # Create a temporary file with the required lines first
        TEMP_FILE=$(mktemp)
        
        # Add required lines at the top
        echo "DECODE_JWT=true" > "$TEMP_FILE"
        echo "NODE_NO_WARNINGS=1" >> "$TEMP_FILE"
        
        # Add existing content, skipping any existing DECODE_JWT or NODE_NO_WARNINGS lines
        while IFS= read -r line || [ -n "$line" ]; do
            if [[ ! "$line" =~ ^DECODE_JWT= ]] && [[ ! "$line" =~ ^NODE_NO_WARNINGS= ]] && [ -n "$line" ]; then
                echo "$line" >> "$TEMP_FILE"
            fi
        done < .env
        
        # Replace the original file
        mv "$TEMP_FILE" .env
        print_color "$GREEN" "✅ .env file updated with required settings"
    else
        # Check if the values are correct
        UPDATE_DECODE_JWT=false
        UPDATE_NODE_NO_WARNINGS=false
        
        if grep -q "^DECODE_JWT=" .env 2>/dev/null; then
            CURRENT_DECODE_JWT=$(grep "^DECODE_JWT=" .env | cut -d'=' -f2)
            if [ "$CURRENT_DECODE_JWT" != "true" ]; then
                UPDATE_DECODE_JWT=true
            fi
        fi
        
        if grep -q "^NODE_NO_WARNINGS=" .env 2>/dev/null; then
            CURRENT_NODE_NO_WARNINGS=$(grep "^NODE_NO_WARNINGS=" .env | cut -d'=' -f2)
            if [ "$CURRENT_NODE_NO_WARNINGS" != "1" ]; then
                UPDATE_NODE_NO_WARNINGS=true
            fi
        fi
        
        if [ "$UPDATE_DECODE_JWT" = true ] || [ "$UPDATE_NODE_NO_WARNINGS" = true ]; then
            print_color "$YELLOW" "📝 Correcting values in .env file..."
            
            if [ "$UPDATE_DECODE_JWT" = true ]; then
                sed -i.bak "s|^DECODE_JWT=.*|DECODE_JWT=true|" .env && rm .env.bak
            fi
            
            if [ "$UPDATE_NODE_NO_WARNINGS" = true ]; then
                sed -i.bak "s|^NODE_NO_WARNINGS=.*|NODE_NO_WARNINGS=1|" .env && rm .env.bak
            fi
            
            print_color "$GREEN" "✅ .env values corrected"
        fi
    fi
fi

# Load existing .env if it exists
if [ -f ".env" ]; then
    set -a
    source .env 2>/dev/null || true
    set +a
fi

echo ""
print_color "$BLUE" "🔧 Checking required credentials..."

# Required environment variables
REQUIRED_VARS=("ANTHROPIC_API_KEY" "CLIENT_ID_AGENT_A" "CLIENT_SECRET_AGENT_A" "CLIENT_ID_AGENT_B" "CLIENT_SECRET_AGENT_B")
MISSING_VARS=()

# Check which variables are missing
for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ] && ! grep -q "^${var}=" .env 2>/dev/null; then
        MISSING_VARS+=("$var")
    fi
done

# If we have missing variables, prompt for them
if [ ${#MISSING_VARS[@]} -gt 0 ]; then
    print_color "$YELLOW" "⚠️  Missing required credentials!"
    echo ""
    print_color "$BLUE" "This demo requires:"
    print_color "$BLUE" "• Anthropic API Key for AI capabilities (claude-sonnet model)"
    print_color "$BLUE" "• ACK Lab SDK credentials for two agents:"
    print_color "$BLUE" "  - Agent A: User agent wanting to swap USDC for SOL"
    print_color "$BLUE" "  - Agent B: Swap service agent that executes the exchange"
    echo ""
    print_color "$BLUE" "Get Anthropic API key from: https://console.anthropic.com/"
    print_color "$BLUE" "Get ACK Lab credentials from: https://ack-lab.catenalabs.com. For each agent, click on 'Create API Key' and copy the Client ID and Client Secret when prompted."
    echo ""

    for var in "${MISSING_VARS[@]}"; do
        case $var in
            "ANTHROPIC_API_KEY")
                print_color "$CYAN" "Enter your Anthropic API Key:"
                ;;
            "CLIENT_ID_AGENT_A")
                print_color "$CYAN" "Enter CLIENT_ID for Agent A (Swap Bot):"
                ;;
            "CLIENT_SECRET_AGENT_A")
                print_color "$CYAN" "Enter CLIENT_SECRET for Agent A (Executor Agent):"
                ;;
            "CLIENT_ID_AGENT_B")
                print_color "$CYAN" "Enter CLIENT_ID for Agent B (Swap Bot):"
                ;;
            "CLIENT_SECRET_AGENT_B")
                print_color "$CYAN" "Enter CLIENT_SECRET for Agent B (Executor Agent):"
                ;;
        esac
        
        read -p "> " value
        
        if [ -n "$value" ]; then
            # Check if the variable already exists in .env, update it, otherwise append
            if grep -q "^${var}=" .env 2>/dev/null; then
                # Use different delimiters to avoid issues with special characters
                sed -i.bak "s|^${var}=.*|${var}=${value}|" .env && rm .env.bak
            else
                echo "${var}=${value}" >> .env
            fi
            print_color "$GREEN" "✅ ${var} saved to .env"
        else
            print_color "$RED" "❌ ${var} is required for the demo to work!"
            print_color "$YELLOW" "You can add it manually to the .env file later."
        fi
        echo ""
    done

    # Reload environment after updates
    set -a
    source .env 2>/dev/null || true
    set +a
else
    print_color "$GREEN" "✅ All required credentials are configured"
fi

echo ""
print_color "$BLUE" "📦 Installing root dependencies..."

# Check if node_modules exists, if not or if package.json is newer, install
if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules" ]; then
    print_color "$YELLOW" "Running npm install..."
    
    # Check if npm is available
    if ! command -v npm &> /dev/null; then
        print_color "$RED" "❌ npm is not installed. Please install Node.js and npm first."
        exit 1
    fi
    
    # Check if pnpm is available and use it, otherwise use npm
    if command -v pnpm &> /dev/null; then
        pnpm install
    else
        npm install
    fi
    
    if [ $? -eq 0 ]; then
        print_color "$GREEN" "✅ Root dependencies installed successfully"
    else
        print_color "$RED" "❌ Failed to install dependencies"
        exit 1
    fi
else
    print_color "$GREEN" "✅ Root dependencies are up to date"
fi

echo ""
# Check if running on Replit or similar environment
if [ -n "$REPLIT_DEV_DOMAIN" ]; then
    print_color "$GREEN" "🌐 Running on Replit!"
    print_color "$BLUE" "Domain: $REPLIT_DEV_DOMAIN"
    print_color "$CYAN" "Note: Replit automatically forwards ports as configured in .replit file"
    ENVIRONMENT="replit"
else
    print_color "$YELLOW" "💻 Running locally"
    ENVIRONMENT="local"
fi

# Final check that all required variables are set
FINAL_CHECK_FAILED=false
for var in "${REQUIRED_VARS[@]}"; do
    # Re-source the .env file to get latest values
    set -a
    source .env 2>/dev/null || true
    set +a
    
    if [ -z "${!var}" ]; then
        print_color "$RED" "❌ ${var} is still not set!"
        FINAL_CHECK_FAILED=true
    fi
done

if [ "$FINAL_CHECK_FAILED" = true ]; then
    print_color "$RED" "❌ Cannot start demo without all required credentials."
    print_color "$YELLOW" "Please add the missing credentials to your .env file and run this script again."
    exit 1
fi

echo ""
print_color "$BLUE" "🎯 Starting USDC to SOL Swap Agents Server..."
print_color "$YELLOW" "This will start two agent servers:"
if [ "$ENVIRONMENT" = "replit" ]; then
    print_color "$YELLOW" "• Agent A (User): Port 7576 (accessible via port 3000) - Wants to swap USDC for SOL"
    print_color "$YELLOW" "• Agent B (Swap Service): Port 7577 (accessible via port 3001) - Executes the swap using Pyth price feeds"
else
    print_color "$YELLOW" "• Agent A (User): Port 7576 - Wants to swap USDC for SOL"
    print_color "$YELLOW" "• Agent B (Swap Service): Port 7577 - Executes the swap using Pyth price feeds"
fi
echo ""

# Start the agents server in the background
print_color "$GREEN" "🚀 Starting agent servers..."
npx tsx swap-agents-server.ts &
AGENTS_PID=$!

# Wait a bit for the servers to start
sleep 3

# Check if agents are running
AGENT_A_RUNNING=false
AGENT_B_RUNNING=false

# Set ports based on environment
if [ "$ENVIRONMENT" = "replit" ]; then
    AGENT_A_PORT="3000"
    AGENT_B_PORT="3001"
    WEB_UI_PORT="80"
    CHECK_A_PORT="7576"  # Still check local ports for service status
    CHECK_B_PORT="7577"
else
    AGENT_A_PORT="7576"
    AGENT_B_PORT="7577"
    WEB_UI_PORT="3000"
    CHECK_A_PORT="7576"
    CHECK_B_PORT="7577"
fi

for i in {1..5}; do
    if curl -f -s http://localhost:${CHECK_A_PORT} > /dev/null 2>&1; then
        AGENT_A_RUNNING=true
    fi
    if curl -f -s http://localhost:${CHECK_B_PORT} > /dev/null 2>&1; then
        AGENT_B_RUNNING=true
    fi
    
    if [ "$AGENT_A_RUNNING" = true ] && [ "$AGENT_B_RUNNING" = true ]; then
        break
    fi
    
    sleep 1
done

if [ "$AGENT_A_RUNNING" = true ] && [ "$AGENT_B_RUNNING" = true ]; then
    print_color "$GREEN" "✅ Both agent servers are running!"
else
    print_color "$YELLOW" "⚠️  Agent servers may still be starting..."
fi

# Display service endpoints
print_color "$BLUE" "\nAgent Server Endpoints:"
if [ "$ENVIRONMENT" = "replit" ]; then
    print_color "$YELLOW" "📌 Port forwarding on Replit:"
    print_color "$CYAN" "  • Local port 7576 → External port ${AGENT_A_PORT}"
    print_color "$CYAN" "  • Local port 7577 → External port ${AGENT_B_PORT}"
    print_color "$CYAN" "  • Local port 3000 → External port ${WEB_UI_PORT} (Web UI)"
    echo ""
    print_color "$GREEN" "  • Agent A (User): https://$REPLIT_DEV_DOMAIN:${AGENT_A_PORT}"
    print_color "$GREEN" "  • Agent B (Swap Service): https://$REPLIT_DEV_DOMAIN:${AGENT_B_PORT}"
else
    print_color "$GREEN" "  • Agent A (User): http://localhost:${AGENT_A_PORT}"
    print_color "$GREEN" "  • Agent B (Swap Service): http://localhost:${AGENT_B_PORT}"
fi

echo ""
print_color "$BLUE" "💱 Swap Demo Features:"
print_color "$CYAN" "  • Real-time SOL/USD pricing from Pyth Network"
print_color "$CYAN" "  • USDC payments via ACK Lab SDK"
print_color "$CYAN" "  • Simulated DEX swap execution"
print_color "$CYAN" "  • SOL delivery to the wallet"

echo ""
print_color "$BLUE" "🎮 Choose how to interact with the demo:"
print_color "$GREEN" "  1. Tutorial - Interactive ACK-Lab rules tutorial (RECOMMENDED)"
print_color "$GREEN" "  2. CLI Demo - Free-form command-line interface"
print_color "$GREEN" "  3. Web UI - Visual web interface (requires additional setup)"
print_color "$GREEN" "  4. Exit - Stop the demo"
echo ""
print_color "$YELLOW" "💡 Tip: You can force exit at any time with Ctrl+C"
echo ""

while true; do
    read -p "$(print_color "$CYAN" "Enter your choice (1/2/3/4): ")" choice
    
    case $choice in
        1)
            print_color "$GREEN" "\n🎓 Starting Interactive Tutorial..."
            print_color "$YELLOW" "This tutorial will guide you through ACK-Lab's rule system."
            print_color "$YELLOW" "You'll learn how to protect your automated transactions with rules."
            print_color "$CYAN" "Follow the step-by-step instructions to complete the tutorial.\n"
            
            # Run the tutorial
            npx tsx cli-demos/swap-demo.ts
            
            echo ""
            print_color "$BLUE" "Tutorial finished. What would you like to do next?"
            print_color "$GREEN" "  1. Tutorial - Run again"
            print_color "$GREEN" "  2. CLI Demo - Try free-form swaps"
            print_color "$GREEN" "  3. Web UI - Try the visual interface"
            print_color "$GREEN" "  4. Exit - Stop the demo"
            echo ""
            ;;
            
        2)
            print_color "$GREEN" "\n🚀 Starting CLI Demo (Free-form mode)..."
            print_color "$YELLOW" "You can request USDC to SOL swaps directly from the command line."
            print_color "$YELLOW" "Example: 'swap 25 USDC for SOL'"
            print_color "$YELLOW" "Type /exit to quit the CLI demo and return to this menu."
            print_color "$CYAN" "Or use Ctrl+C to force exit the demo.\n"
            
            # For free-form mode, we need a way to skip the tutorial
            # We can use an environment variable to signal this
            export SKIP_TUTORIAL=true
            npx tsx cli-demos/swap-demo.ts
            unset SKIP_TUTORIAL
            
            echo ""
            print_color "$BLUE" "CLI Demo finished. What would you like to do next?"
            print_color "$GREEN" "  1. Tutorial - Learn about rules"
            print_color "$GREEN" "  2. CLI Demo - Run again"
            print_color "$GREEN" "  3. Web UI - Try the visual interface"
            print_color "$GREEN" "  4. Exit - Stop the demo"
            echo ""
            ;;
            
        3)
            print_color "$GREEN" "\n🌐 Setting up Web UI..."
            
            # Check if web-ui directory exists
            if [ ! -d "web-ui" ]; then
                print_color "$RED" "❌ web-ui directory not found!"
                continue
            fi
            
            # Install web UI dependencies if needed
            if [ ! -d "web-ui/node_modules" ] || [ "web-ui/package.json" -nt "web-ui/node_modules" ]; then
                print_color "$YELLOW" "📦 Installing Web UI dependencies..."
                cd web-ui
                npm install
                cd ..
                
                if [ $? -eq 0 ]; then
                    print_color "$GREEN" "✅ Web UI dependencies installed"
                else
                    print_color "$RED" "❌ Failed to install Web UI dependencies"
                    continue
                fi
            fi
            
            print_color "$GREEN" "🚀 Starting Web UI..."
            if [ "$ENVIRONMENT" = "replit" ]; then
                print_color "$YELLOW" "📌 On Replit: Local port 3000 is forwarded to external port ${WEB_UI_PORT}"
                if [ "$WEB_UI_PORT" = "80" ]; then
                    print_color "$YELLOW" "The web interface will open at https://$REPLIT_DEV_DOMAIN"
                else
                    print_color "$YELLOW" "The web interface will open at https://$REPLIT_DEV_DOMAIN:${WEB_UI_PORT}"
                fi
            else
                print_color "$YELLOW" "The web interface will open at http://localhost:${WEB_UI_PORT}"
            fi
            print_color "$YELLOW" "Press Ctrl+C to stop the Web UI and return to this menu.\n"
            
            # Start the web UI
            cd web-ui
            npm run dev
            cd ..
            
            echo ""
            print_color "$BLUE" "Web UI stopped. What would you like to do next?"
            print_color "$GREEN" "  1. Tutorial - Learn about rules"
            print_color "$GREEN" "  2. CLI Demo - Try the command-line interface"
            print_color "$GREEN" "  3. Web UI - Run again"
            print_color "$GREEN" "  4. Exit - Stop the demo"
            echo ""
            ;;
            
        4)
            print_color "$YELLOW" "\n👋 Shutting down..."
            
            # Kill the agents server
            if [ -n "$AGENTS_PID" ]; then
                kill $AGENTS_PID 2>/dev/null
                print_color "$GREEN" "✅ Agent servers stopped"
            fi
            
            print_color "$BLUE" "Thanks for trying the USDC to SOL Swap Demo!"
            print_color "$CYAN" "\n📖 Quick Reference:"
            print_color "$CYAN" "  • Exit shortcut: Ctrl+C (works on all platforms: Windows/Linux/Mac)"
            print_color "$CYAN" "  • Restart demo: Run ./setup-and-run.sh again"
            print_color "$CYAN" "  • Documentation: Check README.md for more details"
            print_color "$CYAN" "  • Price feeds: Powered by Pyth Network (https://pyth.network)\n"
            exit 0
            ;;
            
        *)
            print_color "$RED" "Invalid choice. Please enter 1, 2, 3, or 4."
            ;;
    esac
done

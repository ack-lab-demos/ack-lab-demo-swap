import "dotenv/config"
import { z } from "zod"
import colors from "yoctocolors"
import { input, select } from "@inquirer/prompts"
import { exec } from "child_process"
import { promisify } from "util"

const execAsync = promisify(exec)

// Check if agents are available
async function checkAgentsAvailable(): Promise<boolean> {
  try {
    // Just check if the server responds on port 7576
    // Any response (even 404) means the server is running
    await fetch("http://localhost:7576/", {
      method: "GET",
      signal: AbortSignal.timeout(2000) // 2 second timeout
    })
    // If we get any response, the server is running
    return true
  } catch {
    // Connection refused or timeout means server is not running
    return false
  }
}

// Helper to execute swap requests
async function executeSwap(command: string): Promise<{ success: boolean; message: string }> {
  try {
    const result = await fetch("http://localhost:7576/chat", {
      method: "POST",
      body: JSON.stringify({ message: command }),
      headers: {
        "Content-Type": "application/json"
      }
    })

    if (!result.ok) {
      return {
        success: false,
        message: `Failed to communicate with agent: ${result.status} ${result.statusText}`
      }
    }

    const responseSchema = z.object({ text: z.string() })
    const { text } = responseSchema.parse(await result.json())
    
    // Check if the response indicates an error or rule violation
    // Match actual policy error messages from the system
    const isError = text.toLowerCase().includes("error") || 
                    text.toLowerCase().includes("failed") ||
                    text.toLowerCase().includes("rejected") ||
                    text.toLowerCase().includes("spend limit") ||
                    text.toLowerCase().includes("max spend exceeded") ||
                    text.toLowerCase().includes("min balance check failed") ||
                    text.toLowerCase().includes("exceeded") ||
                    text.toLowerCase().includes("limit")
    
    return {
      success: !isError,
      message: text
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error"
    }
  }
}

// Helper to wait for user confirmation
async function waitForUserConfirmation(message: string = "Press Enter when ready to continue..."): Promise<void> {
  await input({
    message: colors.yellow(message)
  })
}

// Helper to open ACK-lab in browser
async function openACKLab(): Promise<void> {
  console.log(colors.blue("\n🌐 Opening ACK-lab in your browser..."))
  try {
    const platform = process.platform
    const url = "https://ack-lab.catenalabs.com"
    
    if (platform === "darwin") {
      await execAsync(`open "${url}"`)
    } else if (platform === "win32") {
      await execAsync(`start "" "${url}"`)
    } else {
      await execAsync(`xdg-open "${url}"`)
    }
    
    console.log(colors.gray(`   If the browser didn't open, please visit: ${url}`))
  } catch {
    console.log(colors.gray("   Please open your browser and go to: https://ack-lab.catenalabs.com"))
  }
}

// Onboarding flow steps
async function step1_InitialSwap() {
  console.log(colors.cyan("\n📚 Step 1: Your First Swap"))
  console.log(colors.gray("━".repeat(50)))
  console.log(colors.white(`
Welcome to the ACK-lab Rules Tutorial!

In this tutorial, you'll learn how to use ACK-lab's powerful rule system
to protect and control your automated transactions.

Let's start with a simple swap that should work without any restrictions.
`))

  console.log(colors.green("➤ Try executing: ") + colors.white("swap 25 USDC for SOL"))
  console.log(colors.gray("   This should work successfully with no rules in place.\n"))

  const userCommand = await input({
    message: colors.cyan("Enter command:")
  })

  console.log(colors.yellow("\n⏳ Processing your swap..."))
  const result = await executeSwap(userCommand)
  
  if (result.success) {
    console.log(colors.green("\n✅ SUCCESS!"), result.message)
    console.log(colors.white(`
Excellent! Your swap went through successfully.

This worked because there are currently no rules limiting your transactions.
But what if you wanted to protect yourself from accidentally making large trades?
`))
    return true
  } else {
    console.log(colors.red("\n❌ Error:"), result.message)
    console.log(colors.yellow("   Please try again with the suggested command: swap 25 USDC for SOL"))
    return false
  }
}

async function step2_SetMaxTransactionSize() {
  console.log(colors.cyan("\n📚 Step 2: Setting Transaction Limits"))
  console.log(colors.gray("━".repeat(50)))
  console.log(colors.white(`
Now let's add some safety rules to protect against large transactions.

We'll set a maximum transaction size of $10. This means any swap attempt
over $10 will be automatically rejected - protecting you from mistakes.
`))

  console.log(colors.blue("\n📋 Your Task:"))
  console.log(colors.white("1. Go to ACK-lab at: ") + colors.cyan("https://ack-lab.catenalabs.com"))
  console.log(colors.white("2. Navigate to the Rules tab in your Swap Bot agent"))
  console.log(colors.white("3. Create a new rule with:"))
  console.log(colors.yellow("   - Type: Maximum Transaction Size"))
  console.log(colors.yellow("   - Value: $10"))
  console.log(colors.white("4. Save and activate the rule\n"))

  const shouldOpenBrowser = await select({
    message: "Would you like me to open ACK-lab in your browser?",
    choices: [
      { name: "Yes, open it", value: true },
      { name: "No, I'll open it myself", value: false }
    ]
  })

  if (shouldOpenBrowser) {
    await openACKLab()
  }

  await waitForUserConfirmation("\nPress Enter when you've set the $10 maximum transaction size rule...")
  
  console.log(colors.green("✓ Great! Rule should now be active."))
}

async function step3_TestMaxTransactionRule() {
  console.log(colors.cyan("\n📚 Step 3: Testing the Transaction Limit"))
  console.log(colors.gray("━".repeat(50)))
  console.log(colors.white(`
Now let's see your rule in action! Try the same swap command again.

Since 25 USDC exceeds your $10 limit, this swap should now be BLOCKED
by ACK-lab's rule engine - protecting you from the large transaction.
`))

  console.log(colors.green("➤ Try executing: ") + colors.white("swap 25 USDC for SOL"))
  console.log(colors.gray("   This should now fail due to the $10 transaction limit.\n"))

  const userCommand = await input({
    message: colors.cyan("Enter command:")
  })

  console.log(colors.yellow("\n⏳ Processing your swap..."))
  const result = await executeSwap(userCommand)
  
  // Check for the specific error message for transaction limit
  if (!result.success && (
    result.message.toLowerCase().includes("spend limit per transaction") ||
    result.message.toLowerCase().includes("spending limit") ||
    result.message.toLowerCase().includes("transaction limit")
  )) {
    console.log(colors.red("\n🛡️ BLOCKED BY RULE:"), result.message)
    console.log(colors.white(`
Perfect! The rule worked as expected.

Your $10 maximum transaction size rule successfully blocked the 25 USDC swap.
This demonstrates how rules protect you from unintended large transactions.
`))
    return true
  } else if (result.success) {
    console.log(colors.yellow("\n⚠️ Unexpected:"), result.message)
    console.log(colors.yellow(`
The swap succeeded but it should have been blocked.
Please ensure you've set the maximum transaction size rule to $10 in ACK-lab.
`))
    return false
  } else {
    console.log(colors.red("\n❌ Error:"), result.message)
    console.log(colors.yellow("   The swap failed but not due to the expected rule. Please check your rule settings."))
    return false
  }
}

async function step4_SetHourlySpendLimit() {
  console.log(colors.cyan("\n📚 Step 4: Rate Limiting with Hourly Spend Limits"))
  console.log(colors.gray("━".repeat(50)))
  console.log(colors.white(`
Transaction size limits are useful, but what about preventing rapid spending?

Let's replace the transaction size rule with an hourly spend limit.
This protects against both automated scripts gone wrong and potential attacks.
`))

  console.log(colors.blue("\n📋 Your Task:"))
  console.log(colors.white("1. Go back to ACK-lab"))
  console.log(colors.white("2. ") + colors.red("Delete") + colors.white(" the $10 maximum transaction size rule"))
  console.log(colors.white("3. Create a new rule with:"))
  console.log(colors.yellow("   - Type: Maximum Spend Per Hour"))
  console.log(colors.yellow("   - Value: $60"))
  console.log(colors.white("4. Save and activate the rule\n"))

  const shouldOpenBrowser = await select({
    message: "Would you like me to open ACK-lab again?",
    choices: [
      { name: "Yes, open it", value: true },
      { name: "No, already have it open", value: false }
    ]
  })

  if (shouldOpenBrowser) {
    await openACKLab()
  }

  await waitForUserConfirmation("\nPress Enter when you've removed the old rule and set the $60/hour spend limit...")
  
  console.log(colors.green("✓ Perfect! Hourly spend limit should now be active."))
}

async function step5_TestHourlyLimit() {
  console.log(colors.cyan("\n📚 Step 5: Testing the Hourly Spend Limit"))
  console.log(colors.gray("━".repeat(50)))
  console.log(colors.white(`
With the hourly spend limit of $60, let's do another 25 USDC swap.

Remember: You already spent $25 in Step 1, so this will bring your
total to $50 for this hour - still within your $60 limit!
`))

  console.log(colors.green("➤ Try executing: ") + colors.white("swap 25 USDC for SOL"))
  console.log(colors.gray("   This should work ($25 + $25 = $50, still under $60/hour limit).\n"))

  const userCommand = await input({
    message: colors.cyan("Enter command:")
  })

  console.log(colors.yellow("\n⏳ Processing your swap..."))
  const result = await executeSwap(userCommand)
  
  if (result.success) {
    console.log(colors.green("\n✅ SUCCESS!"), result.message)
    console.log(colors.white(`
Good! This swap went through because your total is still within the $60/hour limit.

Current hourly spending: $50 out of your $60 budget
  • Step 1: $25 USDC
  • Step 5: $25 USDC (this swap)
`))
    return true
  } else {
    console.log(colors.red("\n❌ Error:"), result.message)
    console.log(colors.yellow("   The swap should have succeeded. Please check your rules are set correctly."))
    return false
  }
}

async function step6_TriggerRateLimit() {
  console.log(colors.cyan("\n📚 Step 6: Triggering the Rate Limit"))
  console.log(colors.gray("━".repeat(50)))
  console.log(colors.white(`
Perfect! Let's review your spending so far:
• Step 1: Spent $25 USDC
• Step 5: Spent another $25 USDC
• Total spent this hour: $50 out of your $60 limit

Now let's try ONE MORE swap. Since you've already spent $50, 
another $25 swap would bring you to $75, which exceeds your 
$60/hour limit. The system should block this!
`))

  console.log(colors.green("\n➤ Final swap - Try: ") + colors.white("swap 25 USDC for SOL"))
  console.log(colors.gray("   This should be BLOCKED ($50 + $25 = $75, exceeds $60/hour limit).\n"))

  const userCommand = await input({
    message: colors.cyan("Enter command to trigger the rate limit:")
  })

  console.log(colors.yellow("\n⏳ Processing final swap..."))
  const result = await executeSwap(userCommand)
  
  // Check for the specific error message for max spend limit
  if (!result.success && (
    result.message.toLowerCase().includes("max spend exceeded") ||
    result.message.toLowerCase().includes("hourly limit") ||
    result.message.toLowerCase().includes("spend limit") ||
    result.message.toLowerCase().includes("rate limit") ||
    result.message.toLowerCase().includes("exceeded")
  )) {
    console.log(colors.red("\n🛡️ RATE LIMIT HIT:"), result.message)
    console.log(colors.white(`
Excellent! The hourly spend limit protected you from excessive spending.

You had already spent $50 within the hour ($25 + $25 from previous swaps).
The system correctly blocked this swap that would have brought your total
to $75, keeping you within your $60/hour budget.
`))
    return true
  } else if (result.success) {
    console.log(colors.yellow("\n⚠️ Note:"), result.message)
    console.log(colors.white(`
The swap succeeded. This shouldn't happen if you've correctly set the
$60/hour limit and already spent $50. Please check your rule configuration.
`))
    return false
  } else {
    console.log(colors.red("\n❌ Error:"), result.message)
    return false
  }
}

async function completeTutorial() {
  console.log(colors.cyan("\n🎉 CONGRATULATIONS! Tutorial Complete!"))
  console.log(colors.gray("━".repeat(50)))
  console.log(colors.white(`
You've successfully learned how to use ACK-lab's rule system!

${colors.green("✓ What you've learned:")}
• How to create transaction size limits to prevent large trades
• How to set hourly spend limits for rate limiting
• How rules automatically protect your automated transactions
• How to modify and remove rules based on your needs

${colors.blue("💡 Key Takeaways:")}
• Rules run at the infrastructure level - no code changes needed
• Multiple rule types can be combined for comprehensive protection
• Rules help prevent both accidents and malicious activity
• You maintain full control over your security policies

${colors.yellow("🚀 Next Steps:")}
• Explore other rule types in ACK-lab
• Combine multiple rules for layered security
• Integrate rules into your production workflows

Thank you for completing the ACK-lab Rules Tutorial!
`))
}

async function runFreeFormMode() {
  console.log(colors.cyan("\n=== USDC to SOL Swap Demo (CLI) ==="))
  console.log(colors.gray("This CLI connects to the swap agents running on localhost"))
  console.log(colors.gray("Make sure the agents are running with: npm run agents:start\n"))
  
  console.log(colors.yellow("\nExchange USDC for SOL using the Swap Agent"))
  console.log(colors.gray("Current rate: SOL/USD price from Pyth Network"))
  console.log(colors.gray("Type /exit to quit\n"))

  while (true) {
    const userInput = await input({
      message: colors.cyan("Enter your request (e.g., 'swap 25 USDC for SOL'):")
    })

    if (userInput.trim().toLowerCase() === "/exit") {
      console.log(colors.blue("Goodbye!"))
      break
    }

    console.log(colors.green("\n>>> Processing request:"), userInput)

    const result = await executeSwap(userInput)
    
    if (result.success) {
      console.log(colors.green("\n>>> Result:"), result.message)
    } else {
      console.log(colors.red("\n>>> Error:"), result.message)
    }
    
    console.log(colors.gray("\n" + "=".repeat(50) + "\n"))
  }
}

async function main() {
  // Check if we should skip the tutorial and run in free-form mode
  if (process.env.SKIP_TUTORIAL === "true") {
    // Check if agents are available
    console.log(colors.gray("🔍 Checking system status..."))
    const agentsAvailable = await checkAgentsAvailable()
    
    if (!agentsAvailable) {
      console.log(colors.red("❌ Agents are not running!"))
      console.log(colors.yellow("\nPlease start the agents first:"))
      console.log(colors.gray("  Run in another terminal: npm run agents:start"))
      console.log(colors.gray("  Or: tsx swap-agents-server.ts\n"))
      process.exit(1)
    }
    
    console.log(colors.green("✅ Agents are running and ready!"))
    await runFreeFormMode()
    return
  }
  
  // Otherwise, run the tutorial mode
  console.log(colors.cyan("\n" + "=".repeat(60)))
  console.log(colors.cyan("       🎓 Swap Agent Demo - ACK-lab Rules Tutorial"))
  console.log(colors.cyan("=".repeat(60)))
  console.log(colors.white(`
Welcome to the Swap Agent Demo!

This interactive guide will teach you how to use ACK-lab's powerful
rule system to protect and control your automated transactions.

You'll learn by doing - setting up real rules and seeing them in action!
`))
  
  // Check if agents are available
  console.log(colors.gray("\n🔍 Checking system status..."))
  const agentsAvailable = await checkAgentsAvailable()
  
  if (!agentsAvailable) {
    console.log(colors.red("\n❌ Swap agents are not running!"))
    console.log(colors.yellow("\n📝 To start this tutorial, you need to:"))
    console.log(colors.white("1. Open a new terminal"))
    console.log(colors.white("2. Run: ") + colors.cyan("npm run agents:start"))
    console.log(colors.white("3. Come back here and run this tutorial again\n"))
    process.exit(1)
  }
  
  console.log(colors.green("✅ System ready! Let's begin your journey.\n"))
  
  await waitForUserConfirmation("Press Enter to start the tutorial...")

  // Step 1: Initial successful swap
  let success = false
  while (!success) {
    success = await step1_InitialSwap()
    if (!success) {
      const retry = await select({
        message: "Would you like to try Step 1 again?",
        choices: [
          { name: "Yes, try again", value: true },
          { name: "No, exit tutorial", value: false }
        ]
      })
      if (!retry) {
        console.log(colors.blue("\nTutorial ended. Come back anytime!"))
        process.exit(0)
      }
    }
  }

  // Step 2: Set max transaction size rule
  await step2_SetMaxTransactionSize()

  // Step 3: Test max transaction rule (should fail)
  success = false
  while (!success) {
    success = await step3_TestMaxTransactionRule()
    if (!success) {
      const action = await select({
        message: "The rule doesn't seem to be working. What would you like to do?",
        choices: [
          { name: "I'll check my rule settings and try again", value: "retry" },
          { name: "Skip this step", value: "skip" },
          { name: "Exit tutorial", value: "exit" }
        ]
      })
      
      if (action === "exit") {
        console.log(colors.blue("\nTutorial ended. Come back anytime!"))
        process.exit(0)
      } else if (action === "skip") {
        break
      }
    }
  }

  // Step 4: Replace with hourly spend limit
  await step4_SetHourlySpendLimit()

  // Step 5: Test hourly limit (first swap should work)
  success = false
  while (!success) {
    success = await step5_TestHourlyLimit()
    if (!success) {
      const action = await select({
        message: "What would you like to do?",
        choices: [
          { name: "Try again", value: "retry" },
          { name: "Skip to next step", value: "skip" },
          { name: "Exit tutorial", value: "exit" }
        ]
      })
      
      if (action === "exit") {
        console.log(colors.blue("\nTutorial ended. Come back anytime!"))
        process.exit(0)
      } else if (action === "skip") {
        break
      }
    }
  }

  // Step 6: Trigger rate limit
  await step6_TriggerRateLimit()

  // Complete tutorial
  await completeTutorial()

  const continueChoice = await select({
    message: "\nWhat would you like to do next?",
    choices: [
      { name: "Practice more with free-form swaps", value: "practice" },
      { name: "Exit tutorial", value: "exit" }
    ]
  })

  if (continueChoice === "practice") {
    console.log(colors.cyan("\n=== Free Practice Mode ==="))
    console.log(colors.gray("You can now experiment freely with swaps and rules."))
    console.log(colors.gray("Type /exit to quit\n"))

    while (true) {
      const userInput = await input({
        message: colors.cyan("Enter your swap command:")
      })

      if (userInput.trim().toLowerCase() === "/exit") {
        console.log(colors.blue("\nThanks for learning with ACK-lab! Goodbye! 👋"))
        break
      }

      console.log(colors.yellow("\n⏳ Processing..."))
      const result = await executeSwap(userInput)
      
      if (result.success) {
        console.log(colors.green("✅"), result.message)
      } else {
        console.log(colors.red("❌"), result.message)
      }
      
      console.log(colors.gray("\n" + "─".repeat(50) + "\n"))
    }
  } else {
    console.log(colors.blue("\nThanks for learning with ACK-lab! Goodbye! 👋"))
  }
}

main().catch(console.error)
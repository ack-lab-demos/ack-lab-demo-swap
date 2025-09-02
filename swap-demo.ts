import "dotenv/config"
import { z } from "zod"
import colors from "yoctocolors"
import { input, select } from "@inquirer/prompts"
import { exec } from "child_process"
import { promisify } from "util"

const execAsync = promisify(exec)

// ==================== Configuration ====================
const SWAP_USER_URL = "http://localhost:7576"
const ACK_LAB_URL = "https://ack-lab.catenalabs.com"

// ==================== Agent Communication ====================
async function checkAgentsAvailable(): Promise<boolean> {
  try {
    await fetch(`${SWAP_USER_URL}/`, {
      method: "GET",
      signal: AbortSignal.timeout(2000)
    })
    return true
  } catch {
    return false
  }
}

async function executeSwap(command: string): Promise<{ success: boolean; message: string }> {
  try {
    const result = await fetch(`${SWAP_USER_URL}/chat`, {
      method: "POST",
      body: JSON.stringify({ message: command }),
      headers: { "Content-Type": "application/json" }
    })

    if (!result.ok) {
          return {
      success: false,
      message: `Failed to communicate with swap user: ${result.status} ${result.statusText}`
    }
    }

    const responseSchema = z.object({ text: z.string() })
    const { text } = responseSchema.parse(await result.json())
    
    const errorIndicators = [
      "error", "failed", "rejected", "spend limit",
      "max spend exceeded", "min balance check failed",
      "exceeded", "limit"
    ]
    
    const isError = errorIndicators.some(indicator => 
      text.toLowerCase().includes(indicator)
    )
    
    return { success: !isError, message: text }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error"
    }
  }
}

// ==================== Browser Control ====================
async function openACKLab(): Promise<void> {
  console.log(colors.blue("\n🌐 Opening ACK-lab in your browser..."))
  
  try {
    const platform = process.platform
    const openCommand = 
      platform === "darwin" ? `open "${ACK_LAB_URL}"` :
      platform === "win32" ? `start "" "${ACK_LAB_URL}"` :
      `xdg-open "${ACK_LAB_URL}"`
    
    await execAsync(openCommand)
    console.log(colors.gray(`   If the browser didn't open, please visit: ${ACK_LAB_URL}`))
  } catch {
    console.log(colors.gray(`   Please open your browser and go to: ${ACK_LAB_URL}`))
  }
}

// ==================== UI Utilities ====================
async function waitForUserConfirmation(message: string = "Press Enter when ready to continue..."): Promise<void> {
  await input({ message: colors.yellow(message) })
}

function printHeader(title: string, subtitle?: string) {
  console.log(colors.cyan(`\n📚 ${title}`))
  console.log(colors.gray("━".repeat(50)))
  if (subtitle) {
    console.log(colors.white(subtitle))
  }
}

function printSuccess(message: string, details?: string) {
  console.log(colors.green(`\n✅ ${message}`), details || '')
}

function printError(message: string, details?: string) {
  console.log(colors.red(`\n❌ ${message}`), details || '')
}

function printWarning(message: string, details?: string) {
  console.log(colors.yellow(`\n⚠️ ${message}`), details || '')
}

function printBlocked(message: string, details?: string) {
  console.log(colors.red(`\n🛡️ ${message}`), details || '')
}

// ==================== Tutorial Steps ====================
class SwapTutorial {
  private totalSpent = 0

  async runStep1_InitialSwap(): Promise<boolean> {
    printHeader("Step 1: Your First Swap", `
Welcome to the ACK-lab Rules Tutorial!

In this tutorial, you'll learn how to use ACK-lab's powerful rule system
to protect and control your automated transactions.

Let's start with a simple swap that should work without any restrictions.
`)

    console.log(colors.green("➤ Try executing: ") + colors.white("swap 25 USDC for SOL"))
    console.log(colors.gray("   This should work successfully with no rules in place.\n"))

    const userCommand = await input({ message: colors.cyan("Enter command:") })
    console.log(colors.yellow("\n⏳ Processing your swap..."))
    
    const result = await executeSwap(userCommand)
    
    if (result.success) {
      this.totalSpent = 25
      printSuccess("SUCCESS!", result.message)
      console.log(colors.white(`
Excellent! Your swap went through successfully.

This worked because there are currently no rules limiting your transactions.
But what if you wanted to protect yourself from accidentally making large trades?
`))
      return true
    }
    
    printError("Error:", result.message)
    console.log(colors.yellow("   Please try again with the suggested command: swap 25 USDC for SOL"))
    return false
  }

  async runStep2_SetMaxTransactionSize(): Promise<void> {
    printHeader("Step 2: Setting Transaction Limits", `
Now let's add some safety rules to protect against large transactions.

We'll set a transaction spend limit of $10. This means any swap attempt
over $10 will be automatically rejected - protecting you from mistakes.
`)

    console.log(colors.blue("\n📋 Your Task:"))
    console.log(colors.white("1. Go to ACK-lab at: ") + colors.cyan(ACK_LAB_URL))
    console.log(colors.white("2. Navigate to the Rules tab in your Swap User agent"))
    console.log(colors.white("3. Create a new rule with:"))
    console.log(colors.yellow("   - Type: Transaction Spend Limit"))
    console.log(colors.yellow("   - Amount: $10"))
    console.log(colors.white("4. Save and activate the rule\n"))

    const shouldOpen = await this.askToOpenBrowser()
    if (shouldOpen) await openACKLab()

    await waitForUserConfirmation("\nPress Enter when you've set the $10 transaction spend limit rule...")
    console.log(colors.green("✓ Great! Rule should now be active."))
  }

  async runStep3_TestMaxTransactionRule(): Promise<boolean> {
    printHeader("Step 3: Testing the Transaction Limit", `
Now let's see your rule in action! Try the same swap command again.

Since 25 USDC exceeds your $10 limit, this swap should now be BLOCKED
by ACK-lab's rule engine - protecting you from the large transaction.
`)

    console.log(colors.green("➤ Try executing: ") + colors.white("swap 25 USDC for SOL"))
    console.log(colors.gray("   This should now fail due to the $10 transaction limit.\n"))

    const userCommand = await input({ message: colors.cyan("Enter command:") })
    console.log(colors.yellow("\n⏳ Processing your swap..."))
    
    const result = await executeSwap(userCommand)
    
    const isBlockedByRule = !result.success && [
      "spend limit per transaction",
      "spending limit",
      "transaction limit"
    ].some(msg => result.message.toLowerCase().includes(msg))

    if (isBlockedByRule) {
      printBlocked("BLOCKED BY RULE:", result.message)
      console.log(colors.white(`
Perfect! The rule worked as expected.

Your $10 transaction spend limit rule successfully blocked the 25 USDC swap.
This demonstrates how rules protect you from unintended large transactions.
`))
      return true
    }
    
    if (result.success) {
      printWarning("Unexpected:", result.message)
      console.log(colors.yellow(`
The swap succeeded but it should have been blocked.
Please ensure you've set the transaction spend limit rule to $10 in ACK-lab.
`))
    } else {
      printError("Error:", result.message)
      console.log(colors.yellow("   The swap failed but not due to the expected rule. Please check your rule settings."))
    }
    
    return false
  }

  async runStep4_SetHourlySpendLimit(): Promise<void> {
    printHeader("Step 4: Rate Limiting with Hourly Spend Limits", `
Transaction size limits are useful, but what about preventing rapid spending?

Let's replace the transaction spend limit rule with an hourly spend limit.
This protects against both automated scripts gone wrong and potential attacks.
`)

    console.log(colors.blue("\n📋 Your Task:"))
    console.log(colors.white("1. Go back to ACK-lab"))
    console.log(colors.white("2. ") + colors.red("Disable") + colors.white(" the $10 transaction spend limit rule"))
    console.log(colors.white("3. Create a new rule with:"))
    console.log(colors.yellow("   - Type: Rate Limit"))
    console.log(colors.yellow("   - Amount: $60"))
    console.log(colors.yellow("   - Time window: 1 hour"))
    console.log(colors.white("4. Save and activate the rule\n"))

    const shouldOpen = await this.askToOpenBrowser("Would you like me to open ACK-lab again?")
    if (shouldOpen) await openACKLab()

    await waitForUserConfirmation("\nPress Enter when you've removed the old rule and set the $60/hour spend limit...")
    console.log(colors.green("✓ Perfect! Hourly rate limit should now be active."))
  }

  async runStep5_TestHourlyLimit(): Promise<boolean> {
    printHeader("Step 5: Testing the Hourly rate Limit", `
With the hourly rate limit of $60, let's do another 25 USDC swap.

Remember: You already spent $${this.totalSpent} in Step 1, so this will bring your
total to $${this.totalSpent + 25} for this hour - still within your $60 limit!
`)

    console.log(colors.green("➤ Try executing: ") + colors.white("swap 25 USDC for SOL"))
    console.log(colors.gray(`   This should work ($${this.totalSpent} + $25 = $${this.totalSpent + 25}, still under $60/hour limit).\n`))

    const userCommand = await input({ message: colors.cyan("Enter command:") })
    console.log(colors.yellow("\n⏳ Processing your swap..."))
    
    const result = await executeSwap(userCommand)
    
    if (result.success) {
      this.totalSpent += 25
      printSuccess("SUCCESS!", result.message)
      console.log(colors.white(`
Good! This swap went through because your total is still within the $60/hour limit.

Current hourly spending: $${this.totalSpent} out of your $60 budget
  • Step 1: $25 USDC
  • Step 5: $25 USDC (this swap)
`))
      return true
    }
    
    printError("Error:", result.message)
    console.log(colors.yellow("   The swap should have succeeded. Please check your rules are set correctly."))
    return false
  }

  async runStep6_TriggerRateLimit(): Promise<boolean> {
    printHeader("Step 6: Triggering the Rate Limit", `
Perfect! Let's review your spending so far:
• Step 1: Spent $25 USDC
• Step 5: Spent another $25 USDC
• Total spent this hour: $${this.totalSpent} out of your $60 limit

Now let's try ONE MORE swap. Since you've already spent $${this.totalSpent}, 
another $25 swap would bring you to $${this.totalSpent + 25}, which exceeds your 
$60/hour limit. The system should block this!
`)

    console.log(colors.green("\n➤ Final swap - Try: ") + colors.white("swap 25 USDC for SOL"))
    console.log(colors.gray(`   This should be BLOCKED ($${this.totalSpent} + $25 = $${this.totalSpent + 25}, exceeds $60/hour limit).\n`))

    const userCommand = await input({ message: colors.cyan("Enter command to trigger the rate limit:") })
    console.log(colors.yellow("\n⏳ Processing final swap..."))
    
    const result = await executeSwap(userCommand)
    
    const isRateLimited = !result.success && [
      "max spend exceeded", "hourly limit",
      "spend limit", "rate limit", "exceeded"
    ].some(msg => result.message.toLowerCase().includes(msg))

    if (isRateLimited) {
      printBlocked("RATE LIMIT HIT:", result.message)
      console.log(colors.white(`
Excellent! The hourly spend limit protected you from excessive spending.

You had already spent $${this.totalSpent} within the hour ($25 + $25 from previous swaps).
The system correctly blocked this swap that would have brought your total
to $${this.totalSpent + 25}, keeping you within your $60/hour budget.
`))
      return true
    }
    
    if (result.success) {
      printWarning("Note:", result.message)
      console.log(colors.white(`
The swap succeeded. This shouldn't happen if you've correctly set the
$60/hour limit and already spent $${this.totalSpent}. Please check your rule configuration.
`))
    } else {
      printError("Error:", result.message)
    }
    
    return false
  }

  private async askToOpenBrowser(message: string = "Would you like me to open ACK-lab in your browser?"): Promise<boolean> {
    return await select({
      message,
      choices: [
        { name: "Yes, open it", value: true },
        { name: "No, I'll open it myself", value: false }
      ]
    })
  }

  async completeTutorial() {
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
}

// ==================== Free-Form Mode ====================
async function runFreeFormMode() {
  console.log(colors.cyan("\n=== USDC to SOL Swap Demo (CLI) ==="))
  console.log(colors.gray("This CLI connects to the swap agents running on localhost"))
  console.log(colors.gray("Make sure the swap agents are running with: npm run agents:start\n"))
  
  console.log(colors.yellow("\nExchange USDC for SOL using the Swap Service"))
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
      printSuccess("Result:", result.message)
    } else {
      printError("Error:", result.message)
    }
    
    console.log(colors.gray("\n" + "=".repeat(50) + "\n"))
  }
}

// ==================== Main Flow ====================
async function runTutorialMode() {
  const tutorial = new SwapTutorial()

  // Step 1: Initial successful swap
  let success = false
  while (!success) {
    success = await tutorial.runStep1_InitialSwap()
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

  // Step 2-3: Set and test max transaction rule
  await tutorial.runStep2_SetMaxTransactionSize()
  
  success = false
  while (!success) {
    success = await tutorial.runStep3_TestMaxTransactionRule()
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

  // Step 4-6: Hourly spend limit
  await tutorial.runStep4_SetHourlySpendLimit()
  
  success = false
  while (!success) {
    success = await tutorial.runStep5_TestHourlyLimit()
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

  await tutorial.runStep6_TriggerRateLimit()
  await tutorial.completeTutorial()

  // Post-tutorial options
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

async function main() {
  // Skip tutorial mode if flag is set
  if (process.env.SKIP_TUTORIAL === "true") {
    console.log(colors.gray("🔍 Checking system status..."))
    
      if (!await checkAgentsAvailable()) {
    printError("Swap agents are not running!")
    console.log(colors.yellow("\nPlease start the swap agents first:"))
    console.log(colors.gray("  Run in another terminal: npm run agents:start"))
    console.log(colors.gray("  Or: tsx swap-agents-server.ts\n"))
    process.exit(1)
  }
  
  console.log(colors.green("✅ Swap agents are running and ready!"))
    await runFreeFormMode()
    return
  }
  
  // Tutorial mode
  console.log(colors.cyan("\n" + "=".repeat(60)))
  console.log(colors.cyan("       🎓 Swap Agent Demo - ACK-lab Rules Tutorial"))
  console.log(colors.cyan("=".repeat(60)))
  console.log(colors.white(`
Welcome to the Swap Agent Demo!

This interactive guide will teach you how to use ACK-lab's powerful
rule system to protect and control your automated transactions.

You'll learn by doing - setting up real rules and seeing them in action!
`))
  
  console.log(colors.gray("\n🔍 Checking system status..."))
  
  if (!await checkAgentsAvailable()) {
    console.log(colors.red("\n❌ Swap agents are not running!"))
    console.log(colors.yellow("\n📝 To start this tutorial, you need to:"))
    console.log(colors.white("1. Open a new terminal"))
    console.log(colors.white("2. Run: ") + colors.cyan("npm run agents:start"))
    console.log(colors.white("3. Come back here and run this tutorial again\n"))
    process.exit(1)
  }
  
  console.log(colors.green("✅ System ready! Let's begin your journey.\n"))
  
  await waitForUserConfirmation("Press Enter to start the tutorial...")
  await runTutorialMode()
}

main().catch(console.error)
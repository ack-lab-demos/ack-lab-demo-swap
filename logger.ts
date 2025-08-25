import { blue, cyan, green, yellow, red, magenta, gray, bold, dim } from 'yoctocolors'

export const logger = {
  // Section separator - used to visually separate major operations
  separator: () => {
    console.log('\n' + gray('─'.repeat(60)) + '\n')
  },

  // Major section headers with double spacing
  section: (title: string) => {
    console.log('\n\n' + bold(blue('━━━ ' + title + ' ━━━')) + '\n')
  },

  // Success messages - server startup, completion
  success: (message: string, details?: string) => {
    console.log(green('✅ ' + message))
    if (details) {
      console.log(gray('   ' + details))
    }
  },

  // Info messages - general information
  info: (message: string, details?: string) => {
    console.log(cyan('ℹ️  ' + message))
    if (details) {
      console.log(gray('   ' + details))
    }
  },

  // Server/service startup
  server: (name: string, url: string) => {
    console.log(blue('   • ' + name + ':') + ' ' + cyan(url))
  },

  // Incoming requests/messages
  incoming: (type: string, content: string, preview?: boolean) => {
    console.log('\n' + yellow('◀── ' + type))
    if (preview && content.length > 100) {
      console.log(dim('    ' + content.substring(0, 100) + '...'))
    } else {
      console.log(dim('    ' + content))
    }
  },

  // Outgoing responses
  outgoing: (type: string, content: string, preview?: boolean) => {
    console.log(green('──▶ ' + type))
    if (preview && content.length > 100) {
      console.log(dim('    ' + content.substring(0, 100) + '...'))
    } else {
      console.log(dim('    ' + content))
    }
  },

  // Agent communication
  agent: (action: string, message: string) => {
    console.log('\n' + magenta('🤖 ' + action))
    console.log(gray('   ' + message))
  },

  // Processing/calculation steps
  process: (action: string, details?: Record<string, unknown>) => {
    console.log('\n' + blue('⚙️  ' + action))
    if (details) {
      Object.entries(details).forEach(([key, value]) => {
        console.log(gray('   • ' + key + ': ') + cyan(String(value)))
      })
    }
  },

  // Price/market data
  market: (title: string, data: Record<string, unknown>) => {
    console.log('\n' + green('📊 ' + title))
    Object.entries(data).forEach(([key, value]) => {
      console.log(gray('   • ' + key + ': ') + yellow(String(value)))
    })
  },

  // Transaction/payment operations
  transaction: (action: string, details?: Record<string, unknown>) => {
    console.log('\n' + cyan('💳 ' + action))
    if (details) {
      Object.entries(details).forEach(([key, value]) => {
        console.log(gray('   • ' + key + ': ') + green(String(value)))
      })
    }
  },

  // Swap operations
  swap: (action: string, details?: Record<string, unknown>) => {
    console.log('\n' + magenta('🔄 ' + action))
    if (details) {
      Object.entries(details).forEach(([key, value]) => {
        console.log(gray('   • ' + key + ': ') + cyan(String(value)))
      })
    }
  },

  // Debug information (like JWT decoding)
  debug: (label: string, data: unknown) => {
    console.log('\n' + gray('🔍 ' + label))
    if (typeof data === 'object') {
      console.log(gray(JSON.stringify(data, null, 2).split('\n').map(line => '   ' + line).join('\n')))
    } else {
      console.log(gray('   ' + String(data)))
    }
  },

  // Warnings
  warn: (message: string, details?: string) => {
    console.log('\n' + yellow('⚠️  ' + message))
    if (details) {
      console.log(gray('   ' + details))
    }
  },

  // Errors
  error: (message: string, error?: unknown) => {
    console.log('\n' + red('❌ ' + message))
    if (error) {
      if (error instanceof Error) {
        console.log(red('   ' + error.message))
        if (error.stack) {
          console.log(dim(gray('   ' + error.stack.split('\n').slice(1).join('\n   '))))
        }
      } else {
        console.log(red('   ' + String(error)))
      }
    }
  },

  // HTTP request/response (for middleware logger replacement)
  http: (method: string, path: string, status?: number, time?: string) => {
    if (status) {
      const statusColor = status < 400 ? green : status < 500 ? yellow : red
      console.log(gray(`[HTTP] ${method} ${path} `) + statusColor(String(status)) + gray(` ${time || ''}`))
    } else {
      console.log(gray(`[HTTP] ${method} ${path}`))
    }
  },

  // Raw log with optional spacing
  raw: (message: string, spacing: 'before' | 'after' | 'both' | 'none' = 'none') => {
    if (spacing === 'before' || spacing === 'both') console.log()
    console.log(message)
    if (spacing === 'after' || spacing === 'both') console.log()
  }
}

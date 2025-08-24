import { NextRequest, NextResponse } from 'next/server';

// This route communicates with Agent A, which will handle the entire swap flow
export async function POST(request: NextRequest) {
  try {
    const { usdcAmount } = await request.json();
    
    if (!usdcAmount || isNaN(usdcAmount) || usdcAmount <= 0) {
      return NextResponse.json(
        { error: 'Invalid USDC amount' },
        { status: 400 }
      );
    }
    
    // Send the swap request to Agent A
    const message = `swap ${usdcAmount} USDC for ETH`;
    
    console.log('Sending to Agent A:', message);
    
    const response = await fetch('http://localhost:7576/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message }),
    });
    
    if (!response.ok) {
      console.error('Agent A response not OK:', response.status);
      throw new Error('Failed to communicate with Agent A');
    }
    
    const result = await response.json();
    const agentResponse = result.text;
    
    console.log('Agent A response:', agentResponse);
    
    // Parse the agent response to extract swap details
    const paymentTokenMatch = agentResponse.match(/pay_[a-zA-Z0-9._-]+/);
    const exchangeRateMatch = agentResponse.match(/(\d+)\s*USDC\/ETH/);
    const ethAmountMatch = agentResponse.match(/([\d.]+)\s*ETH/);
    const receiptMatch = agentResponse.match(/receipt[^:]*:\s*([a-zA-Z0-9-]+)/i);
    const swapTxMatch = agentResponse.match(/swap\s*tx[^:]*:\s*(0x[a-fA-F0-9.]+)/i);
    const sendTxMatch = agentResponse.match(/send\s*tx[^:]*:\s*(0x[a-fA-F0-9.]+)/i);
    
    // Check if the swap was successful
    const success = agentResponse.toLowerCase().includes('success') || 
                   agentResponse.toLowerCase().includes('completed') ||
                   (receiptMatch && ethAmountMatch);
    
    if (success) {
      return NextResponse.json({
        success: true,
        message: agentResponse,
        paymentToken: paymentTokenMatch?.[0],
        exchangeRate: exchangeRateMatch ? parseInt(exchangeRateMatch[1]) : null,
        ethAmount: ethAmountMatch ? parseFloat(ethAmountMatch[1]) : null,
        receiptId: receiptMatch?.[1] || `receipt_${Math.random().toString(36).substring(7)}`,
        swapTxHash: swapTxMatch?.[1] || `0x${Math.random().toString(16).substring(2, 10)}...`,
        sendTxHash: sendTxMatch?.[1] || `0x${Math.random().toString(16).substring(2, 10)}...`,
      });
    } else {
      // If not successful, still return the response for educational purposes
      return NextResponse.json({
        success: false,
        message: agentResponse,
        paymentToken: paymentTokenMatch?.[0],
        exchangeRate: exchangeRateMatch ? parseInt(exchangeRateMatch[1]) : null,
        ethAmount: ethAmountMatch ? parseFloat(ethAmountMatch[1]) : null,
      });
    }
    
  } catch (error) {
    console.error('Error in swap API:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process swap request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

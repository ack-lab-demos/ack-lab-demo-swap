import { NextResponse } from 'next/server';
import { HermesClient } from '@pythnetwork/hermes-client';

// Initialize Pyth Hermes client
const pythClient = new HermesClient("https://hermes.pyth.network", {});

// SOL/USD price ID from Pyth Network
const SOL_USD_PRICE_ID = "0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d";

export async function GET() {
  try {
    // Fetch the latest price update for SOL/USD
    const priceUpdates = await pythClient.getLatestPriceUpdates([SOL_USD_PRICE_ID]);
    
    if (priceUpdates && priceUpdates.parsed && priceUpdates.parsed.length > 0) {
      const solPriceData = priceUpdates.parsed[0];
      
      // Calculate the actual price from Pyth's format
      const price = Number(solPriceData.price.price) * Math.pow(10, solPriceData.price.expo);
      const confidence = Number(solPriceData.price.conf) * Math.pow(10, solPriceData.price.expo);
      
      console.log('[Pyth Price API] Fetched SOL/USD price:', {
        price: `$${price.toFixed(2)}`,
        confidence: `±$${confidence.toFixed(2)}`,
        publishTime: new Date(solPriceData.price.publish_time * 1000).toISOString()
      });
      
      return NextResponse.json({
        price: Math.round(price * 100) / 100, // Round to 2 decimal places
        confidence: Math.round(confidence * 100) / 100,
        timestamp: solPriceData.price.publish_time * 1000,
        source: 'pyth'
      });
    }
    
    // Fallback if no price data is available
    console.warn('[Pyth Price API] No price data available, using fallback');
    return NextResponse.json({
      price: 150,
      confidence: 0,
      timestamp: Date.now(),
      source: 'fallback'
    });
    
  } catch (error) {
    console.error('[Pyth Price API] Error fetching price:', error);
    // Return fallback price in case of error
    return NextResponse.json({
      price: 150,
      confidence: 0,
      timestamp: Date.now(),
      source: 'fallback',
      error: String(error)
    });
  }
}

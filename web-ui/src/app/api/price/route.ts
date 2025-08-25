import { NextResponse } from 'next/server';
import { HermesClient } from '@pythnetwork/hermes-client';

// Initialize Pyth Hermes client
const pythClient = new HermesClient("https://hermes.pyth.network", {});

// ETH/USD price ID from Pyth Network
const ETH_USD_PRICE_ID = "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace";

export async function GET() {
  try {
    // Fetch the latest price update for ETH/USD
    const priceUpdates = await pythClient.getLatestPriceUpdates([ETH_USD_PRICE_ID]);
    
    if (priceUpdates && priceUpdates.parsed && priceUpdates.parsed.length > 0) {
      const ethPriceData = priceUpdates.parsed[0];
      
      // Calculate the actual price from Pyth's format
      const price = Number(ethPriceData.price.price) * Math.pow(10, ethPriceData.price.expo);
      const confidence = Number(ethPriceData.price.conf) * Math.pow(10, ethPriceData.price.expo);
      
      console.log('[Pyth Price API] Fetched ETH/USD price:', {
        price: `$${price.toFixed(2)}`,
        confidence: `±$${confidence.toFixed(2)}`,
        publishTime: new Date(ethPriceData.price.publish_time * 1000).toISOString()
      });
      
      return NextResponse.json({
        price: Math.round(price * 100) / 100, // Round to 2 decimal places
        confidence: Math.round(confidence * 100) / 100,
        timestamp: ethPriceData.price.publish_time * 1000,
        source: 'pyth'
      });
    }
    
    // Fallback if no price data is available
    console.warn('[Pyth Price API] No price data available, using fallback');
    return NextResponse.json({
      price: 3500,
      confidence: 0,
      timestamp: Date.now(),
      source: 'fallback'
    });
    
  } catch (error) {
    console.error('[Pyth Price API] Error fetching price:', error);
    // Return fallback price in case of error
    return NextResponse.json({
      price: 3500,
      confidence: 0,
      timestamp: Date.now(),
      source: 'fallback',
      error: String(error)
    });
  }
}

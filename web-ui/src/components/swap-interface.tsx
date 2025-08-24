'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { ArrowDownUp, Loader2, CheckCircle2, XCircle, Info, Wallet, Zap, TrendingUp, Code2, Copy, CheckCheck } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

interface SwapStep {
  id: number;
  title: string;
  status: 'pending' | 'in-progress' | 'completed' | 'error';
  details?: string;
}

interface SwapData {
  usdcAmount: number;
  exchangeRate: number;
  ethAmount: number;
  paymentToken?: string;
  receiptId?: string;
  swapTxHash?: string;
  sendTxHash?: string;
}

interface DecodedJWT {
  amount?: number;
  description?: string;
  iat?: number;
  exp?: number;
  [key: string]: any;
}

export function SwapInterface() {
  const [amount, setAmount] = useState('100');
  const [isSwapping, setIsSwapping] = useState(false);
  const [swapData, setSwapData] = useState<SwapData | null>(null);
  const [steps, setSteps] = useState<SwapStep[]>([
    { id: 1, title: 'Request Exchange Rate', status: 'pending' },
    { id: 2, title: 'Generate Payment Request', status: 'pending' },
    { id: 3, title: 'Execute USDC Payment', status: 'pending' },
    { id: 4, title: 'Process Swap on DEX', status: 'pending' },
    { id: 5, title: 'Send ETH to Wallet', status: 'pending' },
  ]);
  const [currentExchangeRate, setCurrentExchangeRate] = useState(0);
  const [decodedJWT, setDecodedJWT] = useState<DecodedJWT | null>(null);
  const [copiedToken, setCopiedToken] = useState(false);

  // Simulate live exchange rate updates
  useEffect(() => {
    const updateRate = () => {
      const rate = Math.floor(Math.random() * 1000) + 3000;
      setCurrentExchangeRate(rate);
    };
    
    updateRate();
    const interval = setInterval(updateRate, 5000);
    return () => clearInterval(interval);
  }, []);

  const updateStep = (stepId: number, status: SwapStep['status'], details?: string) => {
    setSteps(prev => prev.map(step => 
      step.id === stepId ? { ...step, status, details } : step
    ));
  };

  const resetSteps = () => {
    setSteps([
      { id: 1, title: 'Request Exchange Rate', status: 'pending' },
      { id: 2, title: 'Generate Payment Request', status: 'pending' },
      { id: 3, title: 'Execute USDC Payment', status: 'pending' },
      { id: 4, title: 'Process Swap on DEX', status: 'pending' },
      { id: 5, title: 'Send ETH to Wallet', status: 'pending' },
    ]);
    setDecodedJWT(null);
    setCopiedToken(false);
  };

  const decodeJWT = (token: string): DecodedJWT | null => {
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]));
        return payload;
      }
    } catch (error) {
      console.error('Failed to decode JWT:', error);
    }
    return null;
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedToken(true);
      toast.success('Payment token copied to clipboard');
      setTimeout(() => setCopiedToken(false), 3000);
    } catch (error) {
      toast.error('Failed to copy token');
    }
  };

  const handleSwap = async () => {
    const usdcAmount = parseFloat(amount);
    if (isNaN(usdcAmount) || usdcAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setIsSwapping(true);
    resetSteps();
    setSwapData(null);

    try {
      // The agents will handle the entire flow
      // We'll update steps based on timing estimates
      
      // Step 1: Request Exchange Rate
      updateStep(1, 'in-progress');
      
      // Call Agent A which will orchestrate the entire swap
      const response = await fetch('/api/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usdcAmount })
      });
      
      // Simulate step progression based on expected timing
      setTimeout(() => {
        updateStep(1, 'completed', `Rate requested`);
        updateStep(2, 'in-progress');
      }, 2000);
      
      setTimeout(() => {
        updateStep(2, 'completed', `Payment token generated`);
        updateStep(3, 'in-progress');
      }, 4000);
      
      setTimeout(() => {
        updateStep(3, 'completed', `Payment executed`);
        updateStep(4, 'in-progress');
      }, 6000);
      
      setTimeout(() => {
        updateStep(4, 'completed', `Swap processed`);
        updateStep(5, 'in-progress');
      }, 8000);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to process swap');
      }
      
      const result = await response.json();
      
      // Extract data from the agent response
      const { 
        success, 
        message, 
        paymentToken, 
        exchangeRate, 
        ethAmount, 
        receiptId,
        swapTxHash,
        sendTxHash 
      } = result;
      
      if (success) {
        // Update final step
        updateStep(5, 'completed', `Sent ${ethAmount?.toFixed(6) || '~'} ETH`);
        
        // Decode JWT if we have a payment token
        if (paymentToken) {
          const decoded = decodeJWT(paymentToken);
          setDecodedJWT(decoded);
        }
        
        // Set swap data
        setSwapData({
          usdcAmount,
          exchangeRate: exchangeRate || currentExchangeRate,
          ethAmount: ethAmount || (usdcAmount / (exchangeRate || currentExchangeRate)),
          paymentToken,
          receiptId,
          swapTxHash,
          sendTxHash
        });
        
        toast.success(`Successfully swapped ${usdcAmount} USDC for ${ethAmount?.toFixed(6) || '~'} ETH!`);
      } else {
        // Show the agent's message if swap wasn't successful
        toast.info(message || 'Swap process incomplete');
        
        // Still show payment token if available for educational purposes
        if (paymentToken) {
          const decoded = decodeJWT(paymentToken);
          setDecodedJWT(decoded);
          
          setSwapData({
            usdcAmount,
            exchangeRate: exchangeRate || currentExchangeRate,
            ethAmount: ethAmount || (usdcAmount / (exchangeRate || currentExchangeRate)),
            paymentToken
          });
        }
      }
      
    } catch (error) {
      const failedStep = steps.find(s => s.status === 'in-progress');
      if (failedStep) {
        updateStep(failedStep.id, 'error', error instanceof Error ? error.message : 'Unknown error');
      }
      toast.error(error instanceof Error ? error.message : 'Swap failed');
    } finally {
      setIsSwapping(false);
    }
  };

  const estimatedETH = amount && !isNaN(parseFloat(amount)) && currentExchangeRate > 0
    ? (parseFloat(amount) / currentExchangeRate).toFixed(6)
    : '0.000000';

  const progress = (steps.filter(s => s.status === 'completed').length / steps.length) * 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-2"
      >
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
          USDC to ETH Swap Demo
        </h1>
        <p className="text-gray-400">Educational demonstration of agent-to-agent communication</p>
        <div className="flex justify-center gap-4 mt-4">
          <Badge variant="outline" className="gap-1">
            <TrendingUp className="w-3 h-3" />
            Live Rate: {currentExchangeRate} USDC/ETH
          </Badge>
          <Badge variant="outline" className="gap-1">
            <Wallet className="w-3 h-3" />
            ACK Lab SDK
          </Badge>
        </div>
      </motion.div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Swap Card */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-gray-700 bg-gray-800/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowDownUp className="w-5 h-5" />
                Swap Interface
              </CardTitle>
              <CardDescription>Exchange USDC for ETH using automated agents</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="amount">USDC Amount</Label>
                <div className="relative">
                  <Input
                    id="amount"
                    type="number"
                    placeholder="Enter amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    disabled={isSwapping}
                    className="pr-16 bg-gray-900/50"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    USDC
                  </span>
                </div>
              </div>

              <div className="p-4 bg-gray-900/50 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Exchange Rate</span>
                  <span className="font-mono">{currentExchangeRate} USDC/ETH</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">You will receive</span>
                  <span className="text-xl font-bold text-green-400">
                    ~{estimatedETH} ETH
                  </span>
                </div>
              </div>

              <Button 
                onClick={handleSwap} 
                disabled={isSwapping}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                size="lg"
              >
                {isSwapping ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing Swap...
                  </>
                ) : (
                  <>
                    <Zap className="mr-2 h-4 w-4" />
                    Swap USDC for ETH
                  </>
                )}
              </Button>

              {isSwapping && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Progress</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Process Steps */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-gray-700 bg-gray-800/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="w-5 h-5" />
                Swap Process
              </CardTitle>
              <CardDescription>Real-time execution steps</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {steps.map((step, index) => (
                  <motion.div
                    key={step.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${
                      step.status === 'in-progress' ? 'bg-blue-500/10 border border-blue-500/20' :
                      step.status === 'completed' ? 'bg-green-500/10 border border-green-500/20' :
                      step.status === 'error' ? 'bg-red-500/10 border border-red-500/20' :
                      'bg-gray-900/30'
                    }`}
                  >
                    <div className="mt-1">
                      {step.status === 'pending' && (
                        <div className="w-5 h-5 rounded-full border-2 border-gray-600" />
                      )}
                      {step.status === 'in-progress' && (
                        <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                      )}
                      {step.status === 'completed' && (
                        <CheckCircle2 className="w-5 h-5 text-green-400" />
                      )}
                      {step.status === 'error' && (
                        <XCircle className="w-5 h-5 text-red-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-sm">{step.title}</div>
                      {step.details && (
                        <div className="text-xs text-gray-400 mt-1 font-mono">
                          {step.details}
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Educational Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Tabs defaultValue="flow" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-gray-800">
            <TabsTrigger value="flow">Flow Diagram</TabsTrigger>
            <TabsTrigger value="jwt">JWT Decoder</TabsTrigger>
            <TabsTrigger value="results">Transaction Results</TabsTrigger>
          </TabsList>

          <TabsContent value="flow">
            <Card className="border-gray-700 bg-gray-800/50">
              <CardHeader>
                <CardTitle>Agent Communication Flow</CardTitle>
                <CardDescription>How Agent A and Agent B interact to complete the swap</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Alert className="border-blue-500/20 bg-blue-500/10">
                    <Info className="h-4 w-4" />
                    <AlertTitle>Agent Architecture</AlertTitle>
                    <AlertDescription>
                      This demo uses two AI agents powered by Claude Sonnet:
                      <ul className="mt-2 space-y-1 list-disc list-inside">
                        <li>Agent A: The user agent that wants to swap USDC for ETH</li>
                        <li>Agent B: The swap service agent that handles the exchange</li>
                      </ul>
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-3 font-mono text-sm">
                    <div className="p-3 bg-gray-900/50 rounded">
                      <div className="text-blue-400">1. User → Agent A</div>
                      <div className="text-gray-400 ml-4">"Swap 100 USDC for ETH"</div>
                    </div>
                    <div className="p-3 bg-gray-900/50 rounded">
                      <div className="text-green-400">2. Agent A → Agent B</div>
                      <div className="text-gray-400 ml-4">Request swap with amount</div>
                    </div>
                    <div className="p-3 bg-gray-900/50 rounded">
                      <div className="text-yellow-400">3. Agent B</div>
                      <div className="text-gray-400 ml-4">Creates payment request via ACK SDK</div>
                    </div>
                    <div className="p-3 bg-gray-900/50 rounded">
                      <div className="text-purple-400">4. Agent A</div>
                      <div className="text-gray-400 ml-4">Executes payment with token</div>
                    </div>
                    <div className="p-3 bg-gray-900/50 rounded">
                      <div className="text-cyan-400">5. Agent B</div>
                      <div className="text-gray-400 ml-4">Completes swap & sends ETH</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="jwt">
            <Card className="border-gray-700 bg-gray-800/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code2 className="w-5 h-5" />
                  JWT Payment Token Decoder
                </CardTitle>
                <CardDescription>Inspect the payment token structure</CardDescription>
              </CardHeader>
              <CardContent>
                {swapData?.paymentToken ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Payment Token</Label>
                      <div className="flex gap-2">
                        <Input 
                          value={swapData.paymentToken.substring(0, 50) + '...'} 
                          readOnly 
                          className="font-mono text-xs bg-gray-900/50"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => copyToClipboard(swapData.paymentToken!)}
                        >
                          {copiedToken ? <CheckCheck className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    
                    {decodedJWT && (
                      <div className="space-y-2">
                        <Label>Decoded Payload</Label>
                        <pre className="p-4 bg-gray-900/50 rounded text-xs overflow-auto">
                          {JSON.stringify(decodedJWT, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                ) : (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      Start a swap to see the JWT payment token structure
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="results">
            <Card className="border-gray-700 bg-gray-800/50">
              <CardHeader>
                <CardTitle>Transaction Results</CardTitle>
                <CardDescription>Details of the completed swap</CardDescription>
              </CardHeader>
              <CardContent>
                {swapData?.receiptId ? (
                  <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label className="text-gray-400">USDC Amount</Label>
                        <div className="font-mono text-lg">{swapData.usdcAmount} USDC</div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-gray-400">ETH Received</Label>
                        <div className="font-mono text-lg text-green-400">
                          {swapData.ethAmount.toFixed(6)} ETH
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-gray-400">Exchange Rate</Label>
                        <div className="font-mono">{swapData.exchangeRate} USDC/ETH</div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-gray-400">Receipt ID</Label>
                        <div className="font-mono text-xs break-all">{swapData.receiptId}</div>
                      </div>
                    </div>
                    
                    {(swapData.swapTxHash || swapData.sendTxHash) && (
                      <div className="pt-4 border-t border-gray-700 space-y-2">
                        <Label className="text-gray-400">Transaction Hashes</Label>
                        {swapData.swapTxHash && (
                          <div className="text-xs font-mono">
                            Swap TX: {swapData.swapTxHash}
                          </div>
                        )}
                        {swapData.sendTxHash && (
                          <div className="text-xs font-mono">
                            Send TX: {swapData.sendTxHash}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      Complete a swap to see the transaction results
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}

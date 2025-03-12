'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Download, Loader2 } from 'lucide-react';
import { epidemiologyPrompt } from './prompts/epidemiology';
import { interventionPrompt } from './prompts/intervention';
import { pricingPrompt } from './prompts/pricing';
import remarkGfm from 'remark-gfm';
import ReactMarkdown from 'react-markdown';
import { Slider } from "@/components/ui/slider"

interface MarketSizingInput {
  country: string;
  intervention: string;
  disease: string;
  subgroup: string;
}

interface MarketSizingResult {
  epidemiology?: string;
  intervention?: string;
  pricing?: string;
  initial_prevalence?: number;
  initial_price?: number;
  total_market_size?: number;
}

export default function Home() {
  const [input, setInput] = useState<MarketSizingInput>({
    country: '',
    intervention: '',
    disease: '',
    subgroup: '',
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MarketSizingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [prevalence, setPrevalence] = useState<number>(0);
  const [price, setPrice] = useState<number>(0);
  const [marketSize, setMarketSize] = useState<number>(0);

  const templateText = {
    prefix: "What is the ",
    country: "[country]",
    middle1: " market size for ",
    intervention: "[intervention]",
    middle2: " in the treatment of ",
    disease: "[disease]",
    subgroup: "[subgroup]",
    suffix: " today?"
  };

  const handleInputChange = (field: keyof MarketSizingInput, value: string) => {
    if (value.length <= 100) {
      setInput(prev => ({
        ...prev,
        [field]: value,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      console.log("Sending request with data:", {
        ...input,
        prompts: {
          epidemiology: epidemiologyPrompt(input),
          intervention: interventionPrompt(input),
          pricing: pricingPrompt(input)
        }
      });

      const response = await fetch('http://localhost:5000/api/market-size', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...input,
          prompts: {
            epidemiology: epidemiologyPrompt(input),
            intervention: interventionPrompt(input),
            pricing: pricingPrompt(input)
          }
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Server error:', errorData);
        throw new Error(errorData.error || 'Failed to calculate market size');
      }
      
      const data = await response.json();
      console.log("Response data:", data);
      setResult(data);
      
      if (data.initial_prevalence && data.initial_price) {
        console.log("Setting initial values:", { 
          prevalence: data.initial_prevalence, 
          price: data.initial_price 
        });
        setPrevalence(data.initial_prevalence);
        setPrice(data.initial_price);
        setMarketSize(data.initial_prevalence * data.initial_price);
      }
    } catch (error) {
      console.error('Detailed error:', error);
      setError(error instanceof Error ? error.message : 'Failed to calculate market size');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (!result) return;
    
    try {
      // For JSON export
      if (result.initial_prevalence && result.initial_price) {
        const marketSizeData = {
          prevalence: result.initial_prevalence,
          price: result.initial_price,
          total_market_size: result.total_market_size
        };
        
        const blob = new Blob([JSON.stringify(marketSizeData, null, 2)], { 
          type: 'application/json' 
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'market-sizing-result.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error exporting JSON:', error);
    }
  };

  const handleExportCSV = async () => {
    if (!result) return;
    
    try {
      const response = await fetch('http://localhost:5000/api/export-csv', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          epidemiology: result.epidemiology,
          intervention: result.intervention,
          pricing: result.pricing
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to export CSV');
      }
      
      const data = await response.json();
      
      const blob = new Blob([data.csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'market-sizing-tables.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Error exporting CSV:', error);
    }
  };

  const handleReset = () => {
    setInput({
      country: '',
      intervention: '',
      disease: '',
      subgroup: '',
    });
    setResult(null);
    setError(null);
  };

  const renderMarketSizeCalculator = () => {
    console.log("Rendering calculator with:", { 
      prevalence, 
      price, 
      marketSize 
    });
    
    if (!result?.initial_prevalence || !result?.initial_price) {
      console.log("Missing required values:", result);
      return null;
    }

    const maxPrevalence = result.initial_prevalence * 2;
    const maxPrice = result.initial_price * 2;

    return (
      <Card className="mt-8 p-6 shadow-lg bg-white">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-8">
            <div className="space-y-4">
              <label className="text-sm font-medium">
                Prevalence
                <span className="ml-2 text-gray-500">
                  {prevalence.toLocaleString()} patients
                </span>
              </label>
              <Slider
                value={[prevalence]}
                min={0}
                max={maxPrevalence}
                step={100}
                onValueChange={(values) => {
                  const newPrevalence = values[0];
                  setPrevalence(newPrevalence);
                  setMarketSize(newPrevalence * price);
                }}
              />
            </div>
            
            <div className="space-y-4">
              <label className="text-sm font-medium">
                Price
                <span className="ml-2 text-gray-500">
                  ${price.toLocaleString()}
                </span>
              </label>
              <Slider
                value={[price]}
                min={0}
                max={maxPrice}
                step={10}
                onValueChange={(values) => {
                  const newPrice = values[0];
                  setPrice(newPrice);
                  setMarketSize(prevalence * newPrice);
                }}
              />
            </div>
          </div>

          <div className="flex flex-col items-center justify-center p-6 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-500 mb-2">Total Market Size</div>
            <div className="text-4xl font-bold text-[#6d9276]">
              ${marketSize.toLocaleString()}
            </div>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-center mb-8 text-[#6d9276]">
          Foundry Health: Market Sizing Calculator
        </h1>
        
        <Card className="p-6 shadow-lg bg-white">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="relative p-4 text-lg">
              <p className="text-black flex flex-wrap items-center gap-1">
                {templateText.prefix}
                <span className="relative inline-flex items-center min-w-[80px]">
                  <span className="italic text-gray-400 absolute pointer-events-none">
                    {!input.country && templateText.country}
                  </span>
                  <Input
                    value={input.country}
                    onChange={(e) => handleInputChange('country', e.target.value)}
                    className="font-bold text-[#6d9276] w-full bg-transparent border-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 p-1 text-lg h-[1.5em] leading-normal shadow-none"
                    required
                    style={{ width: `${Math.max(80, input.country.length * 10)}px` }}
                  />
                </span>
                {templateText.middle1}
                <span className="relative inline-flex items-center min-w-[120px]">
                  <span className="italic text-gray-400 absolute pointer-events-none">
                    {!input.intervention && templateText.intervention}
                  </span>
                  <Input
                    value={input.intervention}
                    onChange={(e) => handleInputChange('intervention', e.target.value)}
                    className="font-bold text-[#6d9276] w-full bg-transparent border-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 p-1 text-lg h-[1.5em] leading-normal shadow-none"
                    required
                    style={{ width: `${Math.max(80, input.intervention.length * 10)}px` }}
                  />
                </span>
                {templateText.middle2}
                <span className="relative inline-flex items-center min-w-[80px]">
                  <span className="italic text-gray-400 absolute pointer-events-none">
                    {!input.disease && templateText.disease}
                  </span>
                  <Input
                    value={input.disease}
                    onChange={(e) => handleInputChange('disease', e.target.value)}
                    className="font-bold text-[#6d9276] w-full bg-transparent border-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 p-1 text-lg h-[1.5em] leading-normal shadow-none"
                    required
                    style={{ width: `${Math.max(80, input.disease.length * 10)}px` }}
                  />
                </span>
                {" "}
                <span className="relative inline-flex items-center min-w-[80px]">
                  <span className="italic text-gray-400 absolute pointer-events-none">
                    {!input.subgroup && templateText.subgroup}
                  </span>
                  <Input
                    value={input.subgroup}
                    onChange={(e) => handleInputChange('subgroup', e.target.value)}
                    className="font-bold text-[#6d9276] w-full bg-transparent border-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 p-0 text-lg h-[1.5em] leading-normal shadow-none"
                    required
                    style={{ width: `${Math.max(100, input.subgroup.length * 9)}px` }}
                  />
                </span>
                {templateText.suffix}
              </p>
            </div>

            {error && (
              <div className="text-red-500 text-sm">{error}</div>
            )}

            <div className="flex gap-4 justify-end">
              {result && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleReset}
                  >
                    New Query
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleExport}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export JSON
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleExportCSV}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export CSV
                  </Button>
                </>
              )}
              <Button
                type="submit"
                disabled={loading}
                style={{ backgroundColor: '#6d9276' }}
              >
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Calculate Market Size
              </Button>
            </div>
          </form>
        </Card>

        {result && renderMarketSizeCalculator()}

        {result && (
          <Card className="mt-8 p-6 shadow-lg bg-white">
            <h2 className="text-xl font-semibold mb-4">Results</h2>
            <div className="space-y-8">
              {Object.entries(result).map(([category, data]) => {
                if (['initial_prevalence', 'initial_price', 'total_market_size'].includes(category)) {
                  return null;
                }
                
                return (
                  <div key={category} className="space-y-4">
                    <h3 className="text-lg font-medium capitalize">{category}</h3>
                    <div className="prose prose-sm max-w-none">
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        components={{
                          table: ({node, ...props}) => (
                            <div className="overflow-x-auto">
                              <table className="min-w-full divide-y divide-gray-200" {...props} />
                            </div>
                          ),
                          thead: ({node, ...props}) => (
                            <thead className="bg-gray-50" {...props} />
                          ),
                          th: ({node, ...props}) => (
                            <th 
                              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                              {...props} 
                            />
                          ),
                          td: ({node, ...props}) => (
                            <td 
                              className="px-6 py-4 whitespace-normal text-sm text-gray-500"
                              {...props} 
                            />
                          ),
                          tr: ({node, ...props}) => (
                            <tr 
                              className="even:bg-gray-50"
                              {...props} 
                            />
                          ),
                        }}
                      >
                        {data as string}
                      </ReactMarkdown>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </div>
    </main>
  );
}
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Download, Loader2 } from 'lucide-react';
import { Label } from '@/components/ui/label';

interface MarketSizingInput {
  country: string;
  indication: string;
  disease: string;
  subgroup: string;
}

interface MarketSizingResult {
  epidemiology?: string;
  intervention?: string;
  pricing?: string;
}

export default function Home() {
  const [input, setInput] = useState<MarketSizingInput>({
    country: '',
    indication: '',
    disease: '',
    subgroup: '',
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MarketSizingResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('http://localhost:5000/api/market-size', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
      });
      
      if (!response.ok) {
        throw new Error('Failed to calculate market size');
      }
      
      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error('Error:', error);
      setError('Failed to calculate market size. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'market-sizing-result.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    setInput({
      country: '',
      indication: '',
      disease: '',
      subgroup: '',
    });
    setResult(null);
    setError(null);
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-center mb-8 text-[#6d9276]">
          Healthcare and Life Sciences Market Sizing Calculator
        </h1>
        
        <Card className="p-6 shadow-lg bg-white">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4">
              {Object.entries(input).map(([key, value]) => (
                <div key={key} className="space-y-2">
                  <Label htmlFor={key} className="capitalize">
                    {key}
                  </Label>
                  <Input
                    id={key}
                    value={value}
                    onChange={(e) => {
                      if (e.target.value.length <= 100) {
                        setInput((prev) => ({
                          ...prev,
                          [key]: e.target.value,
                        }));
                      }
                    }}
                    placeholder={`Enter ${key}`}
                    required
                    maxLength={100}
                    className="w-full"
                  />
                </div>
              ))}
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
                    Export Results
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

        {result && (
          <Card className="mt-8 p-6 shadow-lg bg-white">
            <h2 className="text-xl font-semibold mb-4">Results</h2>
            <div className="space-y-6">
              {Object.entries(result).map(([category, data]) => (
                <div key={category} className="space-y-2">
                  <h3 className="text-lg font-medium capitalize">{category}</h3>
                  <div className="bg-gray-50 p-4 rounded-lg whitespace-pre-wrap">
                    {data}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </main>
  );
}
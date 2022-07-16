declare module 'yahoo-finance' {
  export function quote(options: Record<string, unknown>, callback: (error: any, quotes: QuoteResponse) => void): void;

  interface QuoteResponse {
    price: {
      open: number,
      high: number,
      low: number,
      close: number,
      volume: number,
      adjClose: number,
      regularMarketPrice: number,
      regularMarketTime: Date,
      symbol: string,
      currency: string,
    }
  };
}

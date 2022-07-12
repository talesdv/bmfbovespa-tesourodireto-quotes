import { quote, QuoteResponse } from "yahoo-finance";
import { DataProvider, FetchResponse } from "./";
import { left, right } from "@sweet-monads/either";

export class YahooFinanceProvider implements DataProvider {
  async fetch(symbol: string): Promise<FetchResponse> {
    return new Promise((resolve) =>
      quote(
        {
          symbol: symbol,
          modules: ["price"],
        },
        handleResponseCallback(symbol, resolve)
      )
    );
  }
}

const handleResponseCallback = (
  symbol: string,
  resolve: (value: FetchResponse) => void
) => {
  return (error: unknown, { price }: QuoteResponse) => {
    if (error) {
      return resolve(
        left({
          name: symbol,
          description: `Failed to fetch symbol ${symbol}`,
          reason: error,
        })
      );
    }

    resolve(
      right({
        name: symbol,
        price: price.regularMarketPrice,
        date: price.regularMarketTime,
        currency: price.currency,
      })
    );
  };
};

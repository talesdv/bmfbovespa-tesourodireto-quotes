import { right } from "@sweet-monads/either";
import {
  DataProvider,
  FetchResponse,
  SymbolPriceData
} from "./";
import { YahooFinanceProvider } from "./yahooFinance";

const noConversion: SymbolPriceData = {
  name: "NO_CONVERSION",
  date: new Date(),
  price: 1,
};

export class FXProvider implements DataProvider {
  #fxMap = new Map<string, Promise<FetchResponse>>();
  #provider = new YahooFinanceProvider();

  async fetch(symbol: string | undefined): Promise<FetchResponse> {
    if (symbol === undefined) {
      return Promise.resolve(right(noConversion));
    }

    const cachedResponse = this.#fxMap.get(symbol);
    if (cachedResponse) {
      return cachedResponse;
    }

    const currencyCode = toYahooCurrency(symbol);
    const response = this.#provider.fetch(currencyCode);

    this.#fxMap.set(symbol, response);

    return response;
  }
}

function toYahooCurrency(symbol: string) {
  return `${symbol}=X`;
}

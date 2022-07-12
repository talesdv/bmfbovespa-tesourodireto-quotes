import { Either, left, right } from "@sweet-monads/either";
import { QuoteConfiguration, QuoteType } from "../quoteConfiguration";
import { YahooFinanceProvider } from "./yahooFinance";
import { TesouroDiretoProvider } from "./tesouroDireto";
import { FXProvider } from "./fx";

export interface SymbolPriceData {
  name: string;
  price: number;
  date: Date;
  currency?: string;
}

export interface DataFetchError {
  name: string;
  description?: string;
  reason?: unknown;
}

export type FetchResponse = Either<DataFetchError, SymbolPriceData>;

export interface DataProvider {
  fetch(symbol: string): Promise<FetchResponse>;
}

const yahooFinance = new YahooFinanceProvider();
const tesourodireto = new TesouroDiretoProvider();
tesourodireto.preload();

const dataProvderMap = new Map<QuoteType, DataProvider>([
  ["crypto", yahooFinance],
  ["stock", yahooFinance],
  ["fii", yahooFinance],
  ["index", yahooFinance],
  ["tesourodireto", tesourodireto],
]);

const fxProvider = new FXProvider();

export const getDataProvider = (
  config: QuoteConfiguration
): Either<DataFetchError, DataProvider> => {
  const provider = dataProvderMap.get(config.type);

  if (provider === undefined) {
    return left({
      name: config.name,
      desription: `No data provider for ${config.type}`,
    } as DataFetchError);
  }

  return right(provider);
};

export const getFXProvider = () => {
  return fxProvider;
};

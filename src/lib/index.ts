import { left, right } from "@sweet-monads/either";
import {
  DataFetchError,
  FetchResponse,
  getDataProvider,
  getFXProvider,
  SymbolPriceData,
} from "./dataProvider/";
import { getOutputController } from "./outputController";
import { QuoteConfiguration } from "./quoteConfiguration";
import colors from "colors/safe";

export async function fetchAndRecord(configuration: QuoteConfiguration[]) {
  console.debug(`Fetching ${configuration.length} symbols`);

  const results = await fetchQuotes(configuration);

  const [errors, data] = results.reduce(
    (aggr, result) => {
      if (result.isLeft()) aggr[0].push(result.value);
      if (result.isRight()) aggr[1].push(result.value);
      return aggr;
    },
    [[] as DataFetchError[], [] as SymbolPriceData[]]
  );

  handleResults(configuration, errors, data);

  await getOutputController().write(data);
}

function handleResults(
  configuration: QuoteConfiguration[],
  errors: DataFetchError[],
  data: SymbolPriceData[]
) {
  console.table(data);

  if (errors.length === 0) {
    console.log(
      `${colors.bgGreen(" SUCCESS ")} fetched quotes for ${
        data.length
      } symbols out of ${configuration.length}.`
    );
  }

  if (errors.length > 0) {
    console.error(
      `${colors.bgRed(" FAILED ")} found ${
        errors.length
      } errors processing quotes:`
    );
    errors.forEach((error) => {
      console.error(`\t${error.name} ${error.description}`);
      console.debug(`\t\t${error.reason}`);
    });
  }
}

async function fetchQuotes(
  configuration: QuoteConfiguration[]
): Promise<FetchResponse[]> {
  const promises = configuration.map(async (symbol) => {
    const fx = await fetchFXRate(symbol);
    // TODO: retry mechanism and timeout
    const quote = await fetchSymbolQuote(symbol);

    if (quote.isLeft()) {
      return quote;
    }
    if (fx.isLeft()) {
      return fx;
    }

    const convertedPrice = quote.value.price * fx.value.price;
    const response: SymbolPriceData = {
      ...quote.value,
      currency: fx.value.currency ?? quote.value.currency,
      price: convertedPrice,
    };

    return right(response);
  });

  // TODO: progress bar

  return Promise.all(promises);
}

async function fetchSymbolQuote(
  symbolConfiguration: QuoteConfiguration
): Promise<FetchResponse> {
  const provider = getDataProvider(symbolConfiguration);
  if (provider.isLeft()) {
    return Promise.resolve(left(provider.value));
  }

  return (await provider.value.fetch(symbolConfiguration.code)).map(
    (quote) =>
      ({
        ...quote,
        name: symbolConfiguration.name,
      } as SymbolPriceData)
  );
}

async function fetchFXRate(symbolConfiguration: QuoteConfiguration) {
  return getFXProvider().fetch(symbolConfiguration.fxPair);
}

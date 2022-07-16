import { OutputController } from "./";
import { SymbolPriceData } from "../dataProvider";
import { stringify } from "csv-stringify";
import { createWriteStream } from "fs";
import { normalize } from "path";

// TODO: output as argument
const FILE_PATH = normalize(`${__dirname}/../../../prices.csv`);

export class QuickenCSV implements OutputController {
  async write(quotes: SymbolPriceData[]): Promise<void> {
    console.debug(`Writing results to ${FILE_PATH}`);

    try {
      const stringifier = stringify({
        quoted: true,
        columns: ["name", "price", "date"],
      });

      const fileStream = createWriteStream(FILE_PATH);
      stringifier.pipe(fileStream);

      toQuotesArray(quotes).map((quote) => stringifier.write(quote));

      stringifier.end();
      fileStream.end();
    } catch (error) {
      throw new Error(`Unable to write CSV Quicken results: ${error}`);
    }

    console.debug(`Done writing results`);
  }
}

function toQuotesArray(quotes: SymbolPriceData[]) {
  return Object.values(quotes).map(({ name, price, date }) => [
    name,
    price,
    date?.toLocaleDateString('en-US', { dateStyle: 'short' }),
  ]);
}

import { readFile } from "fs/promises";

export  type QuoteType = "crypto" | "stock" | "fii" | "tesourodireto" | "index";

export interface QuoteConfiguration {
  /** Name of the symbol to fetch */
  name: string;

  /** Code of the symbol in the datasource */
  code: string;

  type: QuoteType;

  /**
   * ISO Currency Code of the pair to be converted `[FROM][TO]`
   * e.g. to convert result from USD to BRL, enter `USDBRL`.
   */
  fxPair?: string;
}

export const load = async (filePath: string) => {
  const rawConfig = await readFile(filePath);

  let jsonConfig: Record<string, unknown>;
  try {
    jsonConfig = JSON.parse(rawConfig.toString("utf8"));
    
    if (!Array.isArray(jsonConfig)) {
      throw new Error("Configurattion must be an array");
    }
  } catch (error) {
    let message = "Unable to parse configuration";
    if (error instanceof Error) {
      message += `: ${error.message}`;
    }

    throw new Error(message);
  }
  
  return jsonConfig.map(({ name, code, type, fxPair }) => {
      // TODO: validate
      return {
          name,
          code: code ?? name,
          type,
          fxPair,
      } as QuoteConfiguration
  });
}

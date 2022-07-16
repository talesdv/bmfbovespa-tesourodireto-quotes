import { SymbolPriceData } from "../dataProvider";
import { QuickenCSV } from "./quickenCSV";

export interface OutputController {
    write(quotes: SymbolPriceData[]): Promise<void>;
}

// TODO: output controller as argument
export function getOutputController(): OutputController {
    return new QuickenCSV();
}
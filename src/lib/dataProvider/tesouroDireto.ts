import {
  DataProvider,
  FetchResponse,
} from "./";
import { left, right } from "@sweet-monads/either";
import { get } from "https";

export class TesouroDiretoProvider implements DataProvider {
    
    private static API_URL = new URL(
        "https://www.tesourodireto.com.br/json/br/com/b3/tesourodireto/service/api/treasurybondsinfo.json");

    private tdResponse: any;
    private preloadPromise?: Promise<void>;

    preload(): Promise<void> { 
        if (this.preloadPromise) {
            return this.preloadPromise;
        }

        let body = "";
        
        this.preloadPromise = new Promise((resolve) => {
            // TODO: do not disable TLS
            process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = '0'; // The API uses a cipher not supported by recent versions (^14) of nodejs
            
            get(TesouroDiretoProvider.API_URL, (response) => {
                response.on("data", (d) => (body += d));
                response.on("end", () => {
                  this.tdResponse = JSON.parse(body);
                  resolve(this.tdResponse);
                });
            });
        });

        return this.preloadPromise;
    }

    async fetch(symbol: string): Promise<FetchResponse> {
        const failWithProviderNotInitialized = () => Promise.resolve(left({
            name: symbol,
            description: 'TesouroDireto provider not initialized'
        }));

        if (!this.preloadPromise) {
            return failWithProviderNotInitialized();
        }

        try {
            await this.preloadPromise;
        } catch {
            return failWithProviderNotInitialized();
        }

        let symbolRawPrice = this.tdResponse.response.TrsrBdTradgList
            .find((element: any) => element.TrsrBd.nm === symbol);

        if (!symbolRawPrice) {
            return Promise.resolve(left({
                name: symbol,
                description: 'Not found'
            }));
        }

        return Promise.resolve(right({
          name: symbolRawPrice.TrsrBd.nm,
          price: symbolRawPrice.TrsrBd.untrRedVal,
          date: new Date(),
          currency: 'BRL',
        }));
      }
}

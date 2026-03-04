import { MarketDataProvider } from "./types";
import { YahooProvider } from "./YahooProvider";
import { TiingoProvider } from "./TiingoProvider";
import { FinnhubProvider } from "./FinnhubProvider";
import { ECBProvider } from "./ECBProvider";

export const providers: Record<string, MarketDataProvider> = {
    yahoo: new YahooProvider(),
    tiingo: new TiingoProvider(),
    finnhub: new FinnhubProvider(),
    ecb: new ECBProvider()
};

export function getProvider(id: string | null | undefined): MarketDataProvider {
    if (!id || !providers[id]) {
        return providers.yahoo; // default
    }
    return providers[id];
}

export * from "./types";

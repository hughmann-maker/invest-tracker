import { MarketDataProvider, MarketPrice, MarketHistory, ExchangeRates } from "./types";
import { YahooProvider } from "./YahooProvider";

// ECB / Frankfurter Provider
// Mostly provides precise exchange rates, falls back to Yahoo for actual stock prices
export class ECBProvider implements MarketDataProvider {
    id = "ecb";
    name = "ECB / Frankfurter";

    // Reusing Yahoo for equity fallback since ECB only provides currencies
    private fallbackProvider = new YahooProvider();

    async getPrices(tickers: string[]): Promise<{ prices: (MarketPrice | null)[], exchangeRates: ExchangeRates }> {
        // Fallback for stocks
        const { prices } = await this.fallbackProvider.getPrices(tickers);

        let exchangeRates: ExchangeRates = { EUR: 25.0, USD: 23.0 };
        try {
            // GET https://api.frankfurter.app/latest?to=CZK,USD
            const res = await fetch("https://api.frankfurter.app/latest?to=CZK,USD");
            if (res.ok) {
                const data = await res.json();
                if (data.rates.CZK) {
                    exchangeRates.EUR = data.rates.CZK;
                    // Frankfurter base is EUR
                    // USD/CZK = EUR/CZK / EUR/USD
                    if (data.rates.USD) {
                        exchangeRates.USD = data.rates.CZK / data.rates.USD;
                    }
                }
            }
        } catch (err) {
            console.error("ECB Provider failed to fetch rates", err);
        }

        return { prices, exchangeRates };
    }

    async getHistory(tickers: string[], start: Date, end: Date): Promise<(MarketHistory | null)[]> {
        return this.fallbackProvider.getHistory(tickers, start, end);
    }
}

import YahooFinance from "yahoo-finance2";
import { MarketDataProvider, MarketPrice, MarketHistory, ExchangeRates } from "./types";

const yahooFinance = new YahooFinance();

export class YahooProvider implements MarketDataProvider {
    id = "yahoo";
    name = "Yahoo Finance";

    async getPrices(tickers: string[]): Promise<{ prices: (MarketPrice | null)[], exchangeRates: ExchangeRates }> {
        const results = await Promise.allSettled(
            tickers.map(async (ticker) => {
                const response = await yahooFinance.quote(ticker);
                const quote = Array.isArray(response) ? response[0] : response;
                return {
                    ticker,
                    price: quote?.regularMarketPrice || 0,
                    currency: quote?.currency || 'EUR',
                    symbol: quote?.symbol || ticker,
                    shortName: quote?.shortName || '',
                    longName: quote?.longName || '',
                    dailyChange: quote?.regularMarketChange || 0,
                    dailyChangePercent: quote?.regularMarketChangePercent || 0,
                } as MarketPrice;
            })
        );

        const prices = results.map((result) =>
            result.status === "fulfilled" ? result.value : null
        );

        const exchangeRates: ExchangeRates = { EUR: 25.0, USD: 23.0 }; // Fallbacks
        try {
            const [eurRes, usdRes] = await Promise.allSettled([
                yahooFinance.quote("EURCZK=X"),
                yahooFinance.quote("USDCZK=X")
            ]);

            if (eurRes.status === "fulfilled") {
                const quote = Array.isArray(eurRes.value) ? eurRes.value[0] : eurRes.value;
                if (quote?.regularMarketPrice) exchangeRates.EUR = quote.regularMarketPrice;
            }
            if (usdRes.status === "fulfilled") {
                const quote = Array.isArray(usdRes.value) ? usdRes.value[0] : usdRes.value;
                if (quote?.regularMarketPrice) exchangeRates.USD = quote.regularMarketPrice;
            }
        } catch (exErr) {
            console.error("YahooProvider: Failed to load exchange rates", exErr);
        }

        return { prices, exchangeRates };
    }

    async getHistory(tickers: string[], start: Date, end: Date): Promise<(MarketHistory | null)[]> {
        const results = await Promise.allSettled(
            tickers.map(async (ticker: string) => {
                const history = await yahooFinance.historical(ticker, {
                    period1: start,
                    period2: end,
                    interval: "1d",
                });
                return {
                    ticker,
                    history: history.map(h => ({
                        date: h.date.toLocaleDateString("cs-CZ"), // formatting to local string to match expected dayMap keys
                        close: h.close || 0,
                    })),
                } as MarketHistory;
            })
        );

        return results.map(r => r.status === "fulfilled" ? r.value : null);
    }
}

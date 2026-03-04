import { MarketDataProvider, MarketPrice, MarketHistory, ExchangeRates } from "./types";

export class TiingoProvider implements MarketDataProvider {
    id = "tiingo";
    name = "Tiingo";

    private get apiKey() {
        return process.env.TIINGO_API_KEY || "";
    }

    async getPrices(tickers: string[]): Promise<{ prices: (MarketPrice | null)[], exchangeRates: ExchangeRates }> {
        const exchangeRates: ExchangeRates = { EUR: 25.0, USD: 23.0 };

        if (!this.apiKey) {
            console.warn("Tiingo API key missing. Returning mocked/empty prices.");
            return { prices: tickers.map(() => null), exchangeRates };
        }

        const prices = await Promise.all(tickers.map(async (ticker) => {
            try {
                // Tiingo endpoint: https://api.tiingo.com/tiingo/daily/{ticker}/prices
                const res = await fetch(`https://api.tiingo.com/tiingo/daily/${ticker}/prices?token=${this.apiKey}`);
                if (!res.ok) return null;
                const data = await res.json();
                if (!data || data.length === 0) return null;
                const latest = data[0];
                return {
                    ticker,
                    price: latest.close,
                    currency: 'USD', // Tiingo is predominantly US markets / USD
                    symbol: ticker,
                } as MarketPrice;
            } catch (err) {
                console.error(`Tiingo failed for ${ticker}`, err);
                return null;
            }
        }));

        return { prices, exchangeRates };
    }

    async getHistory(tickers: string[], start: Date, end: Date): Promise<(MarketHistory | null)[]> {
        if (!this.apiKey) {
            return tickers.map(() => null);
        }

        const startDateStr = start.toISOString().split('T')[0];
        const endDateStr = end.toISOString().split('T')[0];

        const historyPromises = tickers.map(async (ticker) => {
            try {
                const res = await fetch(`https://api.tiingo.com/tiingo/daily/${ticker}/prices?startDate=${startDateStr}&endDate=${endDateStr}&token=${this.apiKey}`);
                if (!res.ok) return null;
                const data = await res.json();
                return {
                    ticker,
                    history: data.map((d: any) => ({
                        date: new Date(d.date).toLocaleDateString("cs-CZ"),
                        close: d.close
                    }))
                } as MarketHistory;
            } catch (err) {
                console.error(`Tiingo history failed for ${ticker}`, err);
                return null;
            }
        });

        return Promise.all(historyPromises);
    }
}

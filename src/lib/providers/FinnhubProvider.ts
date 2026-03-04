import { MarketDataProvider, MarketPrice, MarketHistory, ExchangeRates } from "./types";

export class FinnhubProvider implements MarketDataProvider {
    id = "finnhub";
    name = "Finnhub";

    private get apiKey() {
        return process.env.FINNHUB_API_KEY || "";
    }

    async getPrices(tickers: string[]): Promise<{ prices: (MarketPrice | null)[], exchangeRates: ExchangeRates }> {
        const exchangeRates: ExchangeRates = { EUR: 25.0, USD: 23.0 };

        if (!this.apiKey) {
            console.warn("Finnhub API key missing.");
            return { prices: tickers.map(() => null), exchangeRates };
        }

        const prices = await Promise.all(tickers.map(async (ticker) => {
            try {
                const cleanTicker = ticker.split('.')[0];
                const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=${cleanTicker}&token=${this.apiKey}`);
                if (!res.ok) return null;
                const data = await res.json();
                if (!data || typeof data.c === 'undefined') return null;

                return {
                    ticker,
                    price: data.c,
                    currency: 'USD',
                    symbol: ticker,
                    dailyChange: data.d,
                    dailyChangePercent: data.dp,
                } as MarketPrice;
            } catch (err) {
                console.error(`Finnhub failed for ${ticker}`, err);
                return null;
            }
        }));

        return { prices, exchangeRates };
    }

    async getHistory(tickers: string[], start: Date, end: Date): Promise<(MarketHistory | null)[]> {
        if (!this.apiKey) {
            return tickers.map(() => null);
        }

        const res = await Promise.all(tickers.map(async (ticker) => {
            try {
                const cleanTicker = ticker.split('.')[0];
                const from = Math.floor(start.getTime() / 1000);
                const to = Math.floor(end.getTime() / 1000);

                const response = await fetch(`https://finnhub.io/api/v1/stock/candle?symbol=${cleanTicker}&resolution=D&from=${from}&to=${to}&token=${this.apiKey}`);
                if (!response.ok) return null;
                const data = await response.json();

                if (data.s !== "ok" || !data.t || !data.c) return null;

                const history = data.t.map((timestamp: number, idx: number) => ({
                    date: new Date(timestamp * 1000).toLocaleDateString("cs-CZ"),
                    close: data.c[idx]
                }));

                return {
                    ticker,
                    history
                } as MarketHistory;
            } catch (err) {
                console.error(`Finnhub history failed for ${ticker}`, err);
                return null;
            }
        }));

        return res;
    }
}

export interface MarketPrice {
    ticker: string;
    price: number;
    currency: string;
    symbol?: string;
    shortName?: string;
    longName?: string;
    dailyChange?: number;
    dailyChangePercent?: number;
}

export interface MarketHistoryDay {
    date: string; // cs-CZ format "D. M. YYYY" or parsable string
    close: number;
}

export interface MarketHistory {
    ticker: string;
    history: MarketHistoryDay[];
}

export interface ExchangeRates {
    EUR: number;
    USD: number;
}

export interface MarketDataProvider {
    id: string;
    name: string;
    getPrices(tickers: string[]): Promise<{ prices: (MarketPrice | null)[], exchangeRates: ExchangeRates }>;
    getHistory(tickers: string[], startDate: Date, endDate: Date): Promise<(MarketHistory | null)[]>;
}

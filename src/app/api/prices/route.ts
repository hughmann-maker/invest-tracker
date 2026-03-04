import { NextResponse } from "next/server";
import { getProvider, providers } from "@/lib/providers";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { tickers, provider } = body;

        if (!tickers || !Array.isArray(tickers)) {
            return NextResponse.json(
                { error: "Invalid request. 'tickers' array is required." },
                { status: 400 }
            );
        }

        const dataProvider = getProvider(provider);
        const { prices, exchangeRates } = await dataProvider.getPrices(tickers);

        // If provider is Tiingo or Finnhub (which have no native FX support), fall back to Yahoo for exchange rates.
        // ECB (Frankfurter) provides accurate EUR/CZK rates natively — do NOT overwrite its rates.
        const nonFxProviders = ["tiingo", "finnhub"];
        if (nonFxProviders.includes(provider)) {
            const { exchangeRates: yahooRates } = await providers.yahoo.getPrices([]);
            if (yahooRates.EUR !== 25.0) exchangeRates.EUR = yahooRates.EUR;
            if (yahooRates.USD !== 23.0) exchangeRates.USD = yahooRates.USD;
        }

        return NextResponse.json({ prices, exchangeRates });
    } catch (error) {
        console.error("Prices API Error:", error);
        return NextResponse.json(
            { error: "Internal server error fetching prices" },
            { status: 500 }
        );
    }
}

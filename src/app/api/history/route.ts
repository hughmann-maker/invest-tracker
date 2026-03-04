import { NextRequest, NextResponse } from "next/server";
import { getProvider, providers } from "@/lib/providers";

export const dynamic = "force-dynamic";

// Returns daily historical closing prices for a list of tickers between two dates
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { tickers, startDate, endDate, provider } = body;

        if (!tickers || !Array.isArray(tickers) || !startDate) {
            return NextResponse.json(
                { error: "Invalid request. 'tickers' (array) and 'startDate' are required." },
                { status: 400 }
            );
        }

        const end = endDate ? new Date(endDate) : new Date();
        const start = new Date(startDate);

        // Don't fetch if the gap is less than 1 day
        if (end <= start) {
            return NextResponse.json({ ok: true, days: [] });
        }

        const dataProvider = getProvider(provider);
        let mainTickers: string[] = tickers;
        let yahooHistories: any[] = [];

        // Yahoo explicitly handles ^GSPC, EURCZK=X, USDCZK=X perfectly.
        // Tiingo and Finnhub fail on these symbols — so we split them to Yahoo.
        // ECB (Frankfurter) provider's getHistory() already delegates to Yahoo internally,
        // so there's no need to manually split here — ECB handles its own FX history.
        const providersNeedingYahooFxFallback = ["tiingo", "finnhub"];
        if (providersNeedingYahooFxFallback.includes(provider)) {
            const yahooSpecificTickers = ["^GSPC", "EURCZK=X", "USDCZK=X"];
            mainTickers = tickers.filter((t: string) => !yahooSpecificTickers.includes(t));
            const yTickers = tickers.filter((t: string) => yahooSpecificTickers.includes(t));

            if (yTickers.length > 0) {
                yahooHistories = await providers.yahoo.getHistory(yTickers, start, end);
            }
        }

        const tickerHistories = await dataProvider.getHistory(mainTickers, start, end);
        const combinedHistories = [...tickerHistories, ...(yahooHistories.filter(h => h !== null))];

        // Build a map of date -> { ticker: close }
        const dayMap: Record<string, Record<string, number>> = {};

        for (const th of combinedHistories) {
            if (!th) continue;
            for (const day of th.history) {
                if (!dayMap[day.date]) dayMap[day.date] = {};
                dayMap[day.date][th.ticker] = day.close;
            }
        }

        // Return as sorted array of { date, prices: { [ticker]: close } }
        const days = Object.entries(dayMap)
            .map(([date, prices]) => ({ date, prices }))
            .sort((a, b) => {
                // Parse cs-CZ date format "D. M. YYYY" for sorting
                const parseDate = (d: string) => {
                    const parts = d.replace(/\s/g, '').split('.');
                    return new Date(
                        parseInt(parts[2]),
                        parseInt(parts[1]) - 1,
                        parseInt(parts[0])
                    );
                };
                return parseDate(a.date).getTime() - parseDate(b.date).getTime();
            });

        return NextResponse.json({ ok: true, days });

    } catch (error) {
        console.error("History API Error:", error);
        return NextResponse.json(
            { error: "Internal server error fetching history" },
            { status: 500 }
        );
    }
}

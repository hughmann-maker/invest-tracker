import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { getProvider } from "@/lib/providers";

export const dynamic = "force-dynamic";

const PORTFOLIOS_DIR = path.join(process.cwd(), "portfolios");
const MANIFEST_PATH = path.join(process.cwd(), "portfolios.json");

interface Manifest {
    portfolios: { id: string; name: string; createdAt: string }[];
    activePortfolioId: string | null;
}

async function readManifest(): Promise<Manifest> {
    try {
        const content = await fs.readFile(MANIFEST_PATH, "utf-8");
        return JSON.parse(content);
    } catch {
        return { portfolios: [], activePortfolioId: null };
    }
}

function getPortfolioPath(id: string): string {
    const safe = id.replace(/[^a-z0-9-]/gi, "");
    return path.join(PORTFOLIOS_DIR, `${safe}.json`);
}

// Pearson correlation helper
function pearson(x: number[], y: number[]): number {
    const n = x.length;
    if (n === 0) return 0;
    const meanX = x.reduce((a, b) => a + b, 0) / n;
    const meanY = y.reduce((a, b) => a + b, 0) / n;
    let num = 0, denX = 0, denY = 0;
    for (let i = 0; i < n; i++) {
        const dx = x[i] - meanX;
        const dy = y[i] - meanY;
        num += dx * dy;
        denX += dx * dx;
        denY += dy * dy;
    }
    if (denX === 0 || denY === 0) return 0;
    return Math.round((num / Math.sqrt(denX * denY)) * 100) / 100;
}

async function processPortfolio(portfolioId: string, portfolioName: string) {
    const filePath = getPortfolioPath(portfolioId);
    let rawData: any;
    try {
        const content = await fs.readFile(filePath, "utf-8");
        rawData = JSON.parse(content);
    } catch {
        return null;
    }

    const assets = rawData.assets || [];
    const history = rawData.history || [];
    const deposits = rawData.deposits || [];
    const transactions = rawData.transactions || [];
    const exchangeRates = rawData.exchangeRates || { EUR: 25.0, USD: 23.0 };
    const historicalRates = rawData.historicalRates || {};

    // Portfolio summary from latest history entry
    const latestEntry = history.length > 0 ? history[history.length - 1] : null;
    const totalValueCzk = latestEntry?.totalValueCzk || 0;
    const totalInvestedCzk = latestEntry?.totalInvestedCzk || 0;
    const profitCzk = totalValueCzk - totalInvestedCzk;
    const profitPercent = totalInvestedCzk > 0 ? (profitCzk / totalInvestedCzk) * 100 : 0;
    const totalDepositedCzk = deposits.reduce((sum: number, d: any) => sum + (d.amountCzk || 0), 0);

    // Fetch live prices
    const activeTickers = assets.filter((a: any) => a.shares > 0).map((a: any) => a.ticker);
    let livePriceMap: Record<string, any> = {};
    let liveExchangeRates = exchangeRates;

    if (activeTickers.length > 0) {
        try {
            const provider = getProvider("yahoo");
            const { prices, exchangeRates: freshRates } = await provider.getPrices(activeTickers);
            if (freshRates.EUR !== 25.0) liveExchangeRates = freshRates;
            prices.forEach((p: any) => {
                if (p) {
                    livePriceMap[p.ticker] = {
                        price: p.price, currency: p.currency || "EUR",
                        dailyChange: p.dailyChange || 0, dailyChangePercent: p.dailyChangePercent || 0,
                        name: p.shortName || p.longName || p.ticker,
                    };
                }
            });
        } catch (err) {
            console.warn(`Agent API: Failed to fetch prices for ${portfolioId}`, err);
        }
    }

    // Enrich assets
    let liveTotalValueCzk = 0;
    const enrichedAssets = assets.map((a: any) => {
        const live = livePriceMap[a.ticker];
        const price = live?.price || 0;
        const currency = live?.currency || "EUR";
        const fxRate = currency === "CZK" ? 1 : currency === "EUR" ? liveExchangeRates.EUR : liveExchangeRates.USD;
        const valueCzk = a.shares * price * fxRate;
        liveTotalValueCzk += valueCzk;
        return {
            ticker: a.ticker, name: live?.name || a.ticker, shares: a.shares,
            price, currency, dailyChangePercent: live?.dailyChangePercent || 0,
            valueCzk: Math.round(valueCzk * 100) / 100,
            valueEur: Math.round((valueCzk / liveExchangeRates.EUR) * 100) / 100,
            targetWeight: a.targetWeight,
        };
    });

    const portfolioAssets = enrichedAssets.map((a: any) => ({
        ...a,
        actualWeight: liveTotalValueCzk > 0 ? Math.round((a.valueCzk / liveTotalValueCzk) * 10000) / 10000 : 0,
    }));

    // Correlation matrix
    let correlationMatrix: { tickers: string[]; correlations: number[][] } | null = null;
    if (activeTickers.length >= 2) {
        try {
            const start = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
            const end = new Date();
            const provider = getProvider("yahoo");
            const tickerHistories = await provider.getHistory(activeTickers, start, end);
            const dayMap: Record<string, Record<string, number>> = {};
            for (const th of tickerHistories) {
                if (!th) continue;
                for (const day of th.history) {
                    if (!dayMap[day.date]) dayMap[day.date] = {};
                    dayMap[day.date][th.ticker] = day.close;
                }
            }
            const sortedDays = Object.entries(dayMap)
                .map(([date, prices]) => ({ date, prices }))
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

            if (sortedDays.length >= 5) {
                const returns: Record<string, number[]> = {};
                for (const t of activeTickers) returns[t] = [];
                for (let i = 1; i < sortedDays.length; i++) {
                    const prev = sortedDays[i - 1].prices;
                    const curr = sortedDays[i].prices;
                    for (const t of activeTickers) {
                        const p0 = prev[t]; const p1 = curr[t];
                        returns[t].push(p0 && p1 && p0 > 0 ? (p1 - p0) / p0 : 0);
                    }
                }
                const n = activeTickers.length;
                const matrix: number[][] = Array(n).fill(0).map(() => Array(n).fill(0));
                for (let i = 0; i < n; i++) {
                    for (let j = 0; j < n; j++) {
                        matrix[i][j] = i === j ? 1 : pearson(returns[activeTickers[i]], returns[activeTickers[j]]);
                    }
                }
                correlationMatrix = { tickers: activeTickers, correlations: matrix };
            }
        } catch (corrErr) {
            console.warn(`Agent API: Failed to compute correlation for ${portfolioId}`, corrErr);
        }
    }

    return {
        id: portfolioId,
        name: portfolioName,
        portfolio: {
            assets: portfolioAssets,
            totalValueCzk: Math.round(totalValueCzk * 100) / 100,
            totalValueEur: Math.round((totalValueCzk / exchangeRates.EUR) * 100) / 100,
            totalInvestedCzk: Math.round(totalInvestedCzk * 100) / 100,
            totalDepositedCzk,
            profitCzk: Math.round(profitCzk * 100) / 100,
            profitPercent: Math.round(profitPercent * 100) / 100,
            lastSnapshotDate: latestEntry?.date || null,
        },
        transactions: transactions.map((tx: any) => ({
            id: tx.id, ticker: tx.ticker, type: tx.type, shares: tx.shares,
            pricePerShare: tx.pricePerShare, currency: tx.currency, date: tx.date, note: tx.note || null,
        })),
        deposits: deposits.map((d: any) => ({
            id: d.id, date: d.date, amountCzk: d.amountCzk, note: d.note || null,
        })),
        history: history.map((h: any) => ({
            date: h.date, totalValueCzk: h.totalValueCzk, totalValueEur: h.totalValueEur,
            totalInvestedCzk: h.totalInvestedCzk, benchmarkValue: h.benchmarkValue || null,
        })),
        correlationMatrix,
        exchangeRates: liveExchangeRates,
        historicalRates,
        meta: {
            lastSaved: rawData.lastSaved || null,
            dataSource: `portfolios/${portfolioId}.json`,
            apiVersion: "2.0",
        },
    };
}

function generateCsv(portfolioResult: any): string {
    const SEP = ";";
    const lines: string[] = [];
    const p = portfolioResult;

    // Assets
    lines.push(["Ticker", "Název", "Cena EUR", "Kusy", "Hodnota EUR", "Hodnota CZK", "Cíl %", "Aktuální %"].join(SEP));
    for (const a of p.portfolio.assets) {
        lines.push([a.ticker, a.name, a.price.toFixed(2), a.shares, a.valueEur.toFixed(2), a.valueCzk.toFixed(2),
        (a.targetWeight * 100).toFixed(1), (a.actualWeight * 100).toFixed(1)].join(SEP));
    }
    lines.push("");

    // Transactions
    lines.push("Transakce");
    lines.push(["Datum", "Ticker", "Typ", "Kusy", "Cena/ks", "Celkem EUR", "Poznámka"].join(SEP));
    for (const tx of p.transactions) {
        const totalEur = tx.shares * tx.pricePerShare;
        lines.push([tx.date, tx.ticker, tx.type, tx.shares, tx.pricePerShare.toFixed(2), totalEur.toFixed(2), tx.note || ""].join(SEP));
    }
    lines.push("");

    // Deposits
    lines.push("Vklady");
    lines.push(["Datum", "Částka CZK", "Poznámka"].join(SEP));
    for (const d of p.deposits) {
        lines.push([d.date, d.amountCzk, d.note || ""].join(SEP));
    }
    lines.push("");

    // History
    lines.push("Historie Portfolia");
    lines.push(["Datum", "Hodnota EUR", "Hodnota CZK", "Investováno CZK"].join(SEP));
    for (const h of p.history) {
        lines.push([h.date, (h.totalValueEur || 0).toFixed(2), (h.totalValueCzk || 0).toFixed(2), (h.totalInvestedCzk || 0).toFixed(2)].join(SEP));
    }
    lines.push("");

    // Correlation Matrix
    if (p.correlationMatrix) {
        lines.push("Korelační matice");
        lines.push(["", ...p.correlationMatrix.tickers].join(SEP));
        p.correlationMatrix.tickers.forEach((t: string, i: number) => {
            lines.push([t, ...p.correlationMatrix.correlations[i].map((v: number) => v.toFixed(2))].join(SEP));
        });
        lines.push("");
    }

    // Exchange Rates
    const today = new Date().toLocaleDateString("cs-CZ");
    lines.push(`Kurzy (${today})`);
    lines.push(["Měna", "Kurz CZK"].join(SEP));
    lines.push(["EUR", p.exchangeRates.EUR.toFixed(4)].join(SEP));
    lines.push(["USD", p.exchangeRates.USD.toFixed(4)].join(SEP));
    lines.push("");

    // Historical Rates
    lines.push("Historické kurzy");
    lines.push(["Datum", "EUR/CZK", "USD/CZK"].join(SEP));
    Object.entries(p.historicalRates)
        .sort(([a], [b]) => {
            const pa = a.replace(/\s/g, '').split('.'); const pb = b.replace(/\s/g, '').split('.');
            return new Date(+pa[2], +pa[1] - 1, +pa[0]).getTime() - new Date(+pb[2], +pb[1] - 1, +pb[0]).getTime();
        })
        .forEach(([date, rates]: [string, any]) => {
            lines.push([date, (rates.EUR || 0).toFixed(4), (rates.USD || 0).toFixed(4)].join(SEP));
        });

    return lines.join("\n");
}

/**
 * GET /api/agent
 *
 * Read-only AI Agent API endpoint.
 * Returns ALL portfolios in a structured JSON/CSV format.
 */
export async function GET(request: NextRequest) {
    try {
        const manifest = await readManifest();

        if (manifest.portfolios.length === 0) {
            return NextResponse.json({
                error: "No portfolios found. Create a portfolio first.",
            }, { status: 404 });
        }

        // Process all portfolios
        const results = [];
        for (const entry of manifest.portfolios) {
            const result = await processPortfolio(entry.id, entry.name);
            if (result) results.push(result);
        }

        const format = request.nextUrl.searchParams.get("format");

        // CSV format
        if (format === "csv") {
            const BOM = "\uFEFF";
            const csvParts: string[] = [];

            for (const r of results) {
                if (results.length > 1) {
                    csvParts.push(`=== ${r.name} ===`);
                    csvParts.push("");
                }
                csvParts.push(generateCsv(r));
            }

            const csvContent = BOM + csvParts.join("\n");
            return new NextResponse(csvContent, {
                headers: {
                    "Content-Type": "text/csv; charset=utf-8",
                    "Content-Disposition": "attachment; filename=portfolio_report.csv",
                },
            });
        }

        // JSON format
        const response = {
            portfolios: results,
            meta: {
                totalPortfolios: results.length,
                generatedAt: new Date().toISOString(),
                apiVersion: "2.0",
            },
        };

        return NextResponse.json(response);

    } catch (error) {
        console.error("Agent API Error:", error);
        return NextResponse.json(
            { error: "Internal server error reading portfolio data" },
            { status: 500 }
        );
    }
}

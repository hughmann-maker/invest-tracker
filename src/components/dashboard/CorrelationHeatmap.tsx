"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Grid3X3, Loader2 } from "lucide-react";
import type { Asset } from "./AssetsList";
import { useLanguage } from "@/lib/i18n/LanguageContext";

interface CorrelationHeatmapProps {
    assets: Asset[];
    historyData: { date: string;[key: string]: any }[];
}

export function CorrelationHeatmap({ assets, historyData }: CorrelationHeatmapProps) {
    const { t } = useLanguage();

    const [matrix, setMatrix] = useState<{ tickers: string[], correlations: number[][] } | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // Re-fetch only if the list of tickers changes
    const tickerString = useMemo(() => assets.map(a => a.ticker).sort().join(","), [assets]);

    useEffect(() => {
        const fetchCorrelations = async () => {
            const tickers = tickerString.split(",").filter(Boolean);
            if (tickers.length < 2) {
                setMatrix(null);
                return;
            }

            setIsLoading(true);
            try {
                // Fetch 90 days to have enough valid trading days
                const start = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

                const res = await fetch("/api/history", {
                    method: "POST",
                    body: JSON.stringify({ tickers, startDate: start, provider: "yahoo" }),
                });

                if (!res.ok) throw new Error("Failed to fetch history");

                const { days } = await res.json();
                if (!days || days.length < 5) throw new Error("Not enough data");

                const returns: Record<string, number[]> = {};
                for (const t of tickers) returns[t] = [];

                for (let i = 1; i < days.length; i++) {
                    const prev = days[i - 1].prices;
                    const curr = days[i].prices;

                    for (const t of tickers) {
                        const p0 = prev[t];
                        const p1 = curr[t];
                        if (p0 && p1 && p0 > 0) {
                            returns[t].push((p1 - p0) / p0);
                        } else {
                            returns[t].push(0); // Missing data fallback
                        }
                    }
                }

                const calculatePearson = (x: number[], y: number[]) => {
                    if (x.length === 0 || y.length === 0 || x.length !== y.length) return 0;
                    const n = x.length;
                    const meanX = x.reduce((a, b) => a + b, 0) / n;
                    const meanY = y.reduce((a, b) => a + b, 0) / n;

                    let num = 0;
                    let denX = 0;
                    let denY = 0;
                    for (let i = 0; i < n; i++) {
                        const dx = x[i] - meanX;
                        const dy = y[i] - meanY;
                        num += dx * dy;
                        denX += dx * dx;
                        denY += dy * dy;
                    }
                    if (denX === 0 || denY === 0) return 0;
                    return num / Math.sqrt(denX * denY);
                };

                const n = tickers.length;
                const correlations: number[][] = Array(n).fill(0).map(() => Array(n).fill(0));

                for (let i = 0; i < n; i++) {
                    for (let j = 0; j < n; j++) {
                        if (i === j) {
                            correlations[i][j] = 1;
                        } else {
                            correlations[i][j] = calculatePearson(returns[tickers[i]], returns[tickers[j]]);
                        }
                    }
                }

                setMatrix({ tickers, correlations });
            } catch (err) {
                console.error("Correlation error:", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchCorrelations();
    }, [tickerString]);

    if (!matrix || matrix.tickers.length < 2) return null;

    const getColor = (val: number) => {
        if (val >= 0.7) return "bg-emerald-500/80 text-white";
        if (val >= 0.3) return "bg-emerald-300/60 text-emerald-900 dark:text-emerald-100";
        if (val >= 0) return "bg-zinc-200/60 dark:bg-zinc-700/60 text-zinc-700 dark:text-zinc-300";
        if (val >= -0.3) return "bg-orange-200/60 text-orange-900 dark:text-orange-100";
        return "bg-red-400/80 text-white";
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="w-full mt-8 rounded-3xl border border-white/40 dark:border-white/10 bg-white/60 dark:bg-zinc-900/40 backdrop-blur-2xl p-6 md:p-8 shadow-xl shadow-black/5 mb-8"
        >
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-100 text-cyan-600 dark:bg-cyan-900/40 dark:text-cyan-400">
                        <Grid3X3 size={20} />
                    </div>
                    <div>
                        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
                            {t("heatmap.title")}
                        </h2>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
                            {t("heatmap.subtitle")}
                            {isLoading && <Loader2 className="w-3 h-3 animate-spin text-zinc-400" />}
                        </p>
                    </div>
                </div>
            </div>

            <div className="-mx-2 overflow-x-auto px-2">
                <table className="min-w-max w-full">
                    <thead>
                        <tr>
                            <th className="p-1 sm:p-2 text-[10px] sm:text-xs font-bold text-zinc-500"></th>
                            {matrix.tickers.map((t, idx) => (
                                <th key={`h-${idx}`} className="p-1 sm:p-2 text-[10px] sm:text-xs font-bold text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                                    {t.replace(".DE", "")}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {matrix.tickers.map((t, i) => (
                            <tr key={`r-${i}`}>
                                <td className="p-1 sm:p-2 text-[10px] sm:text-xs font-bold text-zinc-500 dark:text-zinc-400 text-right pr-2 sm:pr-3 whitespace-nowrap">
                                    {t.replace(".DE", "")}
                                </td>
                                {matrix.correlations[i].map((val, j) => (
                                    <td key={j} className="p-0.5 sm:p-1">
                                        <div className={`rounded-lg sm:rounded-xl text-center text-[10px] sm:text-xs font-bold tabular-nums py-1.5 sm:py-2 px-1.5 sm:px-2 min-w-[40px] ${getColor(val)}`}>
                                            {val.toFixed(2)}
                                        </div>
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="mt-4 flex items-center gap-4 text-[10px] text-zinc-400 justify-center">
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-emerald-500/80"></div> {t("heatmap.high")}</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-zinc-300 dark:bg-zinc-600"></div> {t("heatmap.low")}</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-red-400/80"></div> {t("heatmap.negative")}</div>
            </div>
        </motion.div>
    );
}

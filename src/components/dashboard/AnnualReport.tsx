"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart3, TrendingUp, TrendingDown, Calendar, Search, SearchCheck, CalendarDays, Wallet, Activity, CalendarIcon } from "lucide-react";
import { cn } from "@/utils/cn";
import { useLanguage } from "@/lib/i18n/LanguageContext";

export interface Transaction {
    id?: string;
    date: string; // DD. MM. YYYY
    ticker: string;
    type: "BUY" | "SELL";
    shares: number;
    pricePerShare: number;
    currency: "CZK" | "EUR" | "USD";
    note?: string;
}

interface AnnualReportProps {
    historyData: { date: string; totalValueEur?: number; totalValueCzk: number; totalInvestedCzk?: number }[];
    deposits: { amountCzk: number; date: string }[];
    transactions: Transaction[];
    assets?: { ticker: string; currency: string; shares: number; price: number }[];
    mainCurrency?: "CZK" | "EUR" | "USD";
    secondaryCurrency?: "CZK" | "EUR" | "USD";
    exchangeRates?: { EUR: number; USD: number };
}

export function AnnualReport({ historyData, deposits, transactions, assets, mainCurrency = "CZK", secondaryCurrency = "EUR", exchangeRates = { EUR: 25.0, USD: 23.0 } }: AnnualReportProps) {
    const { t } = useLanguage();
    const [period, setPeriod] = useState<"1W" | "1M" | "6M" | "1Y" | "ALL" | "CUSTOM">("ALL");
    const [customStart, setCustomStart] = useState<string>("");
    const [customEnd, setCustomEnd] = useState<string>("");

    const parseCzDate = (s: string) => {
        const parts = s.replace(/\s/g, '').split('.');
        return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0])).getTime();
    };

    const filteredHistory = useMemo(() => {
        if (historyData.length === 0) return [];

        // Find latest date in historyData as the "now" anchor
        const lastEntryDate = parseCzDate(historyData[historyData.length - 1].date);
        const anchorDate = new Date(lastEntryDate);

        let startTs = 0;
        let endTs = lastEntryDate;

        if (period === "1W") {
            startTs = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), anchorDate.getDate() - 7).getTime();
        } else if (period === "1M") {
            startTs = new Date(anchorDate.getFullYear(), anchorDate.getMonth() - 1, anchorDate.getDate()).getTime();
        } else if (period === "6M") {
            startTs = new Date(anchorDate.getFullYear(), anchorDate.getMonth() - 6, anchorDate.getDate()).getTime();
        } else if (period === "1Y") {
            startTs = new Date(anchorDate.getFullYear() - 1, anchorDate.getMonth(), anchorDate.getDate()).getTime();
        } else if (period === "CUSTOM") {
            if (customStart) startTs = new Date(customStart).getTime();
            if (customEnd) endTs = new Date(customEnd).getTime();
            else endTs = Infinity;
        } else {
            // ALL
            startTs = 0;
            endTs = Infinity;
        }

        return historyData.filter(h => {
            const t = parseCzDate(h.date);
            return t >= startTs && t <= endTs;
        });
    }, [historyData, period, customStart, customEnd]);

    const stats = useMemo(() => {
        if (filteredHistory.length === 0) return null;

        const endEntry = filteredHistory[filteredHistory.length - 1];

        // Determine the temporal bounding box
        const endTs = parseCzDate(endEntry.date);
        const startTs = period === "ALL" ? 0 : parseCzDate(filteredHistory[0].date);

        // Base values at the start of the timeframe -> 0 if we look at ALL history
        const startValueCzk = period === "ALL" ? 0 : (filteredHistory[0].totalValueCzk || 0);
        const startInvestedCzk = period === "ALL" ? 0 : (filteredHistory[0].totalInvestedCzk || 0);

        const endValueCzk = endEntry.totalValueCzk || 0;
        const endInvestedCzk = endEntry.totalInvestedCzk || 0;

        // The absolute numbers relative to the time window
        const currentValue = endValueCzk;
        const totalInvested = endInvestedCzk - startInvestedCzk;

        // Profit achieved purely inside this window = Change in value MINUS change in cash capital added
        const valueDelta = endValueCzk - startValueCzk;
        const profit = valueDelta - totalInvested;

        // Return on invested capital purely within this frame
        // If they had money at `startValueCzk`, we treat it as rolling invested capital for the period calculation
        const baseCapital = period === "ALL" ? totalInvested : (startValueCzk + totalInvested);
        const profitPercent = baseCapital > 0 ? (profit / baseCapital) * 100 : 0;

        // Filter transactions only for the selected window to display EUR/USD raw changes
        const relevantTx = transactions.filter(t => {
            const txTime = parseCzDate(t.date);
            return txTime >= startTs && txTime <= endTs;
        });

        // To prevent currency mismatch bugs (e.g., user buys in USD, it gets logged as USD but evaluated against EUR),
        // the single source of truth for portfolio cashflow is `totalInvested`, which correctly scales historical CZK rates.
        // However, the user explicitly requested that `investedEur` and `investedUsd` remain strictly STATIC
        // exactly matching the sum from their transaction history logs instead of a dynamic inverse exchange conversion.
        let investedEur = 0;
        let investedUsd = 0;

        relevantTx.forEach(t => {
            const rawShares = t.shares;
            const price = t.pricePerShare;
            const val = t.type === "BUY" ? price * rawShares : -price * rawShares;
            if (t.currency === "EUR" || (!t.currency && assets?.find(a => a.ticker === t.ticker)?.currency === "EUR")) {
                investedEur += val;
            } else if (t.currency === "USD" || (!t.currency && assets?.find(a => a.ticker === t.ticker)?.currency === "USD")) {
                investedUsd += val;
            }
        });

        // Daily changes for volatility
        const monthlyChanges: { month: string; change: number }[] = [];
        for (let i = 1; i < filteredHistory.length; i++) {
            const prev = filteredHistory[i - 1];
            const curr = filteredHistory[i];
            const prevInvested = prev.totalInvestedCzk || 0;
            const currInvested = curr.totalInvestedCzk || 0;
            const change = (curr.totalValueCzk - prev.totalValueCzk) - (currInvested - prevInvested);
            monthlyChanges.push({ month: curr.date, change });
        }

        // Volatility (std deviation of daily changes)
        const changes = monthlyChanges.map(m => m.change);
        const avg = changes.length > 0 ? changes.reduce((s, c) => s + c, 0) / changes.length : 0;
        const variance = changes.length > 0 ? changes.reduce((s, c) => s + Math.pow(c - avg, 2), 0) / changes.length : 0;
        const volatility = Math.sqrt(variance);

        const isLatest = endTs === parseCzDate(historyData[historyData.length - 1].date);
        let currentEur = 0;
        let currentUsd = 0;

        if (isLatest && assets) {
            currentEur = assets.filter(a => a.currency === "EUR").reduce((s, a) => s + (a.shares * a.price), 0);
            currentUsd = assets.filter(a => a.currency === "USD").reduce((s, a) => s + (a.shares * a.price), 0);
        }

        return {
            totalInvested,
            investedEur,
            investedUsd,
            currentValue,
            currentEur,
            currentUsd,
            isLatest,
            profit,
            profitPercent,
            volatility,
            daysTracked: filteredHistory.length
        };
    }, [filteredHistory, transactions, assets, historyData]);

    const formatCurrency = (val: number, currency: string) => {
        return new Intl.NumberFormat("cs-CZ", {
            style: "currency",
            currency,
            maximumFractionDigits: currency === "CZK" ? 0 : 2
        }).format(val);
    };

    const displayInvested = mainCurrency === "CZK" ? (stats?.totalInvested || 0) : mainCurrency === "EUR" ? (stats?.totalInvested || 0) / exchangeRates.EUR : (stats?.totalInvested || 0) / exchangeRates.USD;
    const displayCurrentValue = mainCurrency === "CZK" ? (stats?.currentValue || 0) : mainCurrency === "EUR" ? (stats?.currentValue || 0) / exchangeRates.EUR : (stats?.currentValue || 0) / exchangeRates.USD;
    const displayProfit = mainCurrency === "CZK" ? (stats?.profit || 0) : mainCurrency === "EUR" ? (stats?.profit || 0) / exchangeRates.EUR : (stats?.profit || 0) / exchangeRates.USD;
    const displayVolatility = mainCurrency === "CZK" ? (stats?.volatility || 0) : mainCurrency === "EUR" ? (stats?.volatility || 0) / exchangeRates.EUR : (stats?.volatility || 0) / exchangeRates.USD;

    const displayInvestedSec = secondaryCurrency === "CZK" ? (stats?.totalInvested || 0) : secondaryCurrency === "EUR" ? (stats?.totalInvested || 0) / exchangeRates.EUR : (stats?.totalInvested || 0) / exchangeRates.USD;
    const displayCurrentValueSec = secondaryCurrency === "CZK" ? (stats?.currentValue || 0) : secondaryCurrency === "EUR" ? (stats?.currentValue || 0) / exchangeRates.EUR : (stats?.currentValue || 0) / exchangeRates.USD;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="w-full mt-8 rounded-3xl border border-white/40 dark:border-white/10 bg-white/60 dark:bg-zinc-900/40 backdrop-blur-2xl p-6 md:p-8 shadow-xl shadow-black/5 mb-8"
        >
            <div className="flex flex-col xl:flex-row xl:items-start justify-between mb-8 gap-6">
                <div>
                    <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight flex items-center gap-2 mb-1.5">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400">
                            <CalendarDays size={16} />
                        </span>
                        {t("report.title")}
                    </h2>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        {t("report.days").replace("{days}", stats ? stats.daysTracked.toString() : "0")}
                    </p>
                </div>

                <div className="flex flex-col lg:items-end gap-3 w-full xl:w-auto">
                    <div className="flex flex-wrap items-center gap-1.5 bg-zinc-100/80 dark:bg-zinc-800/50 p-1.5 rounded-2xl w-full sm:w-auto">
                        {["1W", "1M", "6M", "1Y", "ALL", "CUSTOM"].map((p) => (
                            <button
                                key={p}
                                onClick={() => setPeriod(p as any)}
                                className={cn(
                                    "flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200",
                                    period === p
                                        ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm border border-black/5 dark:border-white/5"
                                        : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-black/5 dark:hover:bg-white/5"
                                )}
                            >
                                {p === "1W" ? t("report.1w") : p === "1M" ? t("report.1m") : p === "6M" ? t("report.6m") : p === "1Y" ? t("report.1y") : p === "ALL" ? t("report.all") : t("report.custom")}
                            </button>
                        ))}
                    </div>

                    <AnimatePresence>
                        {period === "CUSTOM" && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="flex items-center gap-2 overflow-hidden"
                            >
                                <div className="relative">
                                    <input
                                        type="date"
                                        value={customStart}
                                        onChange={(e) => setCustomStart(e.target.value)}
                                        className="pl-9 pr-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-zinc-700 dark:text-zinc-300 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none transition-all shadow-sm"
                                    />
                                    <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
                                </div>
                                <span className="text-zinc-400 font-medium px-1">-</span>
                                <div className="relative">
                                    <input
                                        type="date"
                                        value={customEnd}
                                        onChange={(e) => setCustomEnd(e.target.value)}
                                        className="pl-9 pr-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-zinc-700 dark:text-zinc-300 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none transition-all shadow-sm"
                                    />
                                    <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
            {stats ? (
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    {/* Celkem vloženo */}
                    <div className="rounded-2xl border border-zinc-200/50 dark:border-zinc-800/50 bg-zinc-50/50 dark:bg-zinc-800/20 p-5 flex flex-col justify-between">
                        <div>
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/40 mb-4">
                                <Wallet size={18} />
                            </div>
                            <div className="text-[13px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">{t("report.invested")}</div>
                            <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 tabular-nums tracking-tight privacy-blur">{formatCurrency(displayInvested, mainCurrency)}</div>
                        </div>
                        {((mainCurrency !== secondaryCurrency) ||
                            (stats.investedEur > 0 && mainCurrency !== "EUR" && secondaryCurrency !== "EUR") ||
                            (stats.investedUsd > 0 && mainCurrency !== "USD" && secondaryCurrency !== "USD")) && (
                                <div className="mt-4 pt-3 border-t border-zinc-200 dark:border-zinc-700 flex flex-col gap-1.5">
                                    {mainCurrency !== secondaryCurrency && (
                                        <div className="flex items-center justify-between text-xs font-semibold">
                                            <span className="text-zinc-500 dark:text-zinc-400 privacy-blur">{formatCurrency(displayInvestedSec, secondaryCurrency)}</span>
                                            <span className="text-zinc-500 dark:text-zinc-500">{secondaryCurrency}</span>
                                        </div>
                                    )}
                                    {stats.investedEur > 0 && mainCurrency !== "EUR" && secondaryCurrency !== "EUR" && (
                                        <div className="flex items-center justify-between text-xs font-semibold">
                                            <span className="text-emerald-700 dark:text-emerald-400 privacy-blur">{formatCurrency(stats.investedEur, "EUR")} (Hist.)</span>
                                            <span className="text-emerald-700 dark:text-emerald-400">EUR</span>
                                        </div>
                                    )}
                                    {stats.investedUsd > 0 && mainCurrency !== "USD" && secondaryCurrency !== "USD" && (
                                        <div className="flex items-center justify-between text-xs font-semibold">
                                            <span className="text-blue-700 dark:text-blue-400 privacy-blur">{formatCurrency(stats.investedUsd, "USD")} (Hist.)</span>
                                            <span className="text-blue-700 dark:text-blue-400">USD</span>
                                        </div>
                                    )}
                                </div>
                            )}
                    </div>

                    {/* Aktuální hodnota */}
                    <div className="rounded-2xl border border-zinc-200/50 dark:border-zinc-800/50 bg-zinc-50/50 dark:bg-zinc-800/20 p-5 flex flex-col justify-between">
                        <div>
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl text-violet-600 dark:text-violet-400 bg-violet-100 dark:bg-violet-900/40 mb-4">
                                <BarChart3 size={18} />
                            </div>
                            <div className="text-[13px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">{t("report.currentValue")}</div>
                            <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 tabular-nums tracking-tight privacy-blur">{formatCurrency(displayCurrentValue, mainCurrency)}</div>
                        </div>
                        {(mainCurrency !== secondaryCurrency ||
                            (stats.isLatest && stats.currentEur > 0 && mainCurrency !== "EUR" && secondaryCurrency !== "EUR") ||
                            (stats.isLatest && stats.currentUsd > 0 && mainCurrency !== "USD" && secondaryCurrency !== "USD")) ? (
                            <div className="mt-4 pt-3 border-t border-zinc-200 dark:border-zinc-700 flex flex-col gap-1.5">
                                {mainCurrency !== secondaryCurrency && (
                                    <div className="flex items-center justify-between text-xs font-semibold">
                                        <span className="text-zinc-500 dark:text-zinc-400 privacy-blur">{formatCurrency(displayCurrentValueSec, secondaryCurrency)}</span>
                                        <span className="text-zinc-500 dark:text-zinc-500">{secondaryCurrency}</span>
                                    </div>
                                )}
                                {stats.isLatest && stats.currentEur > 0 && mainCurrency !== "EUR" && secondaryCurrency !== "EUR" && (
                                    <div className="flex items-center justify-between text-xs font-semibold">
                                        <span className="text-emerald-700 dark:text-emerald-400 privacy-blur">{formatCurrency(stats.currentEur, "EUR")}</span>
                                        <span className="text-emerald-700 dark:text-emerald-400">EUR</span>
                                    </div>
                                )}
                                {stats.isLatest && stats.currentUsd > 0 && mainCurrency !== "USD" && secondaryCurrency !== "USD" && (
                                    <div className="flex items-center justify-between text-xs font-semibold">
                                        <span className="text-blue-700 dark:text-blue-400 privacy-blur">{formatCurrency(stats.currentUsd, "USD")}</span>
                                        <span className="text-blue-700 dark:text-blue-400">USD</span>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <p className="mt-4 pt-3 border-t border-zinc-200 dark:border-zinc-700 text-[11px] text-zinc-500 leading-tight">
                                Aktuální celková hodnota portfolia přepočtena do CZK dle aktuálních kurzů.
                            </p>
                        )}
                    </div>

                    {/* Čistý zisk/ztráta */}
                    <div className="rounded-2xl border border-zinc-200/50 dark:border-zinc-800/50 bg-zinc-50/50 dark:bg-zinc-800/20 p-5 flex flex-col">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${stats.profit >= 0 ? "text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/40" : "text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/40"} mb-4`}>
                            {stats.profit >= 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                        </div>
                        <div className="text-[13px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">{t("report.netProfit")}</div>
                        <div className={`text-2xl font-bold tabular-nums tracking-tight privacy-blur ${stats.profit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                            {stats.profit > 0 ? "+" : ""}{formatCurrency(displayProfit, mainCurrency)}
                        </div>
                        <div className="mt-4 pt-3 border-t border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
                            <span className="text-[11px] text-zinc-500 font-medium uppercase tracking-wider">{t("report.roi")}</span>
                            <span className={`text-xs font-bold tabular-nums px-2 py-0.5 rounded-md privacy-blur ${stats.profit >= 0 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"}`}>
                                {stats.profit > 0 ? "+" : ""}{stats.profitPercent.toFixed(1)}%
                            </span>
                        </div>
                    </div>

                    {/* Volatilita */}
                    <div className="rounded-2xl border border-zinc-200/50 dark:border-zinc-800/50 bg-zinc-50/50 dark:bg-zinc-800/20 p-5 relative group cursor-help flex flex-col">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/40 mb-4">
                            <Activity size={18} />
                        </div>
                        <div className="text-[13px] font-medium text-zinc-500 dark:text-zinc-400 mb-1 border-b border-dashed border-zinc-300 dark:border-zinc-700 pb-0.5 inline-block self-start">{t("report.volatility")}</div>
                        <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 tabular-nums tracking-tight">{formatCurrency(displayVolatility, mainCurrency)}</div>
                        <p className="mt-4 pt-3 border-t border-zinc-200 dark:border-zinc-700 text-[11px] text-zinc-500 leading-tight">
                            {t("report.volatilityDesc")}
                        </p>

                        {/* Tooltip */}
                        <div className="absolute bottom-full right-0 md:left-1/2 md:-translate-x-1/2 mb-3 p-3.5 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 w-56 sm:w-64 z-[100] bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-xs rounded-xl shadow-xl border border-zinc-200 dark:border-zinc-700">
                            Představuje průměrnou směrodatnou odchylku denních změn celkové hodnoty portfolia. Vyšší číslo znamená větší výkyvy a zpravidla rizikovější povahu portfolia.
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-12 text-zinc-500 bg-white/40 dark:bg-zinc-900/20 rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700">
                    <Search size={32} className="mb-4 text-zinc-300 dark:text-zinc-600" />
                    <p className="text-sm font-medium">Pro vybrané období nebyly nalezeny žádné záznamy.</p>
                    <p className="text-xs text-zinc-400 mt-1 max-w-sm text-center">Vyberte širší časové rozpětí nebo počkejte, až se v historii nashromáždí více denních dat.</p>
                </div>
            )}
        </motion.div>
    );
}

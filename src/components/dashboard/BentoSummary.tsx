"use client";

import { motion } from "framer-motion";
import { ArrowUpRight, ArrowDownRight, Wallet, Activity } from "lucide-react";
import { cn } from "@/utils/cn";
import { useLanguage } from "@/lib/i18n/LanguageContext";

interface BentoSummaryProps {
    totalValue: number;
    totalValueCzk: number;
    dailyChange: number;
    dailyChangePercent: number;
    isPositive: boolean;
    exchangeRates: { EUR: number, USD: number };
    lastUpdated?: Date | null;
    onRefresh?: () => void;
    autoRefresh?: boolean;
    onAutoRefreshToggle?: () => void;
    refreshIntervalMs?: number;
    mainCurrency?: "CZK" | "EUR" | "USD";
    secondaryCurrency?: "CZK" | "EUR" | "USD";
}

export function BentoSummary({
    totalValue,
    totalValueCzk,
    dailyChange,
    dailyChangePercent,
    isPositive,
    exchangeRates,
    lastUpdated,
    onRefresh,
    autoRefresh = false,
    onAutoRefreshToggle,
    refreshIntervalMs = 60000,
    mainCurrency = "CZK",
    secondaryCurrency = "EUR",
}: BentoSummaryProps) {
    const { t } = useLanguage();

    // Formatters
    const formatCurrency = (val: number, currency: string = "EUR") => {
        return new Intl.NumberFormat("cs-CZ", {
            style: "currency",
            currency: currency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(val);
    };

    // Note: totalValueCzk is passed directly avoiding single currency assumptions.
    const getIntervalDisplay = (ms: number) => {
        const mins = Math.round(ms / 60000);
        if (mins >= 60) return `${Math.round(mins / 60)}h`;
        return `${mins}m`;
    };

    // The parent passes `totalDailyChangeCzk` as `dailyChange`
    const dailyChangeCzk = dailyChange;
    const dailyChangeEur = dailyChange / exchangeRates.EUR;

    // Dynamic Display values based on mainCurrency
    const displayTotalValue = mainCurrency === "CZK" ? totalValueCzk : mainCurrency === "EUR" ? totalValueCzk / exchangeRates.EUR : totalValueCzk / exchangeRates.USD;
    const displayDailyChange = mainCurrency === "CZK" ? dailyChangeCzk : mainCurrency === "EUR" ? dailyChangeCzk / exchangeRates.EUR : dailyChangeCzk / exchangeRates.USD;

    const displayTotalValueSec = secondaryCurrency === "CZK" ? totalValueCzk : secondaryCurrency === "EUR" ? totalValueCzk / exchangeRates.EUR : totalValueCzk / exchangeRates.USD;
    const displayDailyChangeSec = secondaryCurrency === "CZK" ? dailyChangeCzk : secondaryCurrency === "EUR" ? dailyChangeCzk / exchangeRates.EUR : dailyChangeCzk / exchangeRates.USD;

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Primary Card - Total Portfolio Value */}
            <motion.div
                className="col-span-1 md:col-span-2 relative overflow-hidden rounded-3xl border border-white/40 dark:border-white/10 bg-white/60 dark:bg-zinc-900/40 backdrop-blur-2xl p-8 shadow-xl shadow-black/5"
                whileHover={{ scale: 0.995 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
                <div className="absolute top-0 right-0 p-8 opacity-10 dark:opacity-5">
                    <Wallet size={120} />
                </div>
                <div className="relative z-10 flex flex-col justify-between h-full">
                    <div className="mb-4">
                        <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 capitalize tracking-wide">
                            {t("summary.totalValue")}
                        </h2>
                    </div>
                    <div>
                        <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-4">
                            <div className="text-5xl sm:text-6xl font-semibold tracking-tighter text-zinc-900 dark:text-zinc-50 privacy-blur">
                                {formatCurrency(displayTotalValue, mainCurrency)}
                            </div>
                            {mainCurrency !== secondaryCurrency && (
                                <div className="text-xl sm:text-2xl font-medium text-zinc-400 dark:text-zinc-500 mt-1 sm:mt-0 privacy-blur">
                                    {formatCurrency(displayTotalValueSec, secondaryCurrency)}
                                </div>
                            )}
                        </div>

                        <div className="mt-4 flex flex-wrap items-center gap-2">
                            <div
                                className={cn(
                                    "flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-medium",
                                    isPositive
                                        ? "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400"
                                        : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                                )}
                            >
                                {isPositive ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                                <span className="flex items-center gap-1 privacy-blur">
                                    {isPositive ? "+" : ""}
                                    {formatCurrency(displayDailyChange, mainCurrency)}
                                    {mainCurrency !== secondaryCurrency && (
                                        <span className="opacity-70 font-normal">({formatCurrency(displayDailyChangeSec, secondaryCurrency)})</span>
                                    )}
                                    <span>({isPositive ? "+" : ""}{dailyChangePercent.toFixed(2)}%)</span>
                                </span>
                            </div>
                            <span className="text-sm text-zinc-500 dark:text-zinc-400">
                                {t("summary.today")}
                            </span>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Secondary Card - Quick Stats / Activity */}
            <motion.div
                className="col-span-1 relative overflow-hidden rounded-3xl border border-white/40 dark:border-white/10 bg-white/40 dark:bg-zinc-900/30 backdrop-blur-2xl p-8 shadow-xl shadow-black/5 flex flex-col justify-between"
                whileHover={{ scale: 0.995 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
                <div className="flex items-center justify-between mb-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400">
                        <Activity size={20} />
                    </div>
                </div>
                <div>
                    <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1 flex items-center justify-between">
                        <span>{t("summary.marketStatus")}</span>
                        <div className="flex items-center gap-2">
                            {onAutoRefreshToggle && (
                                <button
                                    onClick={onAutoRefreshToggle}
                                    className={cn(
                                        "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors border",
                                        autoRefresh
                                            ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
                                            : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                                    )}
                                    title={autoRefresh ? t("summary.autoOn") : t("summary.autoOff")}
                                >
                                    {autoRefresh ? `Auto (${getIntervalDisplay(refreshIntervalMs)})` : "Manual"}
                                </button>
                            )}
                            {onRefresh && (
                                <button
                                    onClick={onRefresh}
                                    className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                                    title={t("summary.refresh")}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cn("lucide lucide-refresh-ccw", autoRefresh ? "animate-spin" : "")} style={autoRefresh ? { animationDuration: '3s' } : {}}><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" /><path d="M16 21v-5h5" /></svg>
                                </button>
                            )}
                        </div>
                    </h3>
                    <p className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 leading-tight">
                        {t("summary.dataUpToDate")}
                        <br />
                        <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mt-2 block">
                            {lastUpdated ? `${t("summary.lastUpdate")}: ${lastUpdated.toLocaleTimeString("cs-CZ", { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` : `${t("summary.lastUpdate")}: ${t("summary.notUpdated")}`}
                        </span>
                    </p>
                </div>
            </motion.div>
        </div>
    );
}

"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { CopyPlus, TrendingUp, TrendingDown, MoreHorizontal, ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/utils/cn";
import { useLanguage } from "@/lib/i18n/LanguageContext";

export interface Asset {
    ticker: string;
    name: string;
    price: number;
    currency: string;
    shares: number;
    targetWeight: number;
    actualWeight: number;
    dailyChange: number;
    dailyChangePercent: number;
}

interface AssetsListProps {
    assets: Asset[];
    onSharesChange: (ticker: string, newShares: number) => void;
    exchangeRates: { EUR: number, USD: number };
    onAddTickerClick: () => void;
    onDeleteTickerClick: (ticker: string) => void;
    onTargetWeightChange: (ticker: string, newWeight: number) => void;
    onMoveAsset: (ticker: string, direction: 'up' | 'down') => void;
    mainCurrency?: "CZK" | "EUR" | "USD";
    secondaryCurrency?: "CZK" | "EUR" | "USD";
}

function AssetSharesInput({ asset, onSharesChange }: { asset: Asset, onSharesChange: (ticker: string, shares: number) => void }) {
    const [localValue, setLocalValue] = useState(asset.shares.toString());

    // Sync input when external shares change
    useEffect(() => {
        const parsedLocal = parseFloat(localValue.replace(",", "."));
        if (asset.shares !== parsedLocal && !isNaN(asset.shares)) {
            setLocalValue(asset.shares.toString());
        }
    }, [asset.shares]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        // Allow empty string or numbers with dot OR comma as decimal separator (mobile numpad)
        if (val === "" || /^[\d]*[.,]?[\d]*$/.test(val)) {
            setLocalValue(val);
            const parsed = parseFloat(val.replace(",", "."));
            onSharesChange(asset.ticker, isNaN(parsed) ? 0 : parsed);
        }
    };

    const handleBlur = () => {
        // Vynucená propagace hodnoty na blur pro případy programového fill
        const parsed = parseFloat(localValue.replace(",", "."));
        onSharesChange(asset.ticker, isNaN(parsed) ? 0 : parsed);
    };

    return (
        <input
            type="text"
            inputMode="decimal"
            value={localValue}
            onChange={handleChange}
            onBlur={handleBlur}
            className="privacy-blur w-full appearance-none rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 px-3 py-1.5 text-sm font-medium text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:border-zinc-400 dark:focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-500 transition-all"
        />
    );
}

export function AssetTableRow({ asset, index, totalAssets, onSharesChange, exchangeRates, onDeleteTickerClick, onTargetWeightChange, onMoveAsset, mainCurrency = "CZK", secondaryCurrency = "EUR" }: { asset: Asset, index: number, totalAssets: number, onSharesChange: (t: string, s: number) => void, exchangeRates: { EUR: number, USD: number }, onDeleteTickerClick: (t: string) => void, onTargetWeightChange: (t: string, w: number) => void, onMoveAsset: (t: string, dir: 'up' | 'down') => void, mainCurrency?: "CZK" | "EUR" | "USD", secondaryCurrency?: "CZK" | "EUR" | "USD" }) {
    const { t } = useLanguage();

    const formatCurrency = (val: number, currency: string) => {
        return new Intl.NumberFormat("cs-CZ", {
            style: "currency",
            currency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(val);
    };

    const formatPercent = (val: number) => {
        return new Intl.NumberFormat("cs-CZ", {
            style: "percent",
            maximumFractionDigits: 1,
        }).format(val);
    };

    const isPositive = asset.dailyChange >= 0;
    const currentExchangeRate = asset.currency === "USD" ? exchangeRates.USD : exchangeRates.EUR;
    const value = asset.price * asset.shares;
    const valueCzk = value * currentExchangeRate;
    const priceCzk = asset.price * currentExchangeRate;
    const displayValue = mainCurrency === "CZK" ? valueCzk : mainCurrency === "EUR" ? valueCzk / exchangeRates.EUR : valueCzk / exchangeRates.USD;
    const displayPrice = mainCurrency === "CZK" ? priceCzk : mainCurrency === "EUR" ? priceCzk / exchangeRates.EUR : priceCzk / exchangeRates.USD;
    const displayValueSec = secondaryCurrency === "CZK" ? valueCzk : secondaryCurrency === "EUR" ? valueCzk / exchangeRates.EUR : valueCzk / exchangeRates.USD;
    const weightDiff = asset.actualWeight - asset.targetWeight;
    const isOffTarget = Math.abs(weightDiff) > 0.05;

    return (
        <motion.div
            key={asset.ticker}
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="group relative z-10 flex flex-col md:flex-row md:items-center justify-between rounded-3xl border border-white/40 dark:border-white/5 bg-white/50 dark:bg-zinc-900/30 backdrop-blur-2xl p-4 md:px-6 shadow-xl shadow-black/5 hover:bg-white/80 dark:hover:bg-zinc-900/50 transition-colors"
        >
            {/* Info section */}
            <div className="flex items-center gap-4 mb-4 md:mb-0 w-full md:w-1/4 min-w-0">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/60 dark:bg-zinc-800/80 shadow-sm font-semibold text-zinc-900 dark:text-zinc-100 border border-white/40 dark:border-zinc-700/50">
                    {asset.ticker.replace(/\.\w+$/, '').slice(0, 3)}
                </div>
                <div className="min-w-0 overflow-hidden">
                    <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 truncate" title={asset.ticker.replace(/\.\w+$/, '')}>
                        {asset.ticker.replace(/\.\w+$/, '')}
                    </h3>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 truncate" title={asset.name}>
                        {asset.name}
                    </p>
                </div>
            </div>

            {/* Price & Change */}
            <div className="flex flex-row justify-between w-full md:w-1/4 px-2 mb-4 md:mb-0">
                <div className="flex flex-col">
                    <span className="md:hidden text-xs text-zinc-400 mb-1">{t("assets.colPrice")}</span>
                    <span className="font-medium tabular-nums text-zinc-900 dark:text-zinc-100 privacy-blur">
                        {formatCurrency(displayPrice, mainCurrency)}
                    </span>
                    <span className="text-xs font-medium tabular-nums text-zinc-400 dark:text-zinc-500 mt-0.5 privacy-blur">
                        {asset.currency !== mainCurrency ? formatCurrency(asset.price, asset.currency) : ""}
                    </span>
                </div>
                <div className="flex flex-col items-end md:items-start">
                    <span className="md:hidden text-xs text-zinc-400 mb-1">{t("summary.today")}</span>
                    <span
                        className={cn(
                            "flex items-center gap-1 text-sm font-medium tabular-nums mt-0.5",
                            isPositive ? "text-teal-600 dark:text-teal-400" : "text-red-600 dark:text-red-400"
                        )}
                    >
                        {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}{" "}
                        {isPositive ? "+" : ""}{asset.dailyChangePercent.toFixed(2)}%
                    </span>
                </div>
            </div>

            {/* Shares Input & Value */}
            <div className="flex items-center justify-between w-full md:w-1/3 px-2 gap-4">
                <div className="flex flex-col w-32">
                    <span className="md:hidden text-xs text-zinc-400 mb-1">{t("assets.table.shares")}</span>
                    <AssetSharesInput asset={asset} onSharesChange={onSharesChange} />
                </div>
                <div className="flex flex-col items-end w-28">
                    <span className="md:hidden text-xs text-zinc-400 mb-1">{t("assets.colValue")}</span>
                    <span className="font-semibold tabular-nums text-zinc-900 dark:text-zinc-100 privacy-blur">
                        {formatCurrency(displayValue, mainCurrency)}
                    </span>
                    {mainCurrency !== secondaryCurrency && (
                        <span className="text-xs font-medium tabular-nums text-zinc-400 dark:text-zinc-500 mt-0.5 privacy-blur">
                            {formatCurrency(displayValueSec, secondaryCurrency)}
                        </span>
                    )}
                </div>
            </div>

            {/* Weight & Actions */}
            <div className="flex flex-row md:flex-col items-center justify-between md:items-end w-full md:w-24 px-2 mt-4 md:mt-0 pt-4 md:pt-0 border-t border-zinc-200/50 dark:border-zinc-800/50 md:border-0 relative z-20">
                <div className="flex flex-col md:items-end">
                    <span className="md:hidden text-xs text-zinc-400">{t("assets.table.alloc")}</span>
                    <span className={cn("font-medium tabular-nums", isOffTarget ? "text-amber-600 dark:text-amber-500" : "text-zinc-900 dark:text-zinc-100")}>
                        {formatPercent(asset.actualWeight)}
                    </span>
                </div>
                <div className="flex items-center md:mt-1 gap-1">
                    <button
                        onClick={() => {
                            const v = window.prompt(`Zadejte novou cílovou váhu pro ${asset.ticker} (např. 15 pro 15%):`, (asset.targetWeight * 100).toString());
                            if (v) {
                                const parsed = v.replace(',', '.'); // Handle czech comma
                                const numeric = parseFloat(parsed);
                                if (!isNaN(numeric) && numeric >= 0) {
                                    onTargetWeightChange(asset.ticker, numeric / 100);
                                }
                            }
                        }}
                        className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors border-b border-dashed border-zinc-300 dark:border-zinc-700 tabular-nums cursor-pointer relative z-30 mr-2"
                        title="Změnit cílovou váhu"
                    >
                        {t("assets.target")} {formatPercent(asset.targetWeight)}
                    </button>
                    <div className="flex flex-col gap-0 border-r border-zinc-200 dark:border-zinc-700 pr-1 mr-1">
                        <button
                            onClick={() => onMoveAsset(asset.ticker, 'up')}
                            disabled={index === 0}
                            className="p-0.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 disabled:opacity-30 disabled:hover:text-zinc-400 transition-colors"
                        >
                            <ChevronUp size={14} />
                        </button>
                        <button
                            onClick={() => onMoveAsset(asset.ticker, 'down')}
                            disabled={index === totalAssets - 1}
                            className="p-0.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 disabled:opacity-30 disabled:hover:text-zinc-400 transition-colors"
                        >
                            <ChevronDown size={14} />
                        </button>
                    </div>
                    <button
                        onClick={() => onDeleteTickerClick(asset.ticker)}
                        className="text-zinc-400 hover:text-red-500 transition-colors relative z-30 p-1 ml-0.5"
                        title="Smazat aktivum"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>
                    </button>
                </div>
            </div>
        </motion.div >
    );
}

export function AssetsList({ assets, onSharesChange, exchangeRates, onAddTickerClick, onDeleteTickerClick, onTargetWeightChange, onMoveAsset, mainCurrency = "CZK", secondaryCurrency = "EUR" }: AssetsListProps) {
    const { t } = useLanguage();

    return (
        <div className="w-full mt-8">
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
                    {t("assets.held")}
                </h2>
                <div className="flex items-center gap-4">
                    <button
                        onClick={onAddTickerClick}
                        className="flex items-center gap-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 transition-colors"
                    >
                        <CopyPlus size={16} />
                        <span>{t("assets.addTicker")}</span>
                    </button>
                    {mainCurrency !== secondaryCurrency && (
                        <div className="text-sm text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-3 py-1.5 rounded-full font-medium">
                            {(() => {
                                const mRate = mainCurrency === "EUR" ? exchangeRates.EUR : mainCurrency === "USD" ? exchangeRates.USD : 1;
                                const sRate = secondaryCurrency === "EUR" ? exchangeRates.EUR : secondaryCurrency === "USD" ? exchangeRates.USD : 1;

                                if (mainCurrency === "CZK" && secondaryCurrency !== "CZK") {
                                    return `1 ${secondaryCurrency} = ${sRate.toFixed(3).replace('.', ',')} CZK`;
                                }
                                if (secondaryCurrency === "CZK" && mainCurrency !== "CZK") {
                                    return `1 ${mainCurrency} = ${mRate.toFixed(3).replace('.', ',')} CZK`;
                                }

                                // For EUR / USD comparison (e.g. main: USD, sec: EUR -> 1 USD = (USD/CZK) / (EUR/CZK) EUR)
                                return `1 ${mainCurrency} = ${(mRate / sRate).toFixed(3).replace('.', ',')} ${secondaryCurrency}`;
                            })()}
                        </div>
                    )}
                </div>
            </div>

            <div className="hidden md:flex items-center justify-between px-6 py-2 mb-2 text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400/80">
                <div className="w-1/4">{t("assets.colAsset")}</div>
                <div className="w-1/4 px-2">{t("assets.colPrice")}</div>
                <div className="w-1/3 px-2 flex items-center justify-between">
                    <span className="w-32">{t("assets.colShares")}</span>
                    <span className="w-28 text-right">{t("assets.colValue")}</span>
                </div>
                <div className="w-24 px-2 text-right">{t("assets.colAllocation")}</div>
            </div>

            <div className="flex flex-col gap-3">
                {assets.map((asset, idx) => (
                    <AssetTableRow
                        key={asset.ticker}
                        asset={asset}
                        index={idx}
                        totalAssets={assets.length}
                        onSharesChange={onSharesChange}
                        exchangeRates={exchangeRates}
                        onDeleteTickerClick={onDeleteTickerClick}
                        onTargetWeightChange={onTargetWeightChange}
                        onMoveAsset={onMoveAsset}
                        mainCurrency={mainCurrency}
                    />
                ))}
                {assets.length === 0 && (
                    <div className="py-12 text-center text-zinc-500 dark:text-zinc-400 text-sm">
                        {t("assets.empty")}
                    </div>
                )}
            </div>
        </div>
    );
}

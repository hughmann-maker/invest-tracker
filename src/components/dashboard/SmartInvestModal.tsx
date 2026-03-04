"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, X, ArrowRight } from "lucide-react";
import { cn } from "@/utils/cn";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import type { Asset } from "./AssetsList";

interface SmartInvestModalProps {
    isOpen: boolean;
    onClose: () => void;
    assets: Asset[];
    exchangeRate: number;
}

export function SmartInvestModal({ isOpen, onClose, assets, exchangeRate }: SmartInvestModalProps) {
    const { t } = useLanguage();
    const [depositAmount, setDepositAmount] = useState("");
    const [currency, setCurrency] = useState<"CZK" | "EUR">("CZK");

    const recommendations = useMemo(() => {
        const amountStr = depositAmount.replace(",", ".");
        const amount = parseFloat(amountStr);
        if (isNaN(amount) || amount <= 0 || assets.length === 0) return [];

        // Convert deposit to EUR for calculation
        const amountEur = currency === "CZK" ? amount / exchangeRate : amount;

        // Calculate current total portfolio value
        const totalValue = assets.reduce((acc, a) => acc + a.price * a.shares, 0);
        const newTotalValue = totalValue + amountEur;

        // For each asset, calculate how much to buy to reach target weight
        return assets
            .map(asset => {
                const currentValue = asset.price * asset.shares;
                const targetValue = asset.targetWeight * newTotalValue;
                const deficit = targetValue - currentValue;

                if (deficit <= 0 || asset.price <= 0) return null;

                // Cap at deposit amount proportionally
                const investEur = Math.min(deficit, amountEur * (deficit / assets.reduce((s, a) => {
                    const tv = a.targetWeight * newTotalValue;
                    const cv = a.price * a.shares;
                    return s + Math.max(0, tv - cv);
                }, 0) || 1));

                const shares = asset.price > 0 ? investEur / asset.price : 0;

                return {
                    ticker: asset.ticker,
                    name: asset.name,
                    investEur,
                    investCzk: investEur * exchangeRate,
                    shares: Math.floor(shares * 10000) / 10000, // 4 decimal places
                    targetWeight: asset.targetWeight,
                };
            })
            .filter(Boolean)
            .filter((r): r is NonNullable<typeof r> => r !== null && r.investEur > 1) // Min 1 EUR
            .sort((a, b) => b.investEur - a.investEur);
    }, [depositAmount, currency, assets, exchangeRate]);

    const formatCurrency = (val: number, cur: string) => {
        return new Intl.NumberFormat("cs-CZ", {
            style: "currency",
            currency: cur,
            maximumFractionDigits: cur === "CZK" ? 0 : 2,
        }).format(val);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
                    />

                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="pointer-events-auto w-full max-w-lg overflow-hidden rounded-3xl border border-white/20 dark:border-white/10 bg-white/80 dark:bg-zinc-900/80 p-6 shadow-2xl backdrop-blur-2xl"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-100 text-violet-600 dark:bg-violet-900/50 dark:text-violet-400">
                                        <Brain size={20} />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
                                            {t("smart.title")}
                                        </h2>
                                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                            {t("smart.subtitle")}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="rounded-full p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="flex gap-3 mb-6">
                                <div className="flex-1 relative">
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        value={depositAmount}
                                        onChange={(e) => setDepositAmount(e.target.value)}
                                        placeholder={t("smart.amountPlaceholder")}
                                        className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-4 py-2.5 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 transition-all font-medium"
                                        autoFocus
                                    />
                                </div>
                                <div className="flex rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
                                    <button
                                        onClick={() => setCurrency("CZK")}
                                        className={cn(
                                            "px-4 py-2.5 text-sm font-semibold transition-colors",
                                            currency === "CZK"
                                                ? "bg-violet-600 text-white"
                                                : "bg-white dark:bg-zinc-950 text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                                        )}
                                    >
                                        CZK
                                    </button>
                                    <button
                                        onClick={() => setCurrency("EUR")}
                                        className={cn(
                                            "px-4 py-2.5 text-sm font-semibold transition-colors",
                                            currency === "EUR"
                                                ? "bg-violet-600 text-white"
                                                : "bg-white dark:bg-zinc-950 text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                                        )}
                                    >
                                        EUR
                                    </button>
                                </div>
                            </div>

                            {recommendations.length > 0 && (
                                <div className="flex flex-col gap-3">
                                    <div className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                                        {t("smart.recommended")}
                                    </div>
                                    {recommendations.map((rec) => (
                                        <motion.div
                                            key={rec.ticker}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            className="flex items-center justify-between rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 p-4"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/60 dark:bg-zinc-800/80 shadow-sm font-semibold text-zinc-900 dark:text-zinc-100 border border-white/40 dark:border-zinc-700/50 text-sm">
                                                    {rec.ticker.slice(0, 2)}
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">
                                                        {rec.ticker}
                                                    </div>
                                                    <div className="text-xs text-zinc-500 dark:text-zinc-400">
                                                        {t("smart.target")} {(rec.targetWeight * 100).toFixed(0)}% • <span className="privacy-blur">{rec.shares.toFixed(4)}</span> {t("tx.pieces")}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end">
                                                <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums privacy-blur">
                                                    {formatCurrency(rec.investCzk, "CZK")}
                                                </span>
                                                <span className="text-xs text-zinc-400 tabular-nums privacy-blur">
                                                    {formatCurrency(rec.investEur, "EUR")}
                                                </span>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            )}

                            {depositAmount && recommendations.length === 0 && (
                                <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center py-4">
                                    {t("smart.balanced")}
                                </p>
                            )}
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
}

"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CopyPlus, X, Loader2, Search } from "lucide-react";
import { cn } from "@/utils/cn";
import { useLanguage } from "@/lib/i18n/LanguageContext";

interface AddTickerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (ticker: string, targetWeight: number) => void;
}

export function AddTickerModal({ isOpen, onClose, onAdd }: AddTickerModalProps) {
    const { t, language } = useLanguage();
    const [ticker, setTicker] = useState("");
    const [targetWeight, setTargetWeight] = useState("10");
    const [isValidating, setIsValidating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const cleanTicker = ticker.trim().toUpperCase();
        if (!cleanTicker) {
            setError(t("assets.errorEmpty"));
            return;
        }

        const numericWeight = parseFloat(targetWeight.replace(',', '.'));
        if (isNaN(numericWeight) || numericWeight < 0) {
            setError(t("assets.errorWeight"));
            return;
        }

        setError(null);
        setIsValidating(true);

        try {
            // Validace přes náš existující proxy endpoint
            const res = await fetch("/api/prices", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ tickers: [cleanTicker] })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(t("assets.errorServer"));
            }

            if (!data.prices || data.prices.length === 0 || data.prices[0] === null) {
                setError(language === "cs" ? `Ticker "${cleanTicker}" nebyl nalezen na Yahoo Finance.` : `Ticker "${cleanTicker}" was not found on Yahoo Finance.`);
                setIsValidating(false);
                return;
            }

            const tickerResult = data.prices[0];
            if (!tickerResult.price || tickerResult.price <= 0) {
                setError(language === "cs" ? `Ticker "${cleanTicker}" nemá dostupnou cenu (0 Kč). Ověřte, že zadáváte správný symbol (např. s příponou .DE pro Xetra).` : `Ticker "${cleanTicker}" has no available price. Please verify the symbol.`);
                setIsValidating(false);
                return;
            }

            // Úspěšná validace — ticker je validní a má cenu > 0
            setIsValidating(false);
            onAdd(cleanTicker, numericWeight / 100);

            // Reset state pre-close
            setTicker("");
            setTargetWeight("10");
            setError(null);
            onClose();

        } catch (err: any) {
            setError(err.message || t("assets.errorValidation"));
            setIsValidating(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
                    />

                    {/* Modal */}
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="pointer-events-auto w-full max-w-md overflow-hidden rounded-3xl border border-white/20 dark:border-white/10 bg-white/80 dark:bg-zinc-900/80 p-6 shadow-2xl backdrop-blur-2xl"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400">
                                        <CopyPlus size={20} />
                                    </div>
                                    <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
                                        {t("assets.addTicker")}
                                    </h2>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="rounded-full p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                                <div className="flex flex-col gap-1.5">
                                    <label htmlFor="ticker" className="text-sm font-medium text-zinc-700 dark:text-zinc-300 ml-1">
                                        {t("assets.tickerSymbol")} (Yahoo Finance)
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-zinc-400">
                                            <Search size={16} />
                                        </div>
                                        <input
                                            id="ticker"
                                            type="text"
                                            value={ticker}
                                            onChange={(e) => setTicker(e.target.value.toUpperCase())}
                                            placeholder={t("assets.tickerPlaceholder")}
                                            className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 pl-10 pr-4 py-2.5 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all font-medium uppercase"
                                            autoFocus
                                            autoComplete="off"
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <label htmlFor="weight" className="text-sm font-medium text-zinc-700 dark:text-zinc-300 ml-1">
                                        {t("assets.targetWeight")}
                                    </label>
                                    <div className="relative">
                                        <input
                                            id="weight"
                                            type="text"
                                            inputMode="decimal"
                                            value={targetWeight}
                                            onChange={(e) => setTargetWeight(e.target.value)}
                                            placeholder="10"
                                            className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-4 py-2.5 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all font-medium"
                                        />
                                        <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-zinc-500 font-medium">
                                            %
                                        </div>
                                    </div>
                                </div>

                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        className="text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-900/50"
                                    >
                                        {error}
                                    </motion.div>
                                )}

                                <div className="mt-2 flex gap-3">
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        disabled={isValidating}
                                        className="flex-1 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 py-2.5 text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors disabled:opacity-50"
                                    >
                                        {t("generic.cancel")}
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isValidating || !ticker}
                                        className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
                                    >
                                        {isValidating ? (
                                            <>
                                                <Loader2 size={16} className="animate-spin" />
                                                {t("assets.validating")}
                                            </>
                                        ) : (
                                            t("assets.addTicker")
                                        )}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
}

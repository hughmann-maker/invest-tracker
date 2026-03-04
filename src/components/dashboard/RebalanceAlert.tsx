"use client";

import { motion } from "framer-motion";
import { AlertCircle, RefreshCcw } from "lucide-react";
import { cn } from "@/utils/cn";
import { useLanguage } from "@/lib/i18n/LanguageContext";

interface RebalanceAction {
    ticker: string;
    action: "KOUPIT" | "PRODAT";
    amountCzk: number;
}

interface RebalanceAlertProps {
    isVisible: boolean;
    actions?: RebalanceAction[];
    exchangeRate: number; // For backward compatibility if needed
    mainCurrency?: "CZK" | "EUR" | "USD";
    secondaryCurrency?: "CZK" | "EUR" | "USD";
    exchangeRatesObj?: { EUR: number, USD: number };
}

export function RebalanceAlert({ isVisible, actions = [], exchangeRate, tolerancePercent = 5, mainCurrency = "CZK", secondaryCurrency = "EUR", exchangeRatesObj }: RebalanceAlertProps & { tolerancePercent?: number }) {
    const { t } = useLanguage();

    if (!isVisible || actions.length === 0) return null;

    return (
        <motion.div
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: "auto", marginBottom: 32 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            transition={{ duration: 0.4 }}
            className="overflow-hidden mb-6 relative z-0"
        >
            <div className="rounded-3xl border border-amber-200/50 dark:border-amber-900/40 bg-amber-50/60 dark:bg-amber-950/20 backdrop-blur-2xl p-6 md:p-8 shadow-xl shadow-amber-900/5">
                <div className="flex items-start gap-4">
                    <div className="flex mt-1 h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-500">
                        <RefreshCcw size={20} />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-base font-semibold text-amber-900 dark:text-amber-500 mb-1">
                            {t("rebalance.title")}
                        </h3>
                        <p className="text-sm text-amber-800 dark:text-amber-400/80 mb-4">
                            {t("rebalance.desc")} {tolerancePercent}%. {t("rebalance.descAppend")}
                        </p>

                        <div className="flex flex-col gap-2">
                            {actions.map((act, i) => {
                                return (
                                    <div
                                        key={i}
                                        className="flex flex-col sm:flex-row sm:items-center justify-between rounded-xl bg-white/60 dark:bg-black/20 px-4 py-3 gap-2 border border-white/40 dark:border-white/5"
                                    >
                                        <div className="flex items-center gap-3">
                                            <span
                                                className={cn(
                                                    "font-bold uppercase tracking-wider text-xs px-2 py-0.5 rounded",
                                                    act.action === "KOUPIT"
                                                        ? "bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-400"
                                                        : "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400"
                                                )}
                                            >
                                                {act.action === "KOUPIT" ? t("rebalance.buy") : t("rebalance.sell")}
                                            </span>
                                            <span className="font-medium text-amber-900 dark:text-amber-300">
                                                {act.ticker}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 sm:justify-end">
                                            <span className="font-semibold text-amber-900 dark:text-amber-100 privacy-blur">
                                                {new Intl.NumberFormat("cs-CZ", {
                                                    style: "currency",
                                                    currency: mainCurrency,
                                                    maximumFractionDigits: 0
                                                }).format(
                                                    mainCurrency === "CZK" ? act.amountCzk :
                                                        mainCurrency === "EUR" ? act.amountCzk / (exchangeRatesObj?.EUR || exchangeRate) :
                                                            act.amountCzk / (exchangeRatesObj?.USD || 23)
                                                )}
                                            </span>
                                            {mainCurrency !== secondaryCurrency && (
                                                <span className="text-sm font-medium text-amber-700/60 dark:text-amber-400/50 privacy-blur">
                                                    ({new Intl.NumberFormat("cs-CZ", {
                                                        style: "currency",
                                                        currency: secondaryCurrency,
                                                        maximumFractionDigits: 0
                                                    }).format(
                                                        secondaryCurrency === "CZK" ? act.amountCzk :
                                                            secondaryCurrency === "EUR" ? act.amountCzk / (exchangeRatesObj?.EUR || exchangeRate) :
                                                                act.amountCzk / (exchangeRatesObj?.USD || 23)
                                                    )})
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

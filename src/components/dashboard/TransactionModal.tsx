"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Receipt, X, Plus, Trash2, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { cn } from "@/utils/cn";
import { useLanguage } from "@/lib/i18n/LanguageContext";

export interface Transaction {
    id: string;
    date: string;
    ticker: string;
    type: "BUY" | "SELL";
    shares: number;
    pricePerShare: number;
    currency: "CZK" | "EUR" | "USD";
    note: string;
}

interface TransactionModalProps {
    isOpen: boolean;
    onClose: () => void;
    transactions: Transaction[];
    onAddTransaction: (tx: Omit<Transaction, "id">) => void;
    onDeleteTransaction: (id: string) => void;
    availableTickers: string[];
}

export function TransactionModal({ isOpen, onClose, transactions, onAddTransaction, onDeleteTransaction, availableTickers }: TransactionModalProps) {
    const { t } = useLanguage();
    const [ticker, setTicker] = useState("");
    const [type, setType] = useState<"BUY" | "SELL">("BUY");
    const [shares, setShares] = useState("");
    const [price, setPrice] = useState("");
    const [priceType, setPriceType] = useState<"PER_SHARE" | "TOTAL">("TOTAL");
    const [currency, setCurrency] = useState<"EUR" | "USD">("EUR");
    const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
    const [note, setNote] = useState("");

    const handleSubmit = (e?: React.FormEvent | React.MouseEvent) => {
        if (e) e.preventDefault();
        const numShares = parseFloat(shares.replace(",", "."));
        const numPrice = parseFloat(price.replace(",", "."));
        if (!ticker || isNaN(numShares) || numShares <= 0 || isNaN(numPrice) || numPrice <= 0) return;

        const finalPricePerShare = priceType === "TOTAL" ? numPrice / numShares : numPrice;

        const [y, m, d] = date.split("-");
        const formattedDate = `${parseInt(d, 10)}. ${parseInt(m, 10)}. ${y}`;

        onAddTransaction({
            ticker: ticker.toUpperCase(),
            type,
            shares: numShares,
            pricePerShare: finalPricePerShare,
            currency,
            date: formattedDate,
            note: note.trim() || (type === "BUY" ? t("tx.buy") : t("tx.sell")),
        });
        setShares("");
        setPrice("");
        setNote("");
    };

    const formatCurrency = (val: number, cur: string = "EUR") => {
        return new Intl.NumberFormat("cs-CZ", {
            style: "currency",
            currency: cur,
            maximumFractionDigits: 2,
        }).format(val);
    };

    // Group by ticker for cost basis summary
    const costBasis = availableTickers.map(t => {
        const buys = transactions.filter(tx => tx.ticker === t && tx.type === "BUY");
        const sells = transactions.filter(tx => tx.ticker === t && tx.type === "SELL");
        const totalBought = buys.reduce((s, tx) => s + tx.shares, 0);
        const totalSold = sells.reduce((s, tx) => s + tx.shares, 0);
        const totalCostEur = buys.reduce((s, tx) => s + tx.shares * tx.pricePerShare, 0);
        const avgCost = totalBought > 0 ? totalCostEur / totalBought : 0;
        return { ticker: t, totalBought, totalSold, held: totalBought - totalSold, avgCost, totalCostEur };
    }).filter(c => c.totalBought > 0);

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
                            className="pointer-events-auto flex flex-col w-full max-w-lg max-h-[85vh] overflow-hidden rounded-3xl border border-white/20 dark:border-white/10 bg-white/90 dark:bg-zinc-900/90 shadow-2xl backdrop-blur-2xl"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between p-6 border-b border-zinc-200/50 dark:border-zinc-800/50">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-100 text-orange-600 dark:bg-orange-900/50 dark:text-orange-400">
                                        <Receipt size={20} />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
                                            {t("tx.title")}
                                        </h2>
                                        <p className="text-xs text-zinc-500 font-medium">
                                            {transactions.length} {t("tx.records")}
                                        </p>
                                    </div>
                                </div>
                                <button onClick={onClose} className="rounded-full p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Cost Basis Summary */}
                            {costBasis.length > 0 && (
                                <div className="p-4 border-b border-zinc-200/50 dark:border-zinc-800/50 bg-zinc-50/50 dark:bg-zinc-950/20">
                                    <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2">{t("tx.avgCostLabel")}</div>
                                    <div className="flex flex-wrap gap-2">
                                        {costBasis.map(c => (
                                            <div key={c.ticker} className="text-xs px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                                                <span className="font-bold text-zinc-900 dark:text-zinc-100">{c.ticker}</span>
                                                <span className="text-zinc-500 ml-1 privacy-blur">{formatCurrency(c.avgCost)}{t("tx.perShare")}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Transaction List */}
                            <div className="flex-1 overflow-y-auto p-4">
                                {transactions.length === 0 ? (
                                    <div className="text-center py-10">
                                        <p className="text-zinc-500 dark:text-zinc-400 text-sm">{t("tx.empty")}</p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-2">
                                        {[...transactions].sort((a, b) => {
                                            const [d1, m1, y1] = a.date.split(". ").map(Number);
                                            const [d2, m2, y2] = b.date.split(". ").map(Number);
                                            // Handle cases where parsing fails (though it shouldn't for valid entries)
                                            if (isNaN(y1) || isNaN(y2)) return 0;
                                            return new Date(y2, m2 - 1, d2).getTime() - new Date(y1, m1 - 1, d1).getTime();
                                        }).map(tx => (
                                            <div key={tx.id} className="group flex items-center justify-between p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                                                <div className="flex items-center gap-3">
                                                    <div className={cn(
                                                        "flex h-8 w-8 items-center justify-center rounded-xl",
                                                        tx.type === "BUY" ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400" : "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400"
                                                    )}>
                                                        {tx.type === "BUY" ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                                            {tx.type === "BUY" ? t("tx.buy") : t("tx.sell")} {tx.ticker}
                                                        </div>
                                                        <div className="text-xs text-zinc-400">
                                                            {tx.date} · <span className="privacy-blur">{tx.shares}</span> {t("tx.pieces")} × <span className="privacy-blur">{formatCurrency(tx.pricePerShare, tx.currency)}</span> = <span className="privacy-blur">{formatCurrency(tx.shares * tx.pricePerShare, tx.currency)}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <button onClick={() => onDeleteTransaction(tx.id)} className="p-1.5 text-zinc-400 hover:text-red-500 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Add Transaction Form */}
                            <div className="p-4 border-t border-zinc-200/50 dark:border-zinc-800/50 bg-white/50 dark:bg-zinc-900/50">
                                <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                                    <div className="flex gap-2">
                                        <select
                                            value={ticker}
                                            onChange={(e) => setTicker(e.target.value)}
                                            className="flex-[2] rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2.5 text-sm font-medium text-zinc-900 dark:text-zinc-100 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                                        >
                                            <option value="">{t("tx.tickerPlaceholder")}</option>
                                            {availableTickers.map(t => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                        <select
                                            value={currency}
                                            onChange={(e) => setCurrency(e.target.value as "EUR" | "USD")}
                                            className="flex-1 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2.5 text-sm font-medium text-zinc-900 dark:text-zinc-100 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                                        >
                                            <option value="EUR">EUR</option>
                                            <option value="USD">USD</option>
                                        </select>
                                        <div className="flex rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden bg-zinc-100 dark:bg-zinc-800 p-0.5">
                                            <button type="button" onClick={() => setType("BUY")} className={cn("px-4 py-2 text-xs font-bold transition-all rounded-lg", type === "BUY" ? "bg-white dark:bg-zinc-700 text-emerald-600 shadow-sm" : "text-zinc-500 hover:text-zinc-700")}>
                                                {t("tx.buyBtn")}
                                            </button>
                                            <button type="button" onClick={() => setType("SELL")} className={cn("px-4 py-2 text-xs font-bold transition-all rounded-lg", type === "SELL" ? "bg-white dark:bg-zinc-700 text-red-600 shadow-sm" : "text-zinc-500 hover:text-zinc-700")}>
                                                {t("tx.sellBtn")}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 mb-1">
                                        <div className="flex rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden bg-zinc-100 dark:bg-zinc-800 p-0.5 col-span-2 sm:col-span-1">
                                            <button type="button" onClick={() => setPriceType("TOTAL")} className={cn("flex-1 px-2 py-1.5 text-[11px] font-semibold transition-all rounded-md", priceType === "TOTAL" ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm" : "text-zinc-500")}>
                                                {t("tx.totalAmount")}
                                            </button>
                                            <button type="button" onClick={() => setPriceType("PER_SHARE")} className={cn("flex-1 px-2 py-1.5 text-[11px] font-semibold transition-all rounded-md", priceType === "PER_SHARE" ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm" : "text-zinc-500")}>
                                                {t("tx.pricePerShare")}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="flex flex-col sm:flex-row gap-2">
                                        <input type="text" inputMode="decimal" value={shares} onChange={(e) => setShares(e.target.value)} placeholder={t("tx.sharesPlaceholder")} className="flex-1 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2.5 text-sm font-medium text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 tabular-nums min-w-0" />
                                        <input type="text" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder={priceType === "TOTAL" ? `${t("tx.totalPlaceholder")} (${currency})` : `${t("tx.pricePlaceholder")} (${currency})`} className="flex-1 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2.5 text-sm font-medium text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 tabular-nums min-w-0" />
                                        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="flex-1 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2.5 text-sm font-medium text-zinc-900 dark:text-zinc-100 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 min-w-0" />
                                    </div>
                                    <div className="flex gap-2">
                                        <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("tx.noteOptional")} className="flex-1 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2.5 text-sm font-medium text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 min-w-0" />
                                        <button type="button" onClick={handleSubmit} disabled={!ticker || !shares || !price || !date} className="flex items-center justify-center rounded-xl bg-orange-600 px-6 sm:px-4 py-2.5 text-white hover:bg-orange-700 transition-colors disabled:opacity-50 shrink-0">
                                            <Plus size={18} />
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
}

"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Ghost, X, Plus, Trash2, Loader2, Check } from "lucide-react";
import { cn } from "@/utils/cn";
import { useLanguage } from "@/lib/i18n/LanguageContext";

const generateId = (): string => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 10);
};

export interface GhostAllocation {
    ticker: string;
    weight: number; // 0-1
}

export interface GhostPortfolio {
    id: string;
    name: string;
    allocations: GhostAllocation[];
}

interface GhostPortfolioModalProps {
    isOpen: boolean;
    onClose: () => void;
    ghostPortfolio: GhostPortfolio | null;
    onSave: (portfolio: GhostPortfolio) => void;
    onClear: () => void;
}

export function GhostPortfolioModal({ isOpen, onClose, ghostPortfolio, onSave, onClear }: GhostPortfolioModalProps) {
    const { t } = useLanguage();
    const [name, setName] = useState(ghostPortfolio?.name || "");
    const [rows, setRows] = useState<{ ticker: string; weightPercent: string }[]>(
        ghostPortfolio?.allocations.map(a => ({
            ticker: a.ticker,
            weightPercent: (a.weight * 100).toFixed(0),
        })) || [{ ticker: "", weightPercent: "100" }]
    );
    const [isValidating, setIsValidating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const totalWeight = rows.reduce((s, r) => s + (parseFloat(r.weightPercent.replace(",", ".")) || 0), 0);

    const addRow = () => {
        setRows(prev => [...prev, { ticker: "", weightPercent: "" }]);
    };

    const removeRow = (idx: number) => {
        setRows(prev => prev.filter((_, i) => i !== idx));
    };

    const updateRow = (idx: number, field: "ticker" | "weightPercent", value: string) => {
        setRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: field === "ticker" ? value.toUpperCase() : value } : r));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        const cleanName = name.trim() || "Ghost Portfolio";
        const allocations = rows
            .map(r => ({
                ticker: r.ticker.trim().toUpperCase(),
                weight: parseFloat(r.weightPercent.replace(",", ".")) / 100,
            }))
            .filter(a => a.ticker && a.weight > 0);

        if (allocations.length === 0) {
            setError(t("ghost.errorEmpty"));
            return;
        }

        const sum = allocations.reduce((s, a) => s + a.weight, 0);
        if (Math.abs(sum - 1) > 0.02) {
            setError(`${t("ghost.errorSum")} ${(sum * 100).toFixed(0)}%).`);
            return;
        }

        // Validate all tickers
        setIsValidating(true);
        try {
            const res = await fetch("/api/prices", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ tickers: allocations.map(a => a.ticker) }),
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(t("assets.errorServer"));
            }

            const invalidTickers: string[] = [];
            allocations.forEach((alloc, i) => {
                if (!data.prices || !data.prices[i] || data.prices[i].price <= 0) {
                    invalidTickers.push(alloc.ticker);
                }
            });

            if (invalidTickers.length > 0) {
                setError(`${t("ghost.errorInvalid")} ${invalidTickers.join(", ")}. ${t("ghost.verify")}`);
                setIsValidating(false);
                return;
            }

            // Save
            const portfolio: GhostPortfolio = {
                id: ghostPortfolio?.id || generateId(),
                name: cleanName,
                allocations,
            };
            onSave(portfolio);
            onClose();
        } catch (err: any) {
            setError(err.message || t("assets.errorValidation"));
        } finally {
            setIsValidating(false);
        }
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
                            className="pointer-events-auto flex flex-col w-full max-w-lg max-h-[85vh] overflow-hidden rounded-3xl border border-white/20 dark:border-white/10 bg-white/90 dark:bg-zinc-900/90 shadow-2xl backdrop-blur-2xl"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between p-6 border-b border-zinc-200/50 dark:border-zinc-800/50">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400">
                                        <Ghost size={20} />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
                                            {t("ghost.title")}
                                        </h2>
                                        <p className="text-xs text-zinc-500 font-medium">
                                            {t("ghost.subtitle")}
                                        </p>
                                    </div>
                                </div>
                                <button onClick={onClose} className="rounded-full p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Content */}
                            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                                <div className="flex-1 overflow-y-auto p-6">
                                    <div className="mb-4">
                                        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 ml-1 mb-1 block">
                                            {t("ghost.name")}
                                        </label>
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder={t("ghost.namePlaceholder")}
                                            className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-4 py-2.5 text-sm font-medium text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all"
                                        />
                                    </div>

                                    <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300 ml-1 mb-2">
                                        {t("ghost.allocation")}
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        {rows.map((row, idx) => (
                                            <div key={idx} className="flex gap-2 items-center">
                                                <input
                                                    type="text"
                                                    value={row.ticker}
                                                    onChange={(e) => updateRow(idx, "ticker", e.target.value)}
                                                    placeholder={t("ghost.tickerPlaceholder")}
                                                    className="flex-1 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2.5 text-sm font-medium text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all uppercase"
                                                />
                                                <div className="relative w-24">
                                                    <input
                                                        type="text"
                                                        inputMode="decimal"
                                                        value={row.weightPercent}
                                                        onChange={(e) => updateRow(idx, "weightPercent", e.target.value)}
                                                        placeholder="50"
                                                        className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2.5 pr-8 text-sm font-medium text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all tabular-nums text-right"
                                                    />
                                                    <span className="absolute inset-y-0 right-3 flex items-center text-zinc-400 text-sm font-medium pointer-events-none">%</span>
                                                </div>
                                                {rows.length > 1 && (
                                                    <button type="button" onClick={() => removeRow(idx)} className="p-2 text-zinc-400 hover:text-red-500 rounded-lg transition-colors">
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    <button type="button" onClick={addRow} className="mt-3 flex items-center gap-2 text-sm font-semibold text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 transition-colors">
                                        <Plus size={16} />
                                        {t("assets.addTicker")}
                                    </button>

                                    <div className={cn(
                                        "mt-3 text-xs font-bold tabular-nums px-3 py-2 rounded-xl",
                                        Math.abs(totalWeight - 100) <= 2
                                            ? "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-900/20"
                                            : "text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/20"
                                    )}>
                                        {t("ghost.totalWeight")} {totalWeight.toFixed(0)}% {Math.abs(totalWeight - 100) <= 2 && <Check size={14} className="inline ml-1" />}
                                    </div>

                                    {error && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            className="mt-3 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-900/50"
                                        >
                                            {error}
                                        </motion.div>
                                    )}
                                </div>

                                {/* Footer */}
                                <div className="p-6 border-t border-zinc-200/50 dark:border-zinc-800/50 bg-white/50 dark:bg-zinc-900/50 flex gap-3">
                                    {ghostPortfolio && (
                                        <button
                                            type="button"
                                            onClick={() => { onClear(); onClose(); }}
                                            className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 py-2.5 px-4 text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                                        >
                                            {t("generic.delete")}
                                        </button>
                                    )}
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
                                        disabled={isValidating}
                                        className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-amber-600 py-2.5 text-sm font-semibold text-white hover:bg-amber-700 transition-colors disabled:opacity-50"
                                    >
                                        {isValidating ? (
                                            <>
                                                <Loader2 size={16} className="animate-spin" />
                                                {t("assets.validating")}
                                            </>
                                        ) : (
                                            t("ghost.saveBtn")
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

"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wallet, X, Plus, Trash2 } from "lucide-react";
import { cn } from "@/utils/cn";
import { useLanguage } from "@/lib/i18n/LanguageContext";

export interface Deposit {
    id: string;
    date: string;
    amountCzk: number;
    note: string;
}

interface DepositsModalProps {
    isOpen: boolean;
    onClose: () => void;
    deposits: Deposit[];
    onAddDeposit: (amountCzk: number, note: string, date: string) => void;
    onDeleteDeposit: (id: string) => void;
}

export function DepositsModal({ isOpen, onClose, deposits, onAddDeposit, onDeleteDeposit }: DepositsModalProps) {
    const { t } = useLanguage();
    const [amount, setAmount] = useState("");
    const [note, setNote] = useState("");
    const [date, setDate] = useState(() => new Date().toLocaleDateString("cs-CZ"));

    const totalDeposited = deposits.reduce((acc, d) => acc + d.amountCzk, 0);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const num = parseFloat(amount.replace(',', '.'));
        if (!isNaN(num) && num > 0) {
            onAddDeposit(num, note.trim() || t("deposits.defaultNote"), date.trim() || new Date().toLocaleDateString("cs-CZ"));
            setAmount("");
            setNote("");
        }
    };

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat("cs-CZ", {
            style: "currency",
            currency: "CZK",
            maximumFractionDigits: 0
        }).format(val);
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
                            className="pointer-events-auto flex flex-col w-full max-w-lg max-h-[85vh] overflow-hidden rounded-3xl border border-white/20 dark:border-white/10 bg-white/90 dark:bg-zinc-900/90 shadow-2xl backdrop-blur-2xl"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between p-6 border-b border-zinc-200/50 dark:border-zinc-800/50">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400">
                                        <Wallet size={20} />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight leading-tight">
                                            {t("deposits.title")}
                                        </h2>
                                        <p className="text-xs text-zinc-500 font-medium">
                                            {t("deposits.total")} <span className="text-zinc-900 dark:text-zinc-100 font-bold tabular-nums privacy-blur">{formatCurrency(totalDeposited)}</span>
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

                            {/* List of Deposits */}
                            <div className="flex-1 overflow-y-auto p-6 bg-zinc-50/50 dark:bg-zinc-950/20">
                                {deposits.length === 0 ? (
                                    <div className="text-center py-10">
                                        <p className="text-zinc-500 dark:text-zinc-400 text-sm">{t("deposits.empty")}</p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-3">
                                        {deposits.map((dep) => (
                                            <div key={dep.id} className="group flex items-center justify-between p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-zinc-900 dark:text-zinc-100 tabular-nums privacy-blur">{formatCurrency(dep.amountCzk)}</span>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <span className="text-xs text-zinc-400 font-medium">{dep.date}</span>
                                                        <span className="text-xs text-zinc-500 truncate max-w-[150px]">— {dep.note}</span>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => onDeleteDeposit(dep.id)}
                                                    className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors opacity-0 group-hover:opacity-100"
                                                    title={t("deposits.delete")}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Add New Deposit Form */}
                            <div className="p-6 border-t border-zinc-200/50 dark:border-zinc-800/50 bg-white/50 dark:bg-zinc-900/50">
                                <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                                    <div className="flex gap-3">
                                        <div className="flex-1 relative">
                                            <input
                                                type="text"
                                                inputMode="decimal"
                                                value={amount}
                                                onChange={(e) => setAmount(e.target.value)}
                                                placeholder={t("deposits.amountPlaceholder")}
                                                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-4 py-3 text-sm font-medium text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all tabular-nums"
                                            />
                                        </div>
                                        <div className="flex-1 relative">
                                            <input
                                                type="text"
                                                value={date}
                                                onChange={(e) => setDate(e.target.value)}
                                                placeholder={t("deposits.datePlaceholder")}
                                                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-4 py-3 text-sm font-medium text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all tabular-nums"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <div className="flex-[2] relative">
                                            <input
                                                type="text"
                                                value={note}
                                                onChange={(e) => setNote(e.target.value)}
                                                placeholder={t("deposits.notePlaceholder")}
                                                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-4 py-3 text-sm font-medium text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all"
                                            />
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={!amount}
                                            className="flex items-center justify-center rounded-xl bg-emerald-600 px-6 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors disabled:opacity-50"
                                        >
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

"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2, X } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";

interface DeleteTickerModalProps {
    ticker: string | null;
    onClose: () => void;
    onConfirm: (ticker: string, reason: string) => void;
}

export function DeleteTickerModal({ ticker, onClose, onConfirm }: DeleteTickerModalProps) {
    const { t } = useLanguage();
    const [reason, setReason] = useState("");

    const handleConfirm = () => {
        if (!ticker) return;
        onConfirm(ticker, reason.trim() || t("delete.noReason"));
        setReason("");
    };

    const handleClose = () => {
        setReason("");
        onClose();
    };

    return (
        <AnimatePresence>
            {ticker && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={handleClose}
                        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
                    />

                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="pointer-events-auto w-full max-w-md rounded-3xl border border-white/20 dark:border-white/10 bg-white/90 dark:bg-zinc-900/90 p-6 shadow-2xl backdrop-blur-2xl"
                        >
                            <div className="flex items-center justify-between mb-5">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400">
                                        <Trash2 size={20} />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 leading-tight">
                                            {t("delete.title")}
                                        </h2>
                                        <p className="text-sm text-zinc-500">
                                            <span className="font-semibold text-zinc-800 dark:text-zinc-200">{ticker}</span>
                                        </p>
                                    </div>
                                </div>
                                <button onClick={handleClose} className="rounded-full p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                                    <X size={20} />
                                </button>
                            </div>

                            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
                                {t("delete.warning")}
                            </p>

                            <div className="flex flex-col gap-1.5 mb-6">
                                <label htmlFor="reason" className="text-sm font-medium text-zinc-700 dark:text-zinc-300 ml-1">
                                    {t("delete.reason")} <span className="text-zinc-400 font-normal">{t("delete.optional")}</span>
                                </label>
                                <input
                                    id="reason"
                                    type="text"
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
                                    placeholder={t("delete.placeholder")}
                                    className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-4 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:border-red-400 focus:outline-none focus:ring-1 focus:ring-red-400 transition-all"
                                    autoFocus
                                />
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={handleClose}
                                    className="flex-1 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 py-2.5 text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
                                >
                                    {t("generic.cancel")}
                                </button>
                                <button
                                    onClick={handleConfirm}
                                    className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
                                >
                                    {t("delete.title")}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
}

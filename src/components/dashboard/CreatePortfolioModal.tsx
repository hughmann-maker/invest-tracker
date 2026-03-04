"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Briefcase, X } from "lucide-react";
import { cn } from "@/utils/cn";
import { useLanguage } from "@/lib/i18n/LanguageContext";

interface CreatePortfolioModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (name: string) => void;
    mode?: "create" | "rename";
    currentName?: string;
}

export function CreatePortfolioModal({ isOpen, onClose, onConfirm, mode = "create", currentName = "" }: CreatePortfolioModalProps) {
    const { language } = useLanguage();
    const [name, setName] = useState(currentName);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = name.trim();
        if (!trimmed) {
            setError(language === "cs" ? "Název nesmí být prázdný" : "Name cannot be empty");
            return;
        }
        if (trimmed.length > 50) {
            setError(language === "cs" ? "Název je příliš dlouhý" : "Name is too long");
            return;
        }
        onConfirm(trimmed);
        setName("");
        setError(null);
    };

    const title = mode === "create"
        ? (language === "cs" ? "Nové portfolio" : "New Portfolio")
        : (language === "cs" ? "Přejmenovat portfolio" : "Rename Portfolio");

    const buttonText = mode === "create"
        ? (language === "cs" ? "Vytvořit" : "Create")
        : (language === "cs" ? "Uložit" : "Save");

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4"
                    onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
                >
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className={cn(
                            "relative w-full max-w-md p-6 rounded-2xl shadow-2xl",
                            "bg-white/80 dark:bg-zinc-900/90 backdrop-blur-xl",
                            "border border-white/30 dark:border-white/10"
                        )}
                    >
                        {/* Close button */}
                        <button
                            onClick={onClose}
                            className="absolute top-3 right-3 p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                        >
                            <X size={18} className="text-zinc-400" />
                        </button>

                        {/* Header */}
                        <div className="flex items-center gap-3 mb-5">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-900/50">
                                <Briefcase size={20} className="text-violet-600 dark:text-violet-400" />
                            </div>
                            <h2 className="text-lg font-bold">{title}</h2>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">
                                {language === "cs" ? "Název portfolia" : "Portfolio Name"}
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={e => { setName(e.target.value); setError(null); }}
                                placeholder={language === "cs" ? "např. Krypto, Důchod, Akcie..." : "e.g. Crypto, Retirement, Stocks..."}
                                className={cn(
                                    "w-full px-3 py-2.5 rounded-lg border text-sm",
                                    "bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600",
                                    "focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500",
                                    "placeholder-zinc-400"
                                )}
                                autoFocus
                                maxLength={50}
                            />

                            {error && (
                                <p className="mt-2 text-sm text-red-500">{error}</p>
                            )}

                            <div className="flex gap-2 mt-5">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="flex-1 px-4 py-2.5 text-sm font-medium rounded-lg border border-zinc-300 dark:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                                >
                                    {language === "cs" ? "Zrušit" : "Cancel"}
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2.5 text-sm font-medium text-white rounded-lg bg-violet-600 hover:bg-violet-700 transition-colors"
                                >
                                    {buttonText}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

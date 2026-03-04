"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Plus, Pencil, Trash2, Briefcase } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";

interface PortfolioEntry {
    id: string;
    name: string;
    createdAt: string;
}

interface PortfolioSwitcherProps {
    portfolios: PortfolioEntry[];
    activePortfolioId: string | null;
    onSwitch: (id: string) => void;
    onCreate: () => void;
    onRename: (id: string, currentName: string) => void;
    onDelete: (id: string, name: string) => void;
}

export function PortfolioSwitcher({ portfolios, activePortfolioId, onSwitch, onCreate, onRename, onDelete }: PortfolioSwitcherProps) {
    const { language } = useLanguage();
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const activePortfolio = portfolios.find(p => p.id === activePortfolioId);
    const activeName = activePortfolio?.name || (language === "cs" ? "Vyberte portfolio" : "Select portfolio");

    return (
        <div className="relative" ref={ref}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors border border-zinc-200 dark:border-zinc-700"
            >
                <Briefcase size={14} className="text-violet-500" />
                <span className="max-w-[140px] truncate">{activeName}</span>
                <ChevronDown size={14} className={`transition-transform ${isOpen ? "rotate-180" : ""}`} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.15 }}
                        className="absolute top-full left-0 mt-1 w-72 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-xl z-50 overflow-hidden"
                    >
                        {/* Portfolio list */}
                        <div className="max-h-64 overflow-y-auto py-1">
                            {portfolios.map(p => (
                                <div
                                    key={p.id}
                                    className={`flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors ${p.id === activePortfolioId ? "bg-violet-50 dark:bg-violet-900/20" : ""
                                        }`}
                                >
                                    <button
                                        onClick={() => { onSwitch(p.id); setIsOpen(false); }}
                                        className="flex-1 text-left text-sm truncate"
                                    >
                                        <span className={`${p.id === activePortfolioId ? "font-semibold text-violet-600 dark:text-violet-400" : ""}`}>
                                            {p.name}
                                        </span>
                                    </button>
                                    <div className="flex items-center gap-0.5 ml-2 shrink-0">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onRename(p.id, p.name); setIsOpen(false); }}
                                            className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                                            title={language === "cs" ? "Přejmenovat" : "Rename"}
                                        >
                                            <Pencil size={12} className="text-zinc-400" />
                                        </button>
                                        {portfolios.length > 1 && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onDelete(p.id, p.name); setIsOpen(false); }}
                                                className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                                                title={language === "cs" ? "Smazat" : "Delete"}
                                            >
                                                <Trash2 size={12} className="text-red-400" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Create new */}
                        <div className="border-t border-zinc-200 dark:border-zinc-700">
                            <button
                                onClick={() => { onCreate(); setIsOpen(false); }}
                                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors"
                            >
                                <Plus size={14} />
                                {language === "cs" ? "Nové portfolio" : "New portfolio"}
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

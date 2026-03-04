"use client";

import { TrendingUp, Moon, Sun, Eye, EyeOff, Settings, Globe } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/utils/cn";
import { useLanguage } from "@/lib/i18n/LanguageContext";

interface DashboardLayoutProps {
    children: React.ReactNode;
    dataProvider?: string;
    onProviderChange?: (provider: string) => void;
    rebalanceTolerance?: number;
    onToleranceChange?: (tolerance: number) => void;
    mainCurrency?: "CZK" | "EUR" | "USD";
    onMainCurrencyChange?: (currency: "CZK" | "EUR" | "USD") => void;
    secondaryCurrency?: "CZK" | "EUR" | "USD";
    onSecondaryCurrencyChange?: (currency: "CZK" | "EUR" | "USD") => void;
}

export function DashboardLayout({ children, dataProvider, onProviderChange, rebalanceTolerance, onToleranceChange, mainCurrency, onMainCurrencyChange, secondaryCurrency, onSecondaryCurrencyChange }: DashboardLayoutProps) {
    const { language, setLanguage, t } = useLanguage();
    const [isDark, setIsDark] = useState(false);
    const [isPrivacy, setIsPrivacy] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [mounted, setMounted] = useState(false);

    // Close settings if clicked outside
    const settingsRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
                setIsSettingsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        setMounted(true);
        // V jednoduchosti kontrolujeme třídu na HTML/body, ale prozatím defaultní stav.
        if (document.documentElement.classList.contains("dark")) {
            setIsDark(true);
        }
        if (document.documentElement.classList.contains("privacy-mode")) {
            setIsPrivacy(true);
        }
    }, []);

    const toggleTheme = () => {
        if (isDark) {
            document.documentElement.classList.remove("dark");
        } else {
            document.documentElement.classList.add("dark");
        }
        setIsDark(!isDark);
    };

    const togglePrivacy = () => {
        if (isPrivacy) {
            document.documentElement.classList.remove("privacy-mode");
        } else {
            document.documentElement.classList.add("privacy-mode");
        }
        setIsPrivacy(!isPrivacy);
    };

    if (!mounted) return null;

    return (
        <div className="relative min-h-screen bg-zinc-50 dark:bg-[#09090b] text-zinc-900 dark:text-zinc-50 transition-colors duration-500 overflow-hidden font-sans">
            {/* Ambient Background Orbs */}
            <div className="pointer-events-none fixed inset-0 flex justify-center -z-10">
                <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-emerald-500/20 dark:bg-emerald-900/20 blur-[100px] mix-blend-multiply dark:mix-blend-screen opacity-70 animate-pulse" style={{ animationDuration: '8s' }} />
                <div className="absolute top-[20%] right-[-5%] w-[400px] h-[400px] rounded-full bg-blue-500/20 dark:bg-blue-900/20 blur-[120px] mix-blend-multiply dark:mix-blend-screen opacity-60" />
                <div className="absolute bottom-[-10%] left-[20%] w-[600px] h-[600px] rounded-full bg-indigo-500/10 dark:bg-indigo-900/20 blur-[130px] mix-blend-multiply dark:mix-blend-screen opacity-50 animate-pulse" style={{ animationDuration: '12s' }} />
            </div>

            {/* Navbar - Glassmorphism */}
            <nav className="sticky top-0 z-50 w-full border-b border-white/20 dark:border-white/5 bg-white/60 dark:bg-zinc-950/40 backdrop-blur-xl">
                <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
                    <div className="flex h-16 items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900">
                                <TrendingUp size={20} strokeWidth={2.5} />
                            </div>
                            <span className="text-xl font-bold tracking-tight">Investio</span>
                        </div>

                        <div className="flex items-center gap-1">
                            <button
                                onClick={togglePrivacy}
                                className="rounded-full p-2 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 dark:hover:text-zinc-50 transition-colors"
                                aria-label="Toggle Privacy Mode"
                                title="Skrýt investice"
                            >
                                {isPrivacy ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                            <button
                                onClick={toggleTheme}
                                className="rounded-full p-2 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 dark:hover:text-zinc-50 transition-colors"
                                aria-label="Toggle Theme"
                                title={t("nav.theme")}
                            >
                                {isDark ? <Sun size={20} /> : <Moon size={20} />}
                            </button>

                            <button
                                onClick={() => setLanguage(language === "cs" ? "en" : "cs")}
                                className="flex items-center justify-center rounded-full p-2 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 dark:hover:text-zinc-50 transition-colors"
                                aria-label="Toggle Language"
                                title={language === "cs" ? "Přepnout do Angličtiny" : "Switch to Czech"}
                            >
                                <span className="text-xs font-bold uppercase w-5 text-center">{language}</span>
                            </button>

                            <div className="relative" ref={settingsRef}>
                                <button
                                    onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                                    className={cn(
                                        "rounded-full p-2 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 dark:hover:text-zinc-50 transition-colors",
                                        isSettingsOpen && "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50"
                                    )}
                                    aria-label="Nastavení"
                                    title="Nastavení"
                                >
                                    <Settings size={20} />
                                </button>

                                {isSettingsOpen && onProviderChange && onToleranceChange && (
                                    <div className="absolute right-0 mt-3 w-72 rounded-2xl border border-white/20 dark:border-zinc-700/50 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl shadow-2xl p-4 flex flex-col gap-4 z-50">
                                        <div>
                                            <div className="flex flex-col gap-1 mb-2">
                                                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                                                    {t("settings.provider")}
                                                </label>
                                                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 leading-tight">
                                                    {language === "cs" ? "*Kurzy měn jsou pro stabilitu vždy dotahovány z Yahoo." : "*Exchange rates are always fetched from Yahoo for stability."}
                                                </span>
                                            </div>
                                            <select
                                                value={dataProvider || "yahoo"}
                                                onChange={(e) => onProviderChange(e.target.value)}
                                                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2.5 text-sm font-medium text-zinc-900 dark:text-zinc-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                            >
                                                <option value="yahoo">Yahoo Finance {language === "cs" ? "(Základní)" : "(Default)"}</option>
                                                <option value="ecb">ECB {language === "cs" ? "(Přesné měny)" : "(Precise Currencies)"}</option>
                                            </select>
                                        </div>

                                        <div className="border-t border-zinc-200/50 dark:border-zinc-800/50 pt-3">
                                            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">
                                                {t("settings.mainCurrency")}
                                            </label>
                                            <select
                                                value={mainCurrency || "CZK"}
                                                onChange={(e) => onMainCurrencyChange && onMainCurrencyChange(e.target.value as any)}
                                                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2.5 text-sm font-medium text-zinc-900 dark:text-zinc-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                            >
                                                <option value="CZK">CZK (Kč)</option>
                                                <option value="EUR">EUR (€)</option>
                                                <option value="USD">USD ($)</option>
                                            </select>
                                        </div>

                                        <div className="border-t border-zinc-200/50 dark:border-zinc-800/50 pt-3">
                                            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">
                                                {t("settings.secondaryCurrency")}
                                            </label>
                                            <select
                                                value={secondaryCurrency || "EUR"}
                                                onChange={(e) => onSecondaryCurrencyChange && onSecondaryCurrencyChange(e.target.value as any)}
                                                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2.5 text-sm font-medium text-zinc-900 dark:text-zinc-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                            >
                                                <option value="CZK">CZK (Kč)</option>
                                                <option value="EUR">EUR (€)</option>
                                                <option value="USD">USD ($)</option>
                                            </select>
                                        </div>

                                        <div className="border-t border-zinc-200/50 dark:border-zinc-800/50 pt-3">
                                            <label className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">
                                                <span>{t("settings.tolerance")}</span>
                                                <span className="text-zinc-900 dark:text-zinc-100">{Math.round((rebalanceTolerance || 0.05) * 100)} %</span>
                                            </label>
                                            <input
                                                type="range"
                                                min="1"
                                                max="20"
                                                step="1"
                                                value={Math.round((rebalanceTolerance || 0.05) * 100)}
                                                onChange={(e) => onToleranceChange(parseInt(e.target.value, 10) / 100)}
                                                className="w-full accent-emerald-500"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Main Content Area */}
            <main className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8 md:py-12">
                {children}
            </main>
        </div>
    );
}

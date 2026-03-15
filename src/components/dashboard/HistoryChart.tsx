"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { AreaChart, Area, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { History, TrendingUp, Wallet, BarChart3, Layers } from "lucide-react";
import { cn } from "@/utils/cn";
import { useLanguage } from "@/lib/i18n/LanguageContext";

interface HistoryDataPoint {
    date: string;
    totalValueEur: number;
    totalValueCzk: number;
    totalInvestedCzk?: number;
    benchmarkValue?: number;
    assetsCzk?: Record<string, number>;
}

interface GhostDataPoint {
    date: string;
    value: number; // CZK value of the ghost portfolio
}

interface HistoryChartProps {
    data: HistoryDataPoint[];
    ghostData?: GhostDataPoint[];
    ghostName?: string;
    mainCurrency?: "CZK" | "EUR" | "USD";
    exchangeRates?: { EUR: number; USD: number };
}

export function HistoryChart({ data, ghostData, ghostName, mainCurrency = "CZK", exchangeRates = { EUR: 25.0, USD: 23.0 } }: HistoryChartProps) {
    const { t } = useLanguage();
    const [activeTab, setActiveTab] = useState<'TOTAL' | 'PROFIT' | 'GHOST'>('TOTAL');
    const [showAssets, setShowAssets] = useState(false);

    if (!data || data.length === 0) {
        return null;
    }

    const ASSET_COLORS = [
        "#3b82f6", "#ef4444", "#10b981", "#f59e0b", 
        "#ec4899", "#8b5cf6", "#14b8a6", "#f97316",
        "#6366f1", "#06b6d4", "#84cc16", "#d946ef"
    ];

    // Get unique tickers from history
    const uniqueTickers = Array.from(new Set(data.flatMap(d => Object.keys(d.assetsCzk || {}))));

    const formatCurrency = (val: number, currency: string) => {
        return new Intl.NumberFormat("cs-CZ", {
            style: "currency",
            currency,
            maximumFractionDigits: 0,
        }).format(val);
    };

    const isGhostMode = activeTab === 'GHOST';
    const isProfitMode = activeTab === 'PROFIT';

    // Build ghost lookup for easy merge
    const ghostLookup = new Map<string, number>();
    if (ghostData) {
        ghostData.forEach(g => ghostLookup.set(g.date, g.value));
    }
    const hasGhostData = ghostData && ghostData.length > 0;

    // Normalize for comparison (both start at 100)
    // Bezpečný fallback na 1, abychom nedělili nulou, pokud je portfolio první dny na 0 CZK
    const firstValue = data[0]?.totalValueCzk || 1;
    const firstGhost = ghostData && ghostData.length > 0 ? (ghostData[0].value || 1) : 1;

    const rate = mainCurrency === "EUR" ? exchangeRates.EUR : mainCurrency === "USD" ? exchangeRates.USD : 1;

    const chartData = data.map(d => {
        const ghostVal = ghostLookup.get(d.date);
        const displayValue = isProfitMode
            ? (d.totalValueCzk - (d.totalInvestedCzk || 0)) / rate
            : isGhostMode
                ? (d.totalValueCzk / firstValue) * 100
                : (d.totalValueCzk / rate);
        const ghostNormalized = isGhostMode && ghostVal
            ? (ghostVal / firstGhost) * 100
            : undefined;
        const ghostAbsolute = ghostVal;

        const hoistedAssets: Record<string, number> = {};
        if (d.assetsCzk && showAssets && activeTab === 'TOTAL') {
            Object.entries(d.assetsCzk).forEach(([ticker, val]) => {
                hoistedAssets[`asset_${ticker}`] = val / rate;
            });
        }

        return { ...d, displayValue, ghostNormalized, ghostAbsolute, ...hoistedAssets };
    });

    const latestValue = chartData[chartData.length - 1]?.displayValue || 0;
    const strokeColor = isProfitMode
        ? (latestValue >= 0 ? "#10b981" : "#ef4444")
        : "#8b5cf6";

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="w-full mt-8 rounded-3xl border border-white/40 dark:border-white/10 bg-white/60 dark:bg-zinc-900/40 backdrop-blur-2xl p-6 md:p-8 shadow-xl shadow-black/5 mb-12"
        >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-400">
                        <History size={20} />
                    </div>
                    <div>
                        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
                            {t("history.title")}
                        </h2>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
                            {isGhostMode ? `Porovnání s ${ghostName || 'Ghost Portfolio'} (normalizováno na 100)` : t("history.subtitle")}
                        </p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 items-center flex-wrap">
                    <div className="flex items-center p-1 rounded-2xl bg-zinc-100/80 dark:bg-zinc-950/50 border border-white/20 dark:border-zinc-800">
                        <button
                            onClick={() => setActiveTab('TOTAL')}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all",
                                activeTab === 'TOTAL'
                                    ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm"
                                    : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                            )}
                        >
                            <Wallet size={16} />
                            {t("history.tabValue")}
                        </button>
                        <button
                            onClick={() => setActiveTab('PROFIT')}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all",
                                activeTab === 'PROFIT'
                                    ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm"
                                    : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                            )}
                        >
                            <TrendingUp size={16} />
                            {t("history.tabProfit")}
                        </button>
                        {hasGhostData && (
                            <button
                                onClick={() => setActiveTab('GHOST')}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all",
                                    activeTab === 'GHOST'
                                        ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm"
                                        : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                                )}
                            >
                                <BarChart3 size={16} />
                                vs {ghostName || 'Ghost'}
                            </button>
                        )}
                    </div>
                    {activeTab === 'TOTAL' && uniqueTickers.length > 0 && (
                        <button
                            onClick={() => setShowAssets(!showAssets)}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all border",
                                showAssets
                                    ? "bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-900 border-transparent shadow-sm"
                                    : "bg-white dark:bg-zinc-900/50 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 border-zinc-200 dark:border-zinc-800"
                            )}
                        >
                            <Layers size={16} />
                            {showAssets ? 'Skrýt aktiva' : 'Zobrazit aktiva'}
                        </button>
                    )}
                </div>
            </div>

            <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                        data={chartData}
                        margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                    >
                        <defs>
                            <linearGradient id="colorDynamic" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={strokeColor} stopOpacity={isGhostMode ? 0.15 : isProfitMode ? 0.35 : 0.3} />
                                <stop offset="95%" stopColor={strokeColor} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <XAxis
                            dataKey="date"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#71717a', fontSize: 12 }}
                            tickMargin={10}
                        />
                        <YAxis
                            hide
                            domain={['auto', 'auto']}
                        />
                        <Tooltip
                            content={({ active, payload, label }) => {
                                if (active && payload && payload.length) {
                                    const raw = payload[0].payload as HistoryDataPoint & { displayValue: number; ghostNormalized?: number; ghostAbsolute?: number };
                                    const currentProfit = raw.totalValueCzk - (raw.totalInvestedCzk || 0);

                                    return (
                                        <div className="rounded-2xl border border-white/40 dark:border-white/10 bg-white/80 dark:bg-zinc-900/80 p-4 shadow-xl shadow-black/10 backdrop-blur-xl min-w-[220px]">
                                            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-2">{label}</p>

                                            <div className="flex flex-col gap-2">
                                                {isGhostMode ? (
                                                    <>
                                                        <div className="flex justify-between items-center gap-4">
                                                            <span className="text-sm text-violet-600 dark:text-violet-400 flex items-center gap-1">
                                                                <span className="w-2 h-2 rounded-full bg-violet-500 inline-block"></span>
                                                                Moje portfolio
                                                            </span>
                                                            <span className="text-base font-bold tabular-nums text-zinc-900 dark:text-zinc-50 privacy-blur">
                                                                {raw.displayValue.toFixed(1)}%
                                                            </span>
                                                        </div>
                                                        {raw.ghostNormalized !== undefined && (
                                                            <div className="flex justify-between items-center gap-4">
                                                                <span className="text-sm text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                                                    <span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span>
                                                                    {ghostName || 'Ghost'}
                                                                </span>
                                                                <span className="text-base font-bold tabular-nums text-zinc-900 dark:text-zinc-50 privacy-blur">
                                                                    {raw.ghostNormalized.toFixed(1)}%
                                                                </span>
                                                            </div>
                                                        )}
                                                        {raw.ghostAbsolute !== undefined && (
                                                            <div className="flex justify-between items-center gap-4 border-t border-zinc-200/50 dark:border-zinc-800/50 pt-1 mt-1">
                                                                <span className="text-xs text-zinc-500">Ghost hodnota</span>
                                                                <span className="text-xs font-medium text-zinc-500 tabular-nums privacy-blur">
                                                                    {formatCurrency(raw.ghostAbsolute / rate, mainCurrency)}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </>
                                                ) : (
                                                    <>
                                                        <div className="flex justify-between items-center gap-4">
                                                            <span className="text-sm text-zinc-600 dark:text-zinc-300">
                                                                {isProfitMode ? 'Čistý zisk' : 'Hodnota'}
                                                            </span>
                                                            <span className={cn(
                                                                "text-base font-bold tabular-nums privacy-blur",
                                                                isProfitMode && currentProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" :
                                                                    isProfitMode && currentProfit < 0 ? "text-red-600 dark:text-red-400" :
                                                                        "text-zinc-900 dark:text-zinc-50"
                                                            )}>
                                                                {isProfitMode && currentProfit > 0 && '+'}{formatCurrency(isProfitMode ? currentProfit / rate : raw.totalValueCzk / rate, mainCurrency)}
                                                            </span>
                                                        </div>

                                                        {!isProfitMode && raw.totalInvestedCzk !== undefined && raw.totalInvestedCzk > 0 && (
                                                            <div className="flex justify-between items-center gap-4 border-t border-zinc-200/50 dark:border-zinc-800/50 pt-1 mt-1">
                                                                <span className="text-xs text-zinc-500">Celkem vloženo</span>
                                                                <span className="text-xs font-medium text-zinc-500 tabular-nums privacy-blur">
                                                                    {formatCurrency(raw.totalInvestedCzk / rate, mainCurrency)}
                                                                </span>
                                                            </div>
                                                        )}

                                                        {isProfitMode && raw.totalValueCzk > 0 && (
                                                            <div className="flex justify-between items-center gap-4 border-t border-zinc-200/50 dark:border-zinc-800/50 pt-1 mt-1">
                                                                <span className="text-xs text-zinc-500">Celková hodnota</span>
                                                                <span className="text-xs font-medium text-zinc-500 tabular-nums privacy-blur">
                                                                    {formatCurrency(raw.totalValueCzk / rate, mainCurrency)}
                                                                </span>
                                                            </div>
                                                        )}

                                                        {showAssets && activeTab === 'TOTAL' && raw.assetsCzk && Object.entries(raw.assetsCzk).map(([tick, val]) => {
                                                            const color = ASSET_COLORS[uniqueTickers.indexOf(tick) % ASSET_COLORS.length];
                                                            return (
                                                              <div key={tick} className="flex justify-between items-center gap-6 border-t border-zinc-200/50 dark:border-zinc-800/50 pt-1 mt-1">
                                                                  <span className="text-xs text-zinc-500 flex items-center gap-1.5 font-semibold">
                                                                      <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: color }}></span>
                                                                      {tick}
                                                                  </span>
                                                                  <span className="text-xs font-bold text-zinc-600 dark:text-zinc-400 tabular-nums privacy-blur">
                                                                      {formatCurrency(val / rate, mainCurrency)}
                                                                  </span>
                                                              </div>
                                                            );
                                                        })}
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    );
                                }
                                return null;
                            }}
                        />
                        <Area
                            type="monotone"
                            dataKey="displayValue"
                            stroke={strokeColor}
                            strokeWidth={3}
                            fillOpacity={1}
                            fill="url(#colorDynamic)"
                            animationDuration={800}
                            name="Portfolio"
                        />
                        {isGhostMode && hasGhostData && (
                            <Line
                                type="monotone"
                                dataKey="ghostNormalized"
                                stroke="#f59e0b"
                                strokeWidth={2}
                                strokeDasharray="6 3"
                                dot={false}
                                animationDuration={800}
                                name={ghostName || 'Ghost'}
                            />
                        )}
                        {showAssets && activeTab === 'TOTAL' && uniqueTickers.map((ticker, idx) => (
                            <Line
                                key={ticker}
                                type="monotone"
                                dataKey={`asset_${ticker}`}
                                stroke={ASSET_COLORS[idx % ASSET_COLORS.length]}
                                strokeWidth={2}
                                dot={false}
                                name={ticker}
                                animationDuration={800}
                                strokeOpacity={0.8}
                            />
                        ))}
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            {isGhostMode && (
                <div className="mt-4 flex items-center justify-center gap-6 text-xs text-zinc-500">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-0.5 bg-violet-500 rounded"></div>
                        <span>Vaše portfolio</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-0.5 bg-amber-500 rounded" style={{ borderTop: '2px dashed #f59e0b' }}></div>
                        <span>{ghostName || 'Ghost Portfolio'}</span>
                    </div>
                </div>
            )}
        </motion.div>
    );
}

"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import { TrendingUp, TrendingDown, Clock, Loader2 } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { cn } from "@/utils/cn";

interface MarketOverviewProps {
  dataProvider: string;
  mainCurrency: "CZK" | "EUR" | "USD";
  exchangeRates: { EUR: number, USD: number };
}

interface CommodityData {
  ticker: string;
  nameKey: string;
  color: string;
  price?: number;
  change?: number;
  changePercent?: number;
  history?: { date: string; value: number }[];
}

const COMMODITIES = [
  { ticker: "GC=F", nameKey: "market.gold", color: "#f59e0b" }, // Gold
  { ticker: "SI=F", nameKey: "market.silver", color: "#94a3b8" }, // Silver
  { ticker: "PL=F", nameKey: "market.platinum", color: "#818cf8" }, // Platinum
  { ticker: "PA=F", nameKey: "market.palladium", color: "#14b8a6" }, // Palladium
];

export function MarketOverview({ dataProvider, mainCurrency, exchangeRates }: MarketOverviewProps) {
  const { t, language } = useLanguage();
  const [data, setData] = useState<CommodityData[]>(COMMODITIES);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    
    async function fetchMarketData() {
      setIsLoading(true);
      setError(null);
      try {
        const tickers = COMMODITIES.map(c => c.ticker);
        
        // Use Yahoo explicitly for these futures as they are very reliable there
        const pricesRes = await fetch("/api/prices", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tickers, provider: "yahoo" }),
        });
        
        if (!pricesRes.ok) throw new Error("Failed to fetch market prices");
        const pricesData = await pricesRes.json();

        // Fetch history (last 30 days) to draw sparklines
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
        
        const historyRes = await fetch("/api/history", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            tickers, 
            startDate: startDate.toISOString().split('T')[0],
            provider: "yahoo" 
          }),
        });

        if (!historyRes.ok) throw new Error("Failed to fetch market history");
        const historyDataRaw = await historyRes.json();
        
        if (!isMounted) return;

        // Process data into our components format
        const enhancedData = COMMODITIES.map(commodity => {
          const livePrice = pricesData.prices?.find((p: any) => p && p.ticker === commodity.ticker);
          
          const history = historyDataRaw.days?.map((d: any) => ({
            date: d.date,
            value: d.prices[commodity.ticker] || 0
          })).filter((h: any) => h.value > 0) || [];

          return {
            ...commodity,
            price: livePrice?.price,
            change: livePrice?.dailyChange,
            changePercent: livePrice?.dailyChangePercent,
            history
          };
        });

        setData(enhancedData);

      } catch (err: any) {
        console.error("Market fetch error:", err);
        if (isMounted) setError(language === "cs" ? "Chyba při načítání tržních dat." : "Error loading market data.");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    fetchMarketData();

    return () => { isMounted = false; };
  }, [language]); // Just fetch once on mount/language change

  const formatCurrency = (val: number) => {
    // Commodities are priced in USD by default on Yahoo. If user views in CZK or EUR, we convert.
    const isCz = mainCurrency === "CZK";
    const rate = isCz ? exchangeRates.USD : (mainCurrency === "EUR" ? (exchangeRates.USD / exchangeRates.EUR) : 1);
    
    return new Intl.NumberFormat(language === "cs" ? "cs-CZ" : "en-US", {
      style: "currency",
      currency: mainCurrency,
      maximumFractionDigits: 0,
    }).format(val * rate);
  };

  // Static translations dictionary since we don't have a large i18n file yet
  const i18n: Record<string, Record<string, string>> = {
    cs: {
      "market.title": "Přehled trhu",
      "market.subtitle": "Aktuální spotové ceny drahých kovů",
      "market.gold": "Zlato (Gold)",
      "market.silver": "Stříbro (Silver)",
      "market.platinum": "Platina",
      "market.palladium": "Palladium",
    },
    en: {
      "market.title": "Market Overview",
      "market.subtitle": "Current spot prices of precious metals",
      "market.gold": "Gold",
      "market.silver": "Silver",
      "market.platinum": "Platinum",
      "market.palladium": "Palladium",
    },
    sk: {
      "market.title": "Prehľad trhu",
      "market.subtitle": "Aktuálne spotové ceny drahých kovov",
      "market.gold": "Zlato (Gold)",
      "market.silver": "Striebro (Silver)",
      "market.platinum": "Platina",
      "market.palladium": "Paládium",
    },
    pl: {
      "market.title": "Przegląd rynku",
      "market.subtitle": "Aktualne kursy spot metali szlachetnych",
      "market.gold": "Złoto (Gold)",
      "market.silver": "Srebro (Silver)",
      "market.platinum": "Platyna",
      "market.palladium": "Pallad",
    },
    de: {
      "market.title": "Marktübersicht",
      "market.subtitle": "Aktuelle Spotpreise von Edelmetallen",
      "market.gold": "Gold",
      "market.silver": "Silber",
      "market.platinum": "Platin",
      "market.palladium": "Palladium",
    }
  };

  const str = (key: string) => i18n[language]?.[key] || key;

  return (
    <div className="w-full animate-in fade-in duration-500 pb-12">
      <div className="mb-8">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          {str("market.title")}
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          {str("market.subtitle")}
        </p>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-12 text-zinc-500">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mb-4" />
          <p>{language === "cs" ? "Načítám živá data z trhu..." : "Loading live market data..."}</p>
        </div>
      ) : error ? (
        <div className="p-6 rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-center">
          {error}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
          {data.map((item, idx) => (
            <motion.div
              key={item.ticker}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: idx * 0.1 }}
              className="relative overflow-hidden group rounded-3xl border border-white/40 dark:border-white/10 bg-white/60 dark:bg-zinc-900/40 backdrop-blur-xl p-6 shadow-xl shadow-black/5 flex flex-col justify-between"
            >
              {/* Background gradient hint */}
              <div 
                className="absolute -top-24 -right-24 w-48 h-48 rounded-full opacity-10 blur-3xl group-hover:opacity-20 transition-opacity duration-500"
                style={{ backgroundColor: item.color }}
              />

              <div className="relative z-10 flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
                    <span 
                      className="w-2.5 h-2.5 rounded-full" 
                      style={{ backgroundColor: item.color, boxShadow: `0 0 10px ${item.color}` }}
                    />
                    {str(item.nameKey)}
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Spot Future • {item.ticker}</p>
                </div>

                <div className="text-right">
                  <div className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white privacy-blur">
                    {item.price ? formatCurrency(item.price) : "---"}
                  </div>
                  {item.changePercent !== undefined && (
                    <div className={cn(
                      "flex items-center justify-end gap-1 text-sm font-semibold mt-1",
                      item.changePercent >= 0 ? "text-emerald-500" : "text-red-500"
                    )}>
                      {item.changePercent >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                      {item.changePercent > 0 ? "+" : ""}{item.changePercent.toFixed(2)}%
                    </div>
                  )}
                </div>
              </div>

              <div className="h-32 w-full mt-auto relative z-10 -mx-2">
                {item.history && item.history.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={item.history} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id={`gradient-${item.ticker}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={item.color} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={item.color} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke={item.color}
                        strokeWidth={2}
                        fillOpacity={1}
                        fill={`url(#gradient-${item.ticker})`}
                        animationDuration={1500}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-400">
                    <Clock size={20} className="opacity-50" />
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

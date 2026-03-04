"use client";

import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { BentoSummary } from "@/components/dashboard/BentoSummary";
import { AssetsList, type Asset } from "@/components/dashboard/AssetsList";
import { useRef } from "react";
import { RebalanceAlert } from "@/components/dashboard/RebalanceAlert";
import { HistoryChart } from "@/components/dashboard/HistoryChart";
import { AddTickerModal } from "@/components/dashboard/AddTickerModal";
import { DepositsModal, type Deposit } from "@/components/dashboard/DepositsModal";
import { DeleteTickerModal } from "@/components/dashboard/DeleteTickerModal";
import { SmartInvestModal } from "@/components/dashboard/SmartInvestModal";
import { TransactionModal, type Transaction } from "@/components/dashboard/TransactionModal";
import { AnnualReport } from "@/components/dashboard/AnnualReport";
import { CorrelationHeatmap } from "@/components/dashboard/CorrelationHeatmap";
import { GhostPortfolioModal, type GhostPortfolio } from "@/components/dashboard/GhostPortfolioModal";
import { PortfolioSwitcher } from "@/components/dashboard/PortfolioSwitcher";
import { CreatePortfolioModal } from "@/components/dashboard/CreatePortfolioModal";
import { Wallet, Brain, RefreshCcw, Receipt, Download, Upload, Ghost, Power, MoreHorizontal, Briefcase, HardDriveDownload, HardDriveUpload } from "lucide-react";
import { cn } from "@/utils/cn";
import { useLanguage } from "@/lib/i18n/LanguageContext";

// localStorage keys are now prefixed with portfolio ID
const lsKey = (portfolioId: string, suffix: string) => `investice_${portfolioId}_${suffix}`;
const GHOST_SUFFIX = "ghost_v1";

// Cílové rozložení podle Excelu - ukládáme jako základní šablonu
const DEFAULT_ASSETS_TEMPLATE: Asset[] = [
  {
    ticker: "SXR8.DE",
    name: "iShares Core S&P 500",
    price: 0,
    currency: "EUR",
    shares: 0,
    targetWeight: 0.70,
    actualWeight: 0,
    dailyChange: 0,
    dailyChangePercent: 0,
  },
  {
    ticker: "IS3N.DE",
    name: "iShares Core MSCI EM IMI",
    price: 0,
    currency: "EUR",
    shares: 0,
    targetWeight: 0.20,
    actualWeight: 0,
    dailyChange: 0,
    dailyChangePercent: 0,
  },
  {
    ticker: "SYBJ.DE",
    name: "SPDR Bloomberg Euro High Yield",
    price: 0,
    currency: "EUR",
    shares: 0,
    targetWeight: 0.10,
    actualWeight: 0,
    dailyChange: 0,
    dailyChangePercent: 0,
  }
];

// Pomocná funkce pro parsování data
const parseCzDate = (s: string) => {
  const parts = s.replace(/\s/g, '').split('.');
  if (parts.length !== 3) return new Date();
  return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
};

// Cross-browser UUID generator — falls back to Math.random() for older iOS Safari / Android WebView
// that lack crypto.randomUUID() (available since Safari 15.4, Chrome 92)
const generateId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // RFC 4122 compliant fallback using Math.random
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// Pomocná funkce pro statický výpočet čisté investované částky (Net Cash Flow = Nákupy - Prodeje) v CZK
const calculateNetInvestmentCzk = (txs: Transaction[], dateLimitTs: number, histRates: Record<string, { EUR: number; USD: number }>, currentRates: { EUR: number; USD: number }) => {
  let netInvestedCzk = 0;

  txs.forEach(t => {
    if (parseCzDate(t.date).getTime() <= dateLimitTs && t.pricePerShare) {
      const tradeValueForeign = t.shares * t.pricePerShare;

      const dayRates = histRates[t.date] || currentRates;
      const txRate = t.currency === "USD" ? (dayRates.USD || currentRates.USD) : (dayRates.EUR || currentRates.EUR);

      const tradeValueCzk = tradeValueForeign * txRate;

      if (t.type === "BUY") {
        netInvestedCzk += tradeValueCzk;
      } else if (t.type === "SELL") {
        // Odečítáme skutečnou prodejní hodnotu, tím se do netInvested trvale uzamkne realizovaný zisk/ztráta
        netInvestedCzk -= tradeValueCzk;
      }
    }
  });

  return netInvestedCzk;
};

interface PortfolioEntry {
  id: string;
  name: string;
  createdAt: string;
}

export default function DashboardPage() {
  const { t, language } = useLanguage();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [exchangeRates, setExchangeRates] = useState<{ EUR: number; USD: number }>({ EUR: 25.0, USD: 23.0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [historyData, setHistoryData] = useState<any[]>([]);

  // Portfolio management
  const [portfolioList, setPortfolioList] = useState<PortfolioEntry[]>([]);
  const [activePortfolioId, setActivePortfolioId] = useState<string | null>(null);
  const [isCreatePortfolioOpen, setIsCreatePortfolioOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);

  // Modals & Deposits State
  const [isAddTickerOpen, setIsAddTickerOpen] = useState(false);
  const [isDepositsOpen, setIsDepositsOpen] = useState(false);
  const [isSmartInvestOpen, setIsSmartInvestOpen] = useState(false);
  const [isTransactionsOpen, setIsTransactionsOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const restoreInputRef = useRef<HTMLInputElement>(null);

  const [hasLoaded, setHasLoaded] = useState(false);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pendingDeleteTicker, setPendingDeleteTicker] = useState<string | null>(null);

  // Settings
  const [dataProvider, setDataProvider] = useState<string>("yahoo");
  const [rebalanceTolerance, setRebalanceTolerance] = useState<number>(0.05);
  const [mainCurrency, setMainCurrency] = useState<"CZK" | "EUR" | "USD">("CZK");
  const [secondaryCurrency, setSecondaryCurrency] = useState<"CZK" | "EUR" | "USD">("EUR");

  // Auto-refresh
  const [autoRefresh, setAutoRefresh] = useState(false);
  const getRefreshInterval = (provider: string) => {
    switch (provider) {
      case "yahoo": return 60_000;
      case "tiingo": return 300_000;
      case "ecb": return 3_600_000;
      case "finnhub": return 60_000;
      default: return 60_000;
    }
  };
  const currentRefreshIntervalMs = getRefreshInterval(dataProvider);

  // Ghost Portfolio
  const [isGhostOpen, setIsGhostOpen] = useState(false);
  const [ghostPortfolio, setGhostPortfolio] = useState<GhostPortfolio | null>(null);
  const [ghostHistoryData, setGhostHistoryData] = useState<{ date: string; value: number }[]>([]);

  // Historical Exchange Rates
  const [historicalRates, setHistoricalRates] = useState<Record<string, { EUR: number, USD: number }>>({});

  // Load a specific portfolio by ID
  const loadPortfolioData = useCallback(async (portfolioId: string) => {
    setIsLoading(true);
    let initialAssets: Asset[] = [];
    let initialHistory: any[] = [];
    let initialDeposits: Deposit[] = [];
    let initialTransactions: Transaction[] = [];
    let initialRates: Record<string, { EUR: number, USD: number }> = {};
    let initialExchangeRates = { EUR: 25.0, USD: 23.0 };

    try {
      const res = await fetch(`/api/storage?portfolio=${portfolioId}`, { cache: "no-store" });
      if (res.ok) {
        const { data } = await res.json();
        if (data) {
          if (data.assets) {
            // Slučujeme uložené share/weight hodnoty s šablonou aktiv
            initialAssets = data.assets.map((saved: any) => {
              const template = DEFAULT_ASSETS_TEMPLATE.find(t => t.ticker === saved.ticker);
              return {
                ...(template || { name: saved.ticker, currency: "EUR", price: 0, dailyChange: 0, dailyChangePercent: 0, actualWeight: 0 }),
                ticker: saved.ticker,
                shares: saved.shares ?? 0,
                targetWeight: saved.targetWeight ?? 0,
              };
            });
          }
          if (data.history) initialHistory = data.history;
          if (data.deposits) initialDeposits = data.deposits;
          if (data.transactions) initialTransactions = data.transactions;
          if (data.historicalRates) {
            // Migration for older scalar records to objects
            initialRates = {};
            for (const [date, val] of Object.entries(data.historicalRates)) {
              if (typeof val === "number") {
                initialRates[date] = { EUR: val, USD: 23.0 }; // Fallback USD rate if old history
              } else {
                initialRates[date] = val as any;
              }
            }
          }
          if (data.exchangeRates) {
            initialExchangeRates = data.exchangeRates;
          } else if (data.exchangeRate) { // Fallback pro predeslou verzi
            initialExchangeRates = { EUR: data.exchangeRate, USD: 23.0 };
          }
        }
      }
    } catch (err) {
      console.warn("Portfolio load failed, using localStorage fallback", err);
      // Fallback to per-portfolio localStorage keys
      const pfx = portfolioId;
      try {
        const savedAssetsStr = localStorage.getItem(lsKey(pfx, "assets"));
        if (savedAssetsStr) initialAssets = JSON.parse(savedAssetsStr).map((a: any) => ({ ...a, price: 0, dailyChange: 0, dailyChangePercent: 0, actualWeight: 0, currency: a.currency || "EUR", name: a.name || a.ticker }));
        const savedHistoryStr = localStorage.getItem(lsKey(pfx, "history"));
        if (savedHistoryStr) initialHistory = JSON.parse(savedHistoryStr);
        const savedDepositsStr = localStorage.getItem(lsKey(pfx, "deposits"));
        if (savedDepositsStr) initialDeposits = JSON.parse(savedDepositsStr);
        const savedTxStr = localStorage.getItem(lsKey(pfx, "transactions"));
        if (savedTxStr) initialTransactions = JSON.parse(savedTxStr);
        const savedGhostStr = localStorage.getItem(lsKey(pfx, GHOST_SUFFIX));
        if (savedGhostStr) setGhostPortfolio(JSON.parse(savedGhostStr));
      } catch { /* ignore */ }
    }

    setExchangeRates(initialExchangeRates);
    setHistoryData(initialHistory);
    setDeposits(initialDeposits);
    setTransactions(initialTransactions);
    setHistoricalRates(initialRates);
    setAssets(initialAssets);
    setGhostHistoryData([]);

    await fetchLivePrices(initialAssets);
    await backfillHistory(initialAssets, initialHistory, initialDeposits, initialTransactions, initialRates);
  }, []);

  // Initial load: fetch portfolio list, then load active portfolio
  useEffect(() => {
    async function init() {
      try {
        const res = await fetch("/api/storage?action=list", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          setPortfolioList(data.portfolios || []);
          const activeId = data.activePortfolioId;
          if (activeId) {
            setActivePortfolioId(activeId);
            await loadPortfolioData(activeId);
          } else {
            // No portfolios — show welcome screen
            setIsLoading(false);
          }
        }
      } catch (err) {
        console.error("Failed to load portfolio list", err);
        setIsLoading(false);
      }
    }
    init();
  }, [loadPortfolioData]);

  // Helper: Ulož celý stav do JSON souboru i localStorage (atomicky)
  const saveToStorage = async (
    assetList: Asset[],
    historyList: any[],
    depositList: Deposit[],
    transactionList: Transaction[],
    currentExRates: { EUR: number, USD: number },
    hRates: Record<string, { EUR: number, USD: number }>
  ) => {
    if (!activePortfolioId) return;
    const snapshot = {
      assets: assetList.map(a => ({ ticker: a.ticker, shares: a.shares, targetWeight: a.targetWeight })),
      history: historyList,
      deposits: depositList,
      transactions: transactionList,
      historicalRates: hRates,
      exchangeRates: currentExRates,
      lastSaved: new Date().toISOString(),
    };
    // Per-portfolio localStorage
    const pfx = activePortfolioId;
    localStorage.setItem(lsKey(pfx, "assets"), JSON.stringify(snapshot.assets));
    localStorage.setItem(lsKey(pfx, "history"), JSON.stringify(historyList));
    localStorage.setItem(lsKey(pfx, "deposits"), JSON.stringify(depositList));
    localStorage.setItem(lsKey(pfx, "transactions"), JSON.stringify(transactionList));
    // Fire-and-forget write to portfolio JSON file
    fetch(`/api/storage?portfolio=${activePortfolioId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(snapshot),
    }).catch(err => console.warn("Portfolio storage write failed", err));
  };

  // ── Portfolio Management Handlers ──
  const handleSwitchPortfolio = async (id: string) => {
    if (id === activePortfolioId) return;
    setActivePortfolioId(id);
    setGhostPortfolio(null);
    setGhostHistoryData([]);
    // Persist active selection
    fetch("/api/storage?action=setActive", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    }).catch(() => { });
    await loadPortfolioData(id);
  };

  const handleCreatePortfolio = async (name: string) => {
    try {
      const res = await fetch("/api/storage?action=create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        const { id, name: savedName } = await res.json();
        setPortfolioList(prev => [...prev, { id, name: savedName, createdAt: new Date().toISOString() }]);
        setIsCreatePortfolioOpen(false);
        await handleSwitchPortfolio(id);
      }
    } catch (err) {
      console.error("Create portfolio failed", err);
    }
  };

  const handleRenamePortfolio = async (name: string) => {
    if (!renameTarget) return;
    try {
      await fetch("/api/storage?action=rename", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: renameTarget.id, name }),
      });
      setPortfolioList(prev => prev.map(p => p.id === renameTarget.id ? { ...p, name } : p));
      setRenameTarget(null);
    } catch (err) {
      console.error("Rename failed", err);
    }
  };

  const handleDeletePortfolio = async () => {
    if (!deleteConfirm) return;
    try {
      const res = await fetch("/api/storage?action=delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deleteConfirm.id }),
      });
      if (res.ok) {
        const { activePortfolioId: newActiveId } = await res.json();
        setPortfolioList(prev => prev.filter(p => p.id !== deleteConfirm.id));
        setDeleteConfirm(null);
        if (newActiveId) {
          await handleSwitchPortfolio(newActiveId);
        } else {
          setActivePortfolioId(null);
          setAssets([]);
          setHistoryData([]);
          setDeposits([]);
          setTransactions([]);
          setIsLoading(false);
        }
      }
    } catch (err) {
      console.error("Delete failed", err);
    }
  };

  // Retroaktivní doplnění mezier v historii z Yahoo Finance historical API
  const backfillHistory = async (currentAssets: Asset[], existingHistory: any[], currentDeposits: Deposit[], currentTransactions: Transaction[], currentRates: Record<string, { EUR: number, USD: number }>) => {
    if (currentAssets.length === 0 && currentTransactions.length === 0) return;

    // Získáme set všech tickerů, se kterými se kdy obchodovalo
    const tickersSet = new Set<string>();
    currentAssets.forEach(a => tickersSet.add(a.ticker));
    currentTransactions.forEach(t => tickersSet.add(t.ticker));
    const tickers = Array.from(tickersSet);

    if (tickers.length === 0) return;

    if (tickers.length === 0) return;

    // Zjistíme datum, od kterého stahovat.
    // Pokud máme existingHistory, stahujeme od posledního data.
    // Pokud existingHistory nemáme, stahujeme od první transakce nebo vkladu, jinak defaultně před měsícem.
    let startDateToFetch = new Date();
    startDateToFetch.setMonth(startDateToFetch.getMonth() - 1); // default 1 month ago

    if (existingHistory.length > 0) {
      const lastEntry = existingHistory[existingHistory.length - 1];
      startDateToFetch = parseCzDate(lastEntry.date);
      startDateToFetch.setDate(startDateToFetch.getDate() + 1); // start tomorrow from last entry
    } else {
      let earliestTime = Date.now();
      currentTransactions.forEach(t => {
        const d = parseCzDate(t.date).getTime();
        if (d < earliestTime) earliestTime = d;
      });
      currentDeposits.forEach(d => {
        const dt = parseCzDate(d.date).getTime();
        if (dt < earliestTime) earliestTime = dt;
      });
      startDateToFetch = new Date(earliestTime);
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(23, 59, 59, 999);

    if (startDateToFetch > yesterday) return;

    try {
      const startDateStr = startDateToFetch.toISOString().split('T')[0];

      // Fetch asset prices + S&P 500 benchmark + EURCZK historic exchange rates
      const tickersWithBenchmark = [...tickers, "^GSPC", "EURCZK=X", "USDCZK=X"];
      const res = await fetch("/api/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tickers: tickersWithBenchmark, startDate: startDateStr }),
      });

      if (!res.ok) return;
      const { days } = await res.json();
      if (!days || days.length === 0) return;

      const tickerCurrency: Record<string, "EUR" | "USD"> = {};
      currentAssets.forEach(a => tickerCurrency[a.ticker] = (a.currency as "EUR" | "USD") || "EUR");

      const newEntries = days
        .filter((day: any) => !existingHistory.find(h => h.date === day.date))
        .map((day: any) => {
          const dayDate = parseCzDate(day.date).getTime();
          const prices = day.prices as Record<string, number>;
          const benchmarkValue = prices["^GSPC"] || undefined;
          const exchangeRateForDay = {
            EUR: prices["EURCZK=X"] || currentRates[day.date]?.EUR || exchangeRates.EUR,
            USD: prices["USDCZK=X"] || currentRates[day.date]?.USD || exchangeRates.USD
          };

          let totalValueCzk = 0;
          let totalValueForeign = 0;

          // Výpočet portfolia k tomuto DNI - extrapolací transakcí
          Object.entries(prices).forEach(([ticker, price]) => {
            if (ticker === "^GSPC" || ticker === "EURCZK=X" || ticker === "USDCZK=X") return;
            // Spočítáme kusy, které jsme drželi k tomuto dni
            let sharesOnDay = 0;
            currentTransactions.forEach(t => {
              if (parseCzDate(t.date).getTime() <= dayDate && t.ticker === ticker) {
                sharesOnDay += t.type === "BUY" ? t.shares : -t.shares;
              }
            });
            sharesOnDay = Math.max(0, sharesOnDay);

            const isUsd = tickerCurrency[ticker] === "USD";
            const rate = isUsd ? exchangeRateForDay.USD : exchangeRateForDay.EUR;

            totalValueCzk += price * sharesOnDay * rate;
            totalValueForeign += price * sharesOnDay;
          });

          // Ukládáme historický měnový kurz z tohoto dne
          currentRates[day.date] = exchangeRateForDay;

          // Započteme investovanou částku VŽDY pouze z transakcí formou Cash-Flow a to přepočtem za historické ceny v době transakce
          const totalInvestedCzk = calculateNetInvestmentCzk(currentTransactions, dayDate, currentRates, exchangeRates);

          return {
            date: day.date,
            totalValueEur: totalValueForeign, // Used mostly as legacy UI value
            totalValueCzk,
            totalInvestedCzk,
            benchmarkValue,
          };
        });

      if (newEntries.length === 0) return;

      const updatedHistory = [...existingHistory, ...newEntries].sort((a, b) => {
        const pa = parseCzDate(a.date).getTime();
        const pb = parseCzDate(b.date).getTime();
        return pa - pb;
      });

      // Update states
      setHistoricalRates({ ...currentRates });
      setHistoryData(updatedHistory);
      saveToStorage(currentAssets, updatedHistory, currentDeposits, currentTransactions, exchangeRates, currentRates);

    } catch (err) {
      console.warn("History backfill failed", err);
    }
  };

  // Fetch aktuálních cen přes náš proxy API endpoint
  const fetchLivePrices = async (currentAssets: Asset[], overrideProvider?: string) => {
    if (currentAssets.length === 0) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const tickers = currentAssets.map(a => a.ticker);
      const res = await fetch("/api/prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tickers, provider: overrideProvider || dataProvider })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `Chyba serveru: ${res.status}`);
      }

      if (data.exchangeRates) {
        setExchangeRates(data.exchangeRates);
        localStorage.setItem(activePortfolioId ? lsKey(activePortfolioId, "exrates") : "investice_exrates", JSON.stringify(data.exchangeRates));
      }

      let fetchErrors: string[] = [];

      if (data.prices) {
        setAssets(prev => prev.map(asset => {
          const liveData = data.prices.find((p: any) => p && p.ticker === asset.ticker);
          if (liveData) {
            const yahooName = liveData.shortName || liveData.longName || '';
            return {
              ...asset,
              name: yahooName || asset.name,
              price: liveData.price || asset.price,
              currency: liveData.currency || asset.currency || 'EUR',
              dailyChange: liveData.dailyChange || 0,
              dailyChangePercent: liveData.dailyChangePercent || 0,
            };
          } else {
            fetchErrors.push(asset.ticker);
          }
          return asset;
        }));
      }

      setLastUpdated(new Date());

      if (fetchErrors.length > 0) {
        setError(`Některé tickery se nepodařilo načíst: ${fetchErrors.join(', ')}. Zkontrolujte prosím jejich správnost.`);
      }

    } catch (err: any) {
      console.error("Nepodařilo se načíst ceny", err);
      setError(err.message || "Nepodařilo se připojit k serveru pro aktualizaci cen.");
    } finally {
      setIsLoading(false);
    }
  };

  // Uložení denního snapshotu do historie (po úspěšném fetchi a přepočtu hodnot)
  useEffect(() => {
    if (isLoading || assets.length === 0 || assets.some(a => a.price === 0)) return;

    const totalValueForeign = assets.reduce((acc, a) => acc + a.price * a.shares, 0);
    const totalValueCzk = assets.reduce((acc, a) => acc + a.price * a.shares * (a.currency === "USD" ? exchangeRates.USD : exchangeRates.EUR), 0);

    const todayTs = new Date().getTime();
    const todayStr = new Date().toLocaleDateString("cs-CZ");

    // Save today's exchange rate into historicalRates array
    const newRates = { ...historicalRates };
    newRates[todayStr] = exchangeRates;

    // Započteme investovanou částku jako Cash-Flow z transakcí (dnešním kurzem pro nově zachycené)
    const totalInvestedCzk = calculateNetInvestmentCzk(transactions, todayTs, newRates, exchangeRates);

    if (totalValueForeign === 0) return;

    setHistoricalRates(newRates);

    setHistoryData(prev => {
      const lastEntry = prev.length > 0 ? prev[prev.length - 1] : null;
      let newHistory = [...prev];

      if (lastEntry && lastEntry.date === todayStr) {
        // Update dneška, pokud už máme snapshot
        newHistory[newHistory.length - 1] = { date: todayStr, totalValueEur: totalValueForeign, totalValueCzk, totalInvestedCzk };
      } else {
        // Nový den
        newHistory.push({ date: todayStr, totalValueEur: totalValueForeign, totalValueCzk, totalInvestedCzk });
      }

      if (activePortfolioId) {
        localStorage.setItem(lsKey(activePortfolioId, "history"), JSON.stringify(newHistory));
        localStorage.setItem(lsKey(activePortfolioId, "rates"), JSON.stringify(newRates));
      }

      // Asynchronně uložit do JSON souboru
      if (activePortfolioId) {
        fetch(`/api/storage?portfolio=${activePortfolioId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            assets: assets.map(a => ({ ticker: a.ticker, shares: a.shares, targetWeight: a.targetWeight })),
            history: newHistory,
            deposits,
            transactions,
            historicalRates: newRates,
            exchangeRates,
            lastSaved: new Date().toISOString(),
          }),
        }).catch(err => console.warn("File storage write failed", err));
      }

      return newHistory;
    });
  }, [assets, exchangeRates, transactions, isLoading, deposits]);

  // Přegenerovaný refresh caller
  const handleRefresh = () => {
    fetchLivePrices(assets);
  };

  // Auto-refresh interval
  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(() => {
      fetchLivePrices(assets);
    }, currentRefreshIntervalMs);
    return () => clearInterval(id);
  }, [autoRefresh, assets, currentRefreshIntervalMs]);

  // Uložení aktuálního počtu kusů z UI a persistování
  const handleSharesChange = (ticker: string, newShares: number) => {
    const updated = assets.map(a => a.ticker === ticker ? { ...a, shares: newShares } : a);
    setAssets(updated);
    saveToStorage(updated, historyData, deposits, transactions, exchangeRates, historicalRates);
  };

  const handleTargetWeightChange = (ticker: string, newWeight: number) => {
    const updated = assets.map(a => a.ticker === ticker ? { ...a, targetWeight: newWeight } : a);
    setAssets(updated);
    saveToStorage(updated, historyData, deposits, transactions, exchangeRates, historicalRates);
  };

  const handleDeleteTicker = (ticker: string, reason: string) => {
    const updated = assets.filter(a => a.ticker !== ticker);
    setAssets(updated);
    // V této metodě explicitně voláme api/storage s reason, ale raději nejdříve uložime standardně everything except deletion log
    saveToStorage(updated, historyData, deposits, transactions, exchangeRates, historicalRates);
    const toSave = updated.map(a => ({ ticker: a.ticker, shares: a.shares, targetWeight: a.targetWeight }));

    // Append deletion to JSON log
    fetch("/api/storage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        assets: toSave,
        history: historyData,
        deposits,
        transactions,
        historicalRates,
        exchangeRates,
        lastSaved: new Date().toISOString(),
        deletionEvent: { ticker, reason, date: new Date().toLocaleDateString("cs-CZ"), time: new Date().toLocaleTimeString("cs-CZ") },
      }),
    }).catch(err => console.warn("Storage write failed after deletion", err));
  };

  const handleAddTicker = (ticker: string, targetWeight: number) => {
    // Prevent duplicate tickers
    if (assets.some(a => a.ticker.toUpperCase() === ticker.toUpperCase())) {
      fetchLivePrices(assets); // Just refresh existing
      return;
    }

    const newAsset: Asset = {
      ticker,
      name: "Nový Ticker",
      price: 0,
      currency: "EUR",
      shares: 0,
      targetWeight,
      actualWeight: 0,
      dailyChange: 0,
      dailyChangePercent: 0,
    };

    const updated = [...assets, newAsset];
    setAssets(updated);
    saveToStorage(updated, historyData, deposits, transactions, exchangeRates, historicalRates);

    // Rovnou zkusit načíst jeho cenu
    fetchLivePrices(updated);
  };

  const handleAddDeposit = (amountCzk: number, note: string, date: string) => {
    const newDeposit: Deposit = {
      id: generateId(),
      date,
      amountCzk,
      note
    };
    const updated = [...deposits, newDeposit];
    setDeposits(updated);

    // Clear history and force backfill since new historical deposits affect the baseline curve
    setHistoryData([]);
    saveToStorage(assets, [], updated, transactions, exchangeRates, historicalRates);
    backfillHistory(assets, [], updated, transactions, historicalRates);
  };

  const handleDeleteDeposit = (id: string) => {
    const updated = deposits.filter(d => d.id !== id);
    setDeposits(updated);
    if (activePortfolioId) localStorage.setItem(lsKey(activePortfolioId, "deposits"), JSON.stringify(updated));
    saveToStorage(assets, historyData, updated, transactions, exchangeRates, historicalRates);
  };

  const handleAddTransaction = (tx: Omit<Transaction, "id">) => {
    // 1. Update asset shares
    const updatedAssets = assets.map(a => {
      if (a.ticker === tx.ticker) {
        let newShares = a.shares + (tx.type === "BUY" ? tx.shares : -tx.shares);
        // Fix floating point precision errors
        if (Math.abs(newShares) < 1e-8) newShares = 0;
        else newShares = parseFloat(newShares.toFixed(8));

        return {
          ...a,
          shares: Math.max(0, newShares)
        };
      }
      return a;
    });
    setAssets(updatedAssets);

    // 2. Add transaction
    const newTx: Transaction = {
      ...tx,
      id: generateId(),
    };
    const updatedTx = [...transactions, newTx];
    setTransactions(updatedTx);
    if (activePortfolioId) localStorage.setItem(lsKey(activePortfolioId, "transactions"), JSON.stringify(updatedTx));

    // Clear history so that it gets recalculated taking into account the new past transaction
    setHistoryData([]);

    // 3. Persist new assets state with empty history to force backfill on reload
    saveToStorage(updatedAssets, [], deposits, updatedTx, exchangeRates, historicalRates);

    // Asynchronously trigger backfill for instantaneous UI update without reload
    backfillHistory(updatedAssets, [], deposits, updatedTx, historicalRates).catch(err => {
      console.warn("Backfill after add-transaction failed (will retry on reload):", err);
    });
  };

  const handleDeleteTransaction = (id: string) => {
    const txToDelete = transactions.find(t => t.id === id);
    if (!txToDelete) return;

    // 1. Revert asset shares
    const updatedAssets = assets.map(a => {
      if (a.ticker === txToDelete.ticker) {
        let newShares = a.shares + (txToDelete.type === "BUY" ? -txToDelete.shares : txToDelete.shares);
        // Fix floating point precision errors
        if (Math.abs(newShares) < 1e-8) newShares = 0;
        else newShares = parseFloat(newShares.toFixed(8));

        return {
          ...a,
          shares: Math.max(0, newShares)
        };
      }
      return a;
    });
    setAssets(updatedAssets);

    // 2. Remove transaction
    const updatedTx = transactions.filter(t => t.id !== id);
    setTransactions(updatedTx);
    if (activePortfolioId) localStorage.setItem(lsKey(activePortfolioId, "transactions"), JSON.stringify(updatedTx));

    // Clear history so that it gets recalculated taking into account the deleted transaction
    setHistoryData([]);

    // 3. Persist new assets state with empty history to force backfill on reload
    saveToStorage(updatedAssets, [], deposits, updatedTx, exchangeRates, historicalRates);

    // Asynchronously trigger backfill for instantaneous UI update without reload
    backfillHistory(updatedAssets, [], deposits, updatedTx, historicalRates).catch(err => {
      console.warn("Backfill after delete-transaction failed (will retry on reload):", err);
    });
  };

  const handleMoveAsset = (ticker: string, direction: 'up' | 'down') => {
    const index = assets.findIndex(a => a.ticker === ticker);
    if (index === -1) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === assets.length - 1) return;

    const newAssets = [...assets];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    [newAssets[index], newAssets[swapIndex]] = [newAssets[swapIndex], newAssets[index]];

    setAssets(newAssets);
    saveToStorage(newAssets, historyData, deposits, transactions, exchangeRates, historicalRates);
  };

  const handleExportCsv = async () => {
    try {
      const res = await fetch("/api/agent?format=csv");
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `investice_export_${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("CSV export error:", err);
    }
  };

  // Backup: download current portfolio as JSON
  const handleBackupDownload = async () => {
    if (!activePortfolioId) return;
    try {
      const res = await fetch(`/api/storage?portfolio=${activePortfolioId}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Backup fetch failed");
      const { data } = await res.json();
      const portfolioName = portfolioList.find(p => p.id === activePortfolioId)?.name || activePortfolioId;
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${portfolioName.replace(/[^a-zA-Z0-9-_ěščřžýáíéúůďťňĚŠČŘŽÝÁÍÉÚŮĎŤŇ ]/g, "_")}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Backup download error:", err);
    }
  };

  // Restore: upload JSON file into current portfolio
  const handleRestoreUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activePortfolioId) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (!data.assets || !Array.isArray(data.assets)) {
          alert(language === "cs" ? "Neplatný soubor zálohy — chybí pole 'assets'." : "Invalid backup file — missing 'assets' array.");
          return;
        }
        if (!confirm(language === "cs"
          ? `Opravdu chcete obnovit portfolio ze zálohy? Aktuální data budou přepsána.`
          : `Are you sure you want to restore from backup? Current data will be overwritten.`
        )) return;
        await fetch(`/api/storage?portfolio=${activePortfolioId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        await loadPortfolioData(activePortfolioId);
      } catch (err) {
        console.error("Restore error:", err);
        alert(language === "cs" ? "Chyba při obnově zálohy." : "Error restoring backup.");
      }
    };
    reader.readAsText(file);
    // Reset input so user can re-upload the same file
    e.target.value = "";
  };

  // Ghost portfolio is loaded inside loadPortfolioData; this useEffect re-triggers fetch
  useEffect(() => {
    if (activePortfolioId) {
      const ghostStr = localStorage.getItem(lsKey(activePortfolioId, GHOST_SUFFIX));
      if (ghostStr) {
        try { setGhostPortfolio(JSON.parse(ghostStr)); } catch { /* ignore */ }
      }
    }
  }, [activePortfolioId]);

  // Fetch ghost portfolio historical data whenever ghost changes + history data available
  const fetchGhostHistory = async (ghost: GhostPortfolio, history: any[]) => {
    if (!ghost || ghost.allocations.length === 0 || history.length === 0) {
      setGhostHistoryData([]);
      return;
    }

    // Parse dates helper
    const parseCzDate = (s: string) => {
      const parts = s.replace(/\s/g, '').split('.');
      return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    };

    const firstDate = parseCzDate(history[0].date);
    const lastDate = parseCzDate(history[history.length - 1].date);

    try {
      const res = await fetch("/api/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tickers: ghost.allocations.map(a => a.ticker),
          startDate: new Date(firstDate.getTime() - 86400000).toISOString().split('T')[0],
          endDate: new Date(lastDate.getTime() + 86400000).toISOString().split('T')[0],
          provider: dataProvider
        }),
      });

      if (!res.ok) return;
      const { days } = await res.json();
      if (!days || days.length === 0) return;

      // Get starting total portfolio value from history
      const startingValue = history[0].totalValueCzk || 0;
      if (startingValue <= 0) return;

      // Calculate fractional shares for each ghost allocation at day 0 prices
      const firstDayPrices = days[0]?.prices as Record<string, number> || {};
      const ghostShares: Record<string, number> = {};

      const dayZeroRate = historicalRates[firstDate.toLocaleDateString("cs-CZ")] || historicalRates[days[0].date] || exchangeRates;

      for (const alloc of ghost.allocations) {
        const price = firstDayPrices[alloc.ticker];
        if (price && price > 0) {
          ghostShares[alloc.ticker] = (startingValue * alloc.weight) / (price * dayZeroRate.EUR); // Assuming ghost tickers trace EUR baseline
        }
      }

      // For each day, calculate ghost portfolio value
      const ghostHistory = days.map((day: any) => {
        const prices = day.prices as Record<string, number>;
        let totalGhostEur = 0;
        for (const [ticker, shares] of Object.entries(ghostShares)) {
          totalGhostEur += (prices[ticker] || 0) * shares;
        }

        const dayRate = historicalRates[day.date] || exchangeRates;

        return {
          date: day.date,
          value: totalGhostEur * dayRate.EUR,
        };
      }).filter((g: any) => g.value > 0);

      setGhostHistoryData(ghostHistory);
    } catch (err) {
      console.warn("Ghost history fetch failed", err);
    }
  };

  // Auto-fetch ghost history when ghost or history changes
  useEffect(() => {
    if (ghostPortfolio && historyData.length > 0) {
      fetchGhostHistory(ghostPortfolio, historyData);
    }
  }, [ghostPortfolio, historyData.length]);

  const handleSaveGhost = (portfolio: GhostPortfolio) => {
    setGhostPortfolio(portfolio);
    if (activePortfolioId) localStorage.setItem(lsKey(activePortfolioId, GHOST_SUFFIX), JSON.stringify(portfolio));
  };

  const handleClearGhost = () => {
    setGhostPortfolio(null);
    setGhostHistoryData([]);
    if (activePortfolioId) localStorage.removeItem(lsKey(activePortfolioId, GHOST_SUFFIX));
  };

  const handleShutdown = async () => {
    if (confirm("Opravdu chcete aplikaci ukončit? Server bude zastaven.")) {
      try {
        await fetch("/api/shutdown", { method: "POST" });
        alert("Server je ukončen. Můžete zavřít okno (nebo se pokusit o reload pro kontrolu).");
      } catch (err) {
        console.error("Shutdown failed", err);
      }
    }
  };

  // Matematika a statistiky (Stateless Kalkulováno z Assets)
  const totalValueForeign = assets.reduce((acc, asset) => acc + asset.price * asset.shares, 0);
  const totalValueCzk = assets.reduce((acc, asset) => acc + asset.price * asset.shares * (asset.currency === "USD" ? exchangeRates.USD : exchangeRates.EUR), 0);
  const totalDailyChangeCzk = assets.reduce((acc, asset) => acc + asset.dailyChange * asset.shares * (asset.currency === "USD" ? exchangeRates.USD : exchangeRates.EUR), 0);
  const dailyChangePercent = totalValueCzk > 0 ? (totalDailyChangeCzk / (totalValueCzk - totalDailyChangeCzk)) * 100 : 0;

  // Váhy
  const updatedAssets = assets.map(a => ({
    ...a,
    actualWeight: totalValueCzk > 0 ? (a.price * a.shares * (a.currency === "USD" ? exchangeRates.USD : exchangeRates.EUR)) / totalValueCzk : 0
  }));

  // Rebalance Logika z PLAN.md (vyhodnocování ±% tolerančního pásma podle uživatelského nastavení)
  const rebalanceActions = updatedAssets
    .filter(a => Math.abs(a.targetWeight - a.actualWeight) > rebalanceTolerance)
    .map(a => {
      const diffWeight = a.targetWeight - a.actualWeight;
      return {
        ticker: a.ticker,
        action: diffWeight > 0 ? "KOUPIT" as const : "PRODAT" as const,
        amountCzk: Math.abs(diffWeight) * totalValueCzk
      };
    });

  const hasRebalanceNeeds = rebalanceActions.length > 0;

  // Welcome screen when no portfolios exist
  if (portfolioList.length === 0 && !isLoading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-violet-100 dark:bg-violet-900/50">
            <Briefcase size={40} className="text-violet-600 dark:text-violet-400" />
          </div>
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">{language === "cs" ? "Vítejte v Investio" : "Welcome to Investio"}</h2>
            <p className="text-zinc-500 dark:text-zinc-400 max-w-md">
              {language === "cs"
                ? "Začněte vytvořením prvního portfolia. Každé portfolio má vlastní aktiva, historii a nastavení."
                : "Start by creating your first portfolio. Each portfolio has its own assets, history and settings."}
            </p>
          </div>
          <button
            onClick={() => setIsCreatePortfolioOpen(true)}
            className="px-6 py-3 text-sm font-semibold text-white rounded-xl bg-violet-600 hover:bg-violet-700 transition-colors shadow-lg shadow-violet-500/25"
          >
            {language === "cs" ? "Vytvořit portfolio" : "Create Portfolio"}
          </button>
          <CreatePortfolioModal
            isOpen={isCreatePortfolioOpen}
            onClose={() => setIsCreatePortfolioOpen(false)}
            onConfirm={handleCreatePortfolio}
            mode="create"
          />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      dataProvider={dataProvider}
      onProviderChange={(p) => {
        setDataProvider(p);
        localStorage.setItem("investice_provider", p);
        if (assets.length > 0) {
          fetchLivePrices(assets, p);
          // Optionally, we could backfillHistory again, but that's heavy.
          // Just fetching live prices is enough for a smooth user experience.
        }
      }}
      rebalanceTolerance={rebalanceTolerance}
      onToleranceChange={(t) => {
        setRebalanceTolerance(t);
        localStorage.setItem("investice_tolerance", t.toString());
      }}
      mainCurrency={mainCurrency}
      onMainCurrencyChange={(c) => {
        setMainCurrency(c);
        localStorage.setItem("investice_main_currency", c);
      }}
      secondaryCurrency={secondaryCurrency}
      onSecondaryCurrencyChange={(c) => {
        setSecondaryCurrency(c);
        localStorage.setItem("investice_secondary_currency", c);
      }}
    >
      {/* Hidden file input for restore */}
      <input ref={restoreInputRef} type="file" accept=".json" onChange={handleRestoreUpload} className="hidden" />

      <div className="flex flex-col gap-2 mb-8 relative">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 truncate">
              {t("dash.title")}
            </h1>
            {portfolioList.length > 0 && (
              <PortfolioSwitcher
                portfolios={portfolioList}
                activePortfolioId={activePortfolioId}
                onSwitch={handleSwitchPortfolio}
                onCreate={() => setIsCreatePortfolioOpen(true)}
                onRename={(id, name) => setRenameTarget({ id, name })}
                onDelete={(id, name) => setDeleteConfirm({ id, name })}
              />
            )}
          </div>

          {/* Menu Toggle Button */}
          <div className="flex items-center gap-2 shrink-0">
            {isLoading && <span className="text-[10px] font-medium bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-full animate-pulse">{t("state.loading")}</span>}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors shadow-sm"
              title="Menu"
            >
              <MoreHorizontal size={20} />
            </button>
          </div>

          {/* Actions Container - Absolute dropdown on all screens */}
          <div className={cn(
            isMobileMenuOpen
              ? "absolute z-[60] top-full right-0 mt-3 p-4 rounded-2xl border border-white/20 dark:border-zinc-700/50 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl shadow-2xl flex flex-col items-stretch gap-2 w-64"
              : "hidden"
          )}>

            <button
              onClick={() => { setIsSmartInvestOpen(true); setIsMobileMenuOpen(false); }}
              className="flex items-center justify-start gap-3 px-4 py-2.5 rounded-xl bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 text-sm font-semibold hover:bg-violet-100 dark:hover:bg-violet-900/50 transition-colors border border-violet-200 dark:border-violet-800 whitespace-nowrap"
            >
              <Brain size={14} />
              <span>{t("dash.btn.smartInvest")}</span>
            </button>
            <button
              onClick={() => { setIsDepositsOpen(true); setIsMobileMenuOpen(false); }}
              className="flex items-center justify-start gap-3 px-4 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-sm font-semibold hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors border border-emerald-200 dark:border-emerald-800 whitespace-nowrap"
            >
              <Wallet size={14} />
              <span>{t("dash.btn.deposits")}</span>
            </button>
            <button
              onClick={() => { setIsTransactionsOpen(true); setIsMobileMenuOpen(false); }}
              className="flex items-center justify-start gap-3 px-4 py-2.5 rounded-xl bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-sm font-semibold hover:bg-orange-100 dark:hover:bg-orange-900/50 transition-colors border border-orange-200 dark:border-orange-800 whitespace-nowrap"
            >
              <Receipt size={14} />
              <span>{t("dash.btn.transactions")}</span>
            </button>
            <button
              onClick={() => { setIsGhostOpen(true); setIsMobileMenuOpen(false); }}
              className={cn(
                "flex items-center justify-start gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors border whitespace-nowrap",
                ghostPortfolio
                  ? "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/50"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-700"
              )}
            >
              <Ghost size={14} />
              <span>{ghostPortfolio ? ghostPortfolio.name : "Ghost"}</span>
            </button>

            {/* Divider */}
            <div className="w-full h-px bg-zinc-200 dark:bg-zinc-700/50 my-1"></div>

            <button
              onClick={() => { handleExportCsv(); setIsMobileMenuOpen(false); }}
              className="flex items-center justify-start gap-3 px-4 py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 text-sm font-semibold hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors border border-transparent whitespace-nowrap"
              title={t("dash.btn.export")}
            >
              <Download size={14} />
              <span>{t("dash.btn.export")}</span>
            </button>

            {/* Backup & Restore */}
            <button
              onClick={() => { handleBackupDownload(); setIsMobileMenuOpen(false); }}
              className="flex items-center justify-start gap-3 px-4 py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 text-sm font-semibold hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors border border-transparent whitespace-nowrap"
            >
              <HardDriveDownload size={14} />
              <span>{language === "cs" ? "Záloha portfolia" : "Backup Portfolio"}</span>
            </button>
            <button
              onClick={() => { restoreInputRef.current?.click(); setIsMobileMenuOpen(false); }}
              className="flex items-center justify-start gap-3 px-4 py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 text-sm font-semibold hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors border border-transparent whitespace-nowrap"
            >
              <HardDriveUpload size={14} />
              <span>{language === "cs" ? "Obnovit ze zálohy" : "Restore Backup"}</span>
            </button>

            {/* Divider */}
            <div className="w-full h-px bg-zinc-200 dark:bg-zinc-700/50 my-1"></div>

            <button
              onClick={() => { handleShutdown(); setIsMobileMenuOpen(false); }}
              className="flex items-center justify-start gap-3 px-4 py-2.5 rounded-xl bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm font-semibold hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors border border-transparent whitespace-nowrap"
              title={t("dash.btn.shutdown")}
            >
              <Power size={14} />
              <span>{t("dash.btn.shutdown")}</span>
            </button>
          </div>
        </div>
        <p className="text-zinc-500 dark:text-zinc-400">
          {t("dash.subtitle")}
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 p-4 shadow-sm flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-500 mt-0.5">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-red-900 dark:text-red-500">
              Problém se synchronizací dat
            </h3>
            <p className="text-sm text-red-800 dark:text-red-400/80 mt-1">
              {error}
            </p>
          </div>
        </div>
      )}

      <RebalanceAlert
        isVisible={hasRebalanceNeeds}
        actions={rebalanceActions}
        exchangeRate={exchangeRates.EUR}
        mainCurrency={mainCurrency}
        secondaryCurrency={secondaryCurrency}
        exchangeRatesObj={exchangeRates}
      />

      <BentoSummary
        totalValue={totalValueForeign}
        totalValueCzk={totalValueCzk}
        dailyChange={totalDailyChangeCzk}
        dailyChangePercent={dailyChangePercent}
        isPositive={totalDailyChangeCzk >= 0}
        exchangeRates={exchangeRates}
        lastUpdated={lastUpdated}
        onRefresh={() => fetchLivePrices(assets)}
        autoRefresh={autoRefresh}
        onAutoRefreshToggle={() => setAutoRefresh(!autoRefresh)}
        refreshIntervalMs={currentRefreshIntervalMs}
        mainCurrency={mainCurrency}
        secondaryCurrency={secondaryCurrency}
      />

      <AssetsList
        assets={updatedAssets}
        onSharesChange={(ticker, shares) => {
          setAssets(prev => prev.map(a => a.ticker === ticker ? { ...a, shares } : a));
        }}
        exchangeRates={exchangeRates}
        onAddTickerClick={() => { setIsAddTickerOpen(true); setIsMobileMenuOpen(false); }}
        onDeleteTickerClick={(ticker) => { setPendingDeleteTicker(ticker); setIsMobileMenuOpen(false); }}
        onTargetWeightChange={(ticker, newWeight) => {
          setAssets(prev => prev.map(a => a.ticker === ticker ? { ...a, targetWeight: newWeight } : a));
        }}
        onMoveAsset={(ticker, direction) => {
          const currentIdx = assets.findIndex(a => a.ticker === ticker);
          if (currentIdx < 0) return;
          const newAssets = [...assets];
          if (direction === 'up' && currentIdx > 0) {
            [newAssets[currentIdx - 1], newAssets[currentIdx]] = [newAssets[currentIdx], newAssets[currentIdx - 1]];
          } else if (direction === 'down' && currentIdx < assets.length - 1) {
            [newAssets[currentIdx + 1], newAssets[currentIdx]] = [newAssets[currentIdx], newAssets[currentIdx + 1]];
          }
          setAssets(newAssets);
        }}
        mainCurrency={mainCurrency}
      />

      {historyData.length > 0 && (
        <HistoryChart
          data={historyData}
          ghostData={ghostHistoryData.length > 0 ? ghostHistoryData : undefined}
          ghostName={ghostPortfolio?.name}
          mainCurrency={mainCurrency}
          exchangeRates={exchangeRates}
        />
      )}

      {historyData.length >= 2 && (
        <AnnualReport
          historyData={historyData}
          deposits={deposits}
          transactions={transactions}
          assets={assets}
          mainCurrency={mainCurrency}
          secondaryCurrency={secondaryCurrency}
          exchangeRates={exchangeRates}
        />
      )}

      <CorrelationHeatmap assets={updatedAssets.filter(a => a.shares > 0)} historyData={historyData} />

      <AddTickerModal
        isOpen={isAddTickerOpen}
        onClose={() => setIsAddTickerOpen(false)}
        onAdd={handleAddTicker}
      />

      <DepositsModal
        isOpen={isDepositsOpen}
        onClose={() => setIsDepositsOpen(false)}
        deposits={deposits}
        onAddDeposit={handleAddDeposit}
        onDeleteDeposit={handleDeleteDeposit}
      />

      <DeleteTickerModal
        ticker={pendingDeleteTicker}
        onClose={() => setPendingDeleteTicker(null)}
        onConfirm={(ticker, reason) => {
          handleDeleteTicker(ticker, reason);
          setPendingDeleteTicker(null);
        }}
      />

      <SmartInvestModal
        isOpen={isSmartInvestOpen}
        onClose={() => setIsSmartInvestOpen(false)}
        assets={updatedAssets}
        exchangeRate={exchangeRates.EUR}
      />

      <TransactionModal
        isOpen={isTransactionsOpen}
        onClose={() => setIsTransactionsOpen(false)}
        transactions={transactions}
        onAddTransaction={handleAddTransaction}
        onDeleteTransaction={handleDeleteTransaction}
        availableTickers={assets.map(a => a.ticker)}
      />

      <GhostPortfolioModal
        isOpen={isGhostOpen}
        onClose={() => setIsGhostOpen(false)}
        ghostPortfolio={ghostPortfolio}
        onSave={handleSaveGhost}
        onClear={handleClearGhost}
      />

      {/* Portfolio Management Modals */}
      <CreatePortfolioModal
        isOpen={isCreatePortfolioOpen}
        onClose={() => setIsCreatePortfolioOpen(false)}
        onConfirm={handleCreatePortfolio}
        mode="create"
      />

      <CreatePortfolioModal
        isOpen={!!renameTarget}
        onClose={() => setRenameTarget(null)}
        onConfirm={handleRenamePortfolio}
        mode="rename"
        currentName={renameTarget?.name || ""}
      />

      {/* Delete Portfolio Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4" onClick={() => setDeleteConfirm(null)}>
          <div
            className="w-full max-w-sm p-6 rounded-2xl shadow-2xl bg-white/80 dark:bg-zinc-900/90 backdrop-blur-xl border border-white/30 dark:border-white/10"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold mb-2">{language === "cs" ? "Smazat portfolio?" : "Delete portfolio?"}</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-5">
              {language === "cs"
                ? `Portfolio "${deleteConfirm.name}" bude trvale smazáno včetně všech dat.`
                : `Portfolio "${deleteConfirm.name}" will be permanently deleted with all its data.`}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2.5 text-sm font-medium rounded-lg border border-zinc-300 dark:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
              >
                {language === "cs" ? "Zrušit" : "Cancel"}
              </button>
              <button
                onClick={handleDeletePortfolio}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white rounded-lg bg-red-600 hover:bg-red-700 transition-colors"
              >
                {language === "cs" ? "Smazat" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

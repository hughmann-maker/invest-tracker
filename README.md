# 📈 Invest Tracker

A self-hosted investment portfolio tracker built with Next.js. Track your ETFs and stocks, monitor asset allocation, get rebalancing alerts, and view historical performance — all without any cloud dependency.

Designed to run on a **Raspberry Pi** or any local machine as your personal, private investment dashboard.

## ✨ Features

### Portfolio Dashboard
- **Real-time prices** — live quotes from Yahoo Finance (free, no API key needed)
- **Multi-currency support** — assets in EUR, USD with automatic CZK conversion via live exchange rates
- **Daily change tracking** — see absolute and percentage changes for each asset
- **Bento-style summary cards** — total portfolio value, daily P&L, invested vs. current value

### Asset Management
- **Add Ticker** — add any stock/ETF by its Yahoo Finance ticker symbol (e.g. `SXR8.DE`, `AAPL`)
- **Set Target Weights** — define target allocation percentages for each asset
- **Edit Shares** — manually set the number of shares you hold
- **Delete Ticker** — remove assets with a reason log for audit trail

### Rebalancing
- **Rebalance Alerts** — visual warnings when actual allocation deviates from targets (configurable tolerance)
- **Smart Invest Calculator** — input an amount you want to invest and get exact share counts to buy for optimal rebalancing

### Transaction History
- **Buy/Sell Transactions** — log every trade with date, shares, price per share, and currency
- **Automatic share count updates** — shares are adjusted when you add transactions
- **Delete transactions** — remove incorrect entries (shares are reverted)

### Portfolio History & Charts
- **Historical value chart** — portfolio value over time in selected currency with interactive Recharts graph
- **Invested vs. Market Value** — see how your portfolio grows compared to what you put in
- **S&P 500 Benchmark** — compare your performance against the market
- **Automatic backfill** — historical data is fetched from Yahoo Finance API for gap-filling

### Deposits
- **Track cash deposits** — log money added to your brokerage account with dates and notes
- **Delete deposits** — remove incorrect entries

### Ghost Portfolio
- **What-if analysis** — create a hypothetical portfolio to compare against your real one
- **Side-by-side chart comparison** — see how a different allocation would have performed

### Annual Report
- **Yearly performance summary** — returns, net invested, and growth metrics per year

### Correlation Heatmap
- **Asset correlation matrix** — visual heatmap showing how your assets move relative to each other

### Multi-Portfolio Support
- **Multiple portfolios** — create, switch between, rename, and delete separate portfolios
- **Independent data** — each portfolio has its own assets, transactions, history, and deposits

### Internationalization
- **Czech & English UI** — switch between languages in the app header

### Auto-Refresh
- **Configurable auto-refresh** — prices update automatically at provider-specific intervals
- **Manual refresh button** — force an immediate price update

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [Next.js 16](https://nextjs.org/) (App Router) |
| UI | [React 19](https://react.dev/), [Tailwind CSS 4](https://tailwindcss.com/) |
| Charts | [Recharts 3](https://recharts.org/) |
| Icons | [Lucide React](https://lucide.dev/) |
| Animations | [Framer Motion](https://www.framer.com/motion/) |
| Market Data | [yahoo-finance2](https://github.com/gadicc/node-yahoo-finance2) |
| Storage | JSON files (no database required) |
| Testing | [Vitest](https://vitest.dev/) + [Playwright](https://playwright.dev/) |

---

## 🚀 Installation

### Prerequisites

- **Node.js 18+** (recommended: 20 LTS)
- **npm** (comes with Node.js)

### Quick Start (Windows)

```bash
git clone https://github.com/hughmann-maker/invest-tracker.git
cd invest-tracker
start.bat
```

### Quick Start (Linux / Raspberry Pi / macOS)

```bash
git clone https://github.com/hughmann-maker/invest-tracker.git
cd invest-tracker
chmod +x start.sh
./start.sh
```

The app will be available at **http://localhost:3000**

> **Raspberry Pi note:** The `start.sh` script runs a production build by default for better performance on ARM devices. Use `./start.sh --dev` for development mode with hot reload.

### Manual Setup

```bash
# Install dependencies
npm install

# Development mode (hot reload)
npm run dev

# Production mode (recommended for Raspberry Pi)
npm run build
npm start
```

### Updating

```bash
cd invest-tracker
git pull
npm install
# Then restart the server
```

---

## 📁 Data Storage

All portfolio data is stored locally in JSON files:

```
invest-tracker/
├── portfolios.json          # Portfolio list & active selection
└── portfolios/
    └── <portfolio-id>.json  # Assets, transactions, history per portfolio
```

Data is also mirrored to `localStorage` in the browser as a fallback.

> **No data leaves your machine** — there are no cloud syncs, no accounts, no analytics. The only external calls are to Yahoo Finance for price quotes and exchange rates.

---

## ⚙️ Configuration

### Data Providers

The app supports multiple market data providers. Default is Yahoo Finance (no API key needed):

| Provider | API Key Required | Refresh Interval |
|----------|-----------------|-------------------|
| Yahoo Finance | ❌ No | 60 seconds |
| Finnhub | ✅ Yes | 60 seconds |
| Tiingo | ✅ Yes | 5 minutes |
| ECB | ❌ No | 1 hour (exchange rates only) |

To use Finnhub or Tiingo, copy `.env.example` to `.env` and add your API key.

### Rebalance Tolerance

Configurable in the UI — default is 5%. When any asset's actual weight deviates from its target by more than this threshold, a rebalance alert is shown.

---

## 🖥 UI Guide

### Header Bar
| Element | Description |
|---------|-------------|
| Portfolio Switcher | Dropdown to switch between portfolios, create new, rename, or delete |
| 🔄 Refresh | Manually refresh all prices |
| Language Toggle | Switch between Czech (CZ) and English (EN) |

### Action Buttons
| Button | Icon | Description |
|--------|------|-------------|
| **Add Ticker** | `+` | Add a new stock/ETF by ticker symbol and set its target weight |
| **Smart Invest** | 🧠 | Calculate optimal share purchases for a given investment amount |
| **Transactions** | 📋 | View, add, and delete buy/sell transactions |
| **Deposits** | 💰 | Track cash deposits to your brokerage |
| **Export** | ⬇️ | Export portfolio data |
| **Ghost Portfolio** | 👻 | Create a hypothetical portfolio for comparison |
| **Auto-Refresh** | ⚡ | Toggle automatic price refresh on/off |

### Asset Table
- Click the **shares count** to edit the number of shares
- Click the **target %** to change target allocation
- Click the **🗑 delete icon** to remove an asset (with reason prompt)

### Charts Section
- **Portfolio Value** — historical value chart with zoom and time range selection
- **Correlation Heatmap** — asset correlation visualization
- **Annual Report** — yearly performance breakdown

---

## 🍓 Raspberry Pi Setup

### Install Node.js on Raspberry Pi

```bash
# Using NodeSource (recommended)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version  # Should show v20.x.x
npm --version
```

### Run as a Service (Optional)

To have the tracker start automatically on boot:

```bash
sudo nano /etc/systemd/system/invest-tracker.service
```

Paste:
```ini
[Unit]
Description=Invest Tracker
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/invest-tracker
ExecStart=/usr/bin/npm start
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

Then:
```bash
# Build first
cd /home/pi/invest-tracker && npm run build

# Enable and start
sudo systemctl enable invest-tracker
sudo systemctl start invest-tracker
```

The app will be accessible at `http://<raspberry-pi-ip>:3000` from any device on your network.

---

## 📄 License

This project is for personal use.

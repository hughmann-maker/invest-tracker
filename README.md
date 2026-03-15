# 📈 Invest Tracker

A self-hosted investment portfolio tracker built with Next.js. Track your ETFs and stocks, monitor asset allocation, get rebalancing alerts, and view historical performance — all without any cloud dependency.

Designed to run on a **Raspberry Pi** or any local machine as your personal, private investment dashboard.

## ✨ Features

### Portfolio Dashboard
- **Real-time prices** — live quotes from Yahoo Finance (free, no API key needed)
- **Multi-currency support** — assets in EUR, USD with automatic CZK conversion via live exchange rates
- **Daily change tracking** — see absolute and percentage changes for each asset
- **Bento-style summary cards** — total portfolio value, daily P&L, invested vs. current value

### Market Overview (Přehled trhu)
- **Live spot prices** — view live data for Gold, Silver, Platinum, and Palladium directly from Yahoo Finance commodity futures.
- **Sparkline charts** — 30-day mini charts for each asset to quickly gauge trends.
- **Auto-conversion** — converts commodity USD values into your preferred main currency.

### Asset Management
- **Add Ticker** — add any stock/ETF by its Yahoo Finance ticker symbol (e.g. `SXR8.DE`, `AAPL`)
- **Set Target Weights** — define target allocation percentages for each asset
- **Edit Shares** — manually set the number of shares you hold (optional)
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
- **Individual asset breakdown** — toggle individual portfolio assets to see their separate historical lines within the main chart.
- **Invested vs. Market Value** — see how your portfolio grows compared to what you put in
- **S&P 500 Benchmark** — compare your performance against the market
- **Automatic backfill & resilient dataset** — historical data is fetched from Yahoo Finance. Automatically repairs zeros from weekends and backfills missing asset-level data retroactively for older history records.

### Deposits
- **Track cash deposits** — log money added to your brokerage account with dates and notes
- **Delete deposits** — remove incorrect entries

### Ghost Portfolio (untested)
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
| Finnhub (disabled) | ✅ Yes | 60 seconds |
| Tiingo (disabled) | ✅ Yes | 5 minutes |
| ECB | ❌ No | 1 hour (exchange rates only) |

To use Finnhub or Tiingo, copy `.env.example` to `.env` and add your API key.

### Rebalance Tolerance

Configurable in the UI — default is 5%. When any asset's actual weight deviates from its target by more than this threshold, a rebalance alert is shown.

---

## 🖥 UI Guide

### Header Bar
| Element | Description |
|---------|-------------|
| **Investio** logo | App name with version badge |
| Portfolio Switcher | Dropdown to switch between portfolios, create new, rename, or delete |
| � Privacy Mode | Blur sensitive financial values |
| 🌙/☀️ Theme | Toggle dark/light mode |
| Language Toggle | Switch between Czech (CZ) and English (EN) |
| ⚙️ Settings | Data provider, currencies, rebalance tolerance |

### Action Buttons (⋯ Menu)
| Button | Description |
|--------|-------------|
| **🧠 Smart Invest** | Calculate optimal share purchases for a given investment amount |
| **💰 Deposits** | Track cash deposits to your brokerage |
| **📋 Transactions** | View, add, and delete buy/sell transactions |
| **👻 Ghost Portfolio** | Create a hypothetical portfolio for comparison |
| **⬇️ Export CSV** | Export portfolio data as CSV |
| **📥 Backup Portfolio** | Download current portfolio as JSON file |
| **📤 Restore Backup** | Upload a previously saved JSON backup |
| **⏻ Shutdown** | Stop the server (for Raspberry Pi) |

### Asset Table
- Click **+ Add Ticker** to add a new stock/ETF by ticker symbol
- Click the **shares count** to edit the number of shares
- Click the **target %** to change target allocation
- Click the **🗑 delete icon** to remove an asset (with reason prompt)
- Use **↑↓ arrows** to reorder assets

### Charts Section
- **Portfolio Value** — historical value chart with zoom and time range selection
- **Correlation Heatmap** — asset correlation visualization
- **Annual Report** — yearly performance breakdown

---

## 🤖 AI Agent API

The app exposes a read-only API endpoint for AI agents and external tools to retrieve portfolio data.

### `GET /api/agent`

Returns all portfolios with live prices, transactions, deposits, history, correlation matrix, and exchange rates.

**Example:**
```bash
curl http://localhost:3000/api/agent | jq
```

### `GET /api/agent?format=csv`

Returns the same data as a downloadable CSV file.

**Response Schema (JSON):**
```json
{
  "portfolios": [
    {
      "id": "portfolio-id",
      "name": "Portfolio Name",
      "portfolio": {
        "assets": [
          {
            "ticker": "SXR8.DE",
            "name": "iShares Core S&P 500",
            "shares": 10,
            "price": 550.20,
            "currency": "EUR",
            "valueCzk": 137550.00,
            "valueEur": 5502.00,
            "targetWeight": 0.70,
            "actualWeight": 0.68,
            "dailyChangePercent": 0.45
          }
        ],
        "totalValueCzk": 202279.50,
        "totalValueEur": 8091.18,
        "totalInvestedCzk": 180000.00,
        "profitCzk": 22279.50,
        "profitPercent": 12.38
      },
      "transactions": [...],
      "deposits": [...],
      "history": [...],
      "correlationMatrix": { "tickers": [...], "correlations": [[...]] },
      "exchangeRates": { "EUR": 25.0, "USD": 23.0 }
    }
  ],
  "meta": {
    "totalPortfolios": 1,
    "generatedAt": "2026-03-04T15:00:00.000Z",
    "apiVersion": "2.0"
  }
}
```

> **Note:** The API is read-only and does not require authentication. It is intended for local network use only.

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

## 📋 Changelog

### v0.3.0 (2026-03-15)
**New Features:**
- 🌍 **Market Overview (Přehled trhu)** — new global view beside portfolios tracking Gold, Silver, Platinum, and Palladium with 30-day sparklines.
- 📈 **Asset History Lines** — added toggle to "Show Assets" inside the History Chart, tracking the individual value of held assets over time.

**Bug Fixes:**
- 🐛 **Historical zero-drops** — completely solved an issue where weekend/holiday logic would create "0 CZK" portfolio snapshot days.
- ♻️ **Retroactive asset history** — the app now automatically looks through old `portfolios.json` histories and computes the missing asset breakdown from old closing prices. 

### v0.2.0-beta (2026-03-04)
**New Features:**
- 📥 **Backup portfolio** — download current portfolio data as a JSON file
- 📤 **Restore from backup** — upload a previously saved JSON backup to restore portfolio data
- 🤖 **AI Agent API docs** — documented the `/api/agent` endpoint in README
- 🏷️ **Version number** — app version displayed in the navbar (`v0.2.0-beta`)

**Bug Fixes:**
- 🐛 Fixed mobile menu being hidden/clipped on narrow screens — title now truncates properly
- � Fixed transactions not saving on mobile when tapping the + button (iOS Safari / mobile browsers)

**Improvements:**
- 📖 Comprehensive README with full feature docs, UI guide, and Raspberry Pi setup
- 📋 Added changelog section for tracking updates

### v0.1.0 (2026-03-03)
- 🎉 Initial release
- Portfolio dashboard with real-time Yahoo Finance prices
- Multi-portfolio support (create, switch, rename, delete)
- Transaction tracking (buy/sell with automatic share updates)
- Deposit tracking
- Historical value chart with S&P 500 benchmark
- Smart Invest rebalancing calculator
- Ghost portfolio what-if analysis
- Annual report & correlation heatmap
- CSV export & AI Agent API
- Czech & English localization
- Privacy mode & dark/light theme
- `start.bat` (Windows) and `start.sh` (Raspberry Pi/Linux)

---

## 📄 License

This project is licensed under the [GNU Affero General Public License v3.0](LICENSE).


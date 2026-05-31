const fs = require('fs');
const path = require('path');

// Helper to parse dates in DD. MM. YYYY format
function parseDate(dateStr) {
    const parts = dateStr.split('.');
    if (parts.length !== 3) return new Date(0);
    const day = parseInt(parts[0].trim(), 10);
    const month = parseInt(parts[1].trim(), 10) - 1;
    const year = parseInt(parts[2].trim(), 10);
    return new Date(year, month, day);
}

const portfoliosDir = path.join(__dirname, '..', 'portfolios');
if (!fs.existsSync(portfoliosDir)) {
    console.error('Složka portfolios nebyla nalezena. Spusťte tento skript v kořenovém adresáři invest-tracker.');
    process.exit(1);
}

const files = fs.readdirSync(portfoliosDir).filter(f => f.endsWith('.json'));
console.log('Nalezené soubory portfolií:', files);

files.forEach(file => {
    const filePath = path.join(portfoliosDir, file);
    let rawData;
    try {
        rawData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch (e) {
        console.error(`Chyba při čtení souboru ${file}:`, e);
        return;
    }

    if (!rawData.history || !rawData.historicalRates) {
        console.log(`Soubor ${file} neobsahuje historii nebo kurzy. Přeskakuji.`);
        return;
    }

    const history = rawData.history;
    const rates = rawData.historicalRates;
    const assets = rawData.assets || [];

    // Find all dates that have fallback rates (exactly 25 EUR and 23 USD)
    const fallbackDates = Object.keys(rates).filter(date => {
        const rate = rates[date];
        return rate.EUR === 25 && rate.USD === 23;
    });

    if (fallbackDates.length === 0) {
        console.log(`Soubor ${file} nemá žádné chybné dny s kurzem 25/23. Historie je čistá!`);
        return;
    }

    console.log(`\nOpravuji soubor ${file}:`);
    console.log('Nalezené chybné dny s kurzy 25/23:', fallbackDates);

    // Map assets by ticker to quickly find their currencies
    const assetCurrencyMap = {};
    assets.forEach(a => {
        assetCurrencyMap[a.ticker] = a.currency || 'EUR'; // Default to EUR if not specified
    });
    // Fallback logic for common assets in default portfolio if not in assets list
    const fallbackCurrencies = {
        'GLDA.DE': 'EUR',
        'HNDX.DE': 'EUR',
        'AUM5.DE': 'EUR',
        '4COP.DE': 'EUR',
        'AAPL': 'USD'
    };

    function getCurrency(ticker) {
        return assetCurrencyMap[ticker] || fallbackCurrencies[ticker] || 'EUR';
    }

    fallbackDates.forEach(dateStr => {
        const targetTime = parseDate(dateStr).getTime();

        // Find closest valid date before
        let beforeEntry = null;
        let beforeTime = -Infinity;
        // Find closest valid date after
        let afterEntry = null;
        let afterTime = Infinity;

        // Iterate through all history entries to find valid boundary entries
        history.forEach(h => {
            const hRate = rates[h.date];
            if (!hRate || (hRate.EUR === 25 && hRate.USD === 23)) {
                return; // Skip fallback days
            }

            const hTime = parseDate(h.date).getTime();
            if (hTime < targetTime && hTime > beforeTime) {
                beforeTime = hTime;
                beforeEntry = h;
            }
            if (hTime > targetTime && hTime < afterTime) {
                afterTime = hTime;
                afterEntry = h;
            }
        });

        if (!beforeEntry || !afterEntry) {
            console.warn(`Pro den ${dateStr} nelze najít platné okrajové dny pro interpolaci. Používám přímý fallback.`);
            // Fallback to closest valid rate
            const fallbackRate = beforeEntry ? rates[beforeEntry.date] : (afterEntry ? rates[afterEntry.date] : { EUR: 24.3, USD: 20.7 });
            rates[dateStr] = { ...fallbackRate };
            return;
        }

        const rateBefore = rates[beforeEntry.date];
        const rateAfter = rates[afterEntry.date];

        // Linear interpolation based on timestamps
        const totalSpan = afterTime - beforeTime;
        const targetSpan = targetTime - beforeTime;
        const ratio = targetSpan / totalSpan;

        const newEur = rateBefore.EUR + (rateAfter.EUR - rateBefore.EUR) * ratio;
        const newUsd = rateBefore.USD + (rateAfter.USD - rateBefore.USD) * ratio;

        console.log(`Interpoluji ${dateStr}:`);
        console.log(`  Před: ${beforeEntry.date} (EUR: ${rateBefore.EUR.toFixed(3)}, USD: ${rateBefore.USD.toFixed(3)})`);
        console.log(`  Po:   ${afterEntry.date} (EUR: ${rateAfter.EUR.toFixed(3)}, USD: ${rateAfter.USD.toFixed(3)})`);
        console.log(`  Nový kurz -> EUR: ${newEur.toFixed(4)} CZK | USD: ${newUsd.toFixed(4)} CZK`);

        // Update rate entry
        rates[dateStr] = {
            EUR: parseFloat(newEur.toFixed(4)),
            USD: parseFloat(newUsd.toFixed(4))
        };

        // Update history values for this date
        const historyEntry = history.find(h => h.date === dateStr);
        if (historyEntry) {
            const oldRate = { EUR: 25, USD: 23 };
            const newRate = rates[dateStr];

            if (historyEntry.assetsCzk) {
                let correctedTotal = 0;
                Object.keys(historyEntry.assetsCzk).forEach(ticker => {
                    const currency = getCurrency(ticker);
                    const oldAssetVal = historyEntry.assetsCzk[ticker];
                    let correctedVal = oldAssetVal;

                    if (currency === 'EUR') {
                        correctedVal = oldAssetVal * (newRate.EUR / oldRate.EUR);
                    } else if (currency === 'USD') {
                        correctedVal = oldAssetVal * (newRate.USD / oldRate.USD);
                    }

                    historyEntry.assetsCzk[ticker] = parseFloat(correctedVal.toFixed(4));
                    correctedTotal += correctedVal;
                });

                historyEntry.totalValueCzk = parseFloat(correctedTotal.toFixed(4));
                historyEntry.totalValueEur = parseFloat((correctedTotal / newRate.EUR).toFixed(4));
                console.log(`  Opravená hodnota -> CZK: ${historyEntry.totalValueCzk.toFixed(2)} (původně: ${historyEntry.totalValueCzk})`);
            }
        }
    });

    // Write back modified JSON file
    fs.writeFileSync(filePath, JSON.stringify(rawData, null, 2), 'utf-8');
    console.log(`Soubor ${file} úspěšně opraven a uložen.`);
});

console.log('\nHotovo! Všechny soubory v portfolios byly vyčištěny.');

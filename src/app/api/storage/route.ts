import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const PORTFOLIOS_DIR = path.join(process.cwd(), "portfolios");
const MANIFEST_PATH = path.join(process.cwd(), "portfolios.json");
const LEGACY_DATA_PATH = path.join(process.cwd(), "investice_data.json");

// ── Helpers ──

interface PortfolioEntry {
    id: string;
    name: string;
    createdAt: string;
}

interface Manifest {
    portfolios: PortfolioEntry[];
    activePortfolioId: string | null;
}

function slugify(name: string): string {
    return name
        .toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        || "portfolio";
}

async function ensurePortfoliosDir() {
    try { await fs.mkdir(PORTFOLIOS_DIR, { recursive: true }); } catch { /* exists */ }
}

async function readManifest(): Promise<Manifest> {
    try {
        const content = await fs.readFile(MANIFEST_PATH, "utf-8");
        return JSON.parse(content);
    } catch {
        return { portfolios: [], activePortfolioId: null };
    }
}

async function writeManifest(manifest: Manifest) {
    await fs.writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2), "utf-8");
}

function getPortfolioPath(id: string): string {
    // Sanitize to prevent path traversal
    const safe = id.replace(/[^a-z0-9-]/gi, "");
    return path.join(PORTFOLIOS_DIR, `${safe}.json`);
}

// ── Auto-migrate legacy investice_data.json ──
async function migrateIfNeeded(): Promise<Manifest> {
    let manifest = await readManifest();

    // Already migrated?
    if (manifest.portfolios.length > 0) return manifest;

    await ensurePortfoliosDir();

    // Check for legacy file
    try {
        const legacyContent = await fs.readFile(LEGACY_DATA_PATH, "utf-8");
        const legacyData = JSON.parse(legacyContent);

        const id = "hlavni-portfolio";
        const portfolioPath = getPortfolioPath(id);
        await fs.writeFile(portfolioPath, JSON.stringify(legacyData, null, 2), "utf-8");

        manifest = {
            portfolios: [{ id, name: "Hlavní portfolio", createdAt: new Date().toISOString() }],
            activePortfolioId: id,
        };
        await writeManifest(manifest);
        return manifest;
    } catch {
        // No legacy file — fresh install
        manifest = { portfolios: [], activePortfolioId: null };
        await writeManifest(manifest);
        return manifest;
    }
}

// ── GET — Read portfolio data or list ──
export async function GET(request: NextRequest) {
    try {
        const action = request.nextUrl.searchParams.get("action");
        const manifest = await migrateIfNeeded();

        // List all portfolios
        if (action === "list") {
            return NextResponse.json({ ok: true, ...manifest });
        }

        // Read specific portfolio data
        const portfolioId = request.nextUrl.searchParams.get("portfolio") || manifest.activePortfolioId;
        if (!portfolioId) {
            return NextResponse.json({ ok: true, data: null, portfolios: manifest.portfolios });
        }

        const filePath = getPortfolioPath(portfolioId);
        try {
            const fileContents = await fs.readFile(filePath, "utf-8");
            const data = JSON.parse(fileContents);
            return NextResponse.json({ ok: true, data, activePortfolioId: portfolioId });
        } catch (err: any) {
            if (err.code === "ENOENT") {
                return NextResponse.json({ ok: true, data: null });
            }
            throw err;
        }
    } catch (err) {
        console.error("Storage GET error:", err);
        return NextResponse.json({ ok: false, error: "Failed to read storage" }, { status: 500 });
    }
}

// ── POST — Write data or manage portfolios ──
export async function POST(request: NextRequest) {
    try {
        const action = request.nextUrl.searchParams.get("action");
        const manifest = await migrateIfNeeded();

        // ── Create new portfolio ──
        if (action === "create") {
            const { name } = await request.json();
            if (!name || !name.trim()) {
                return NextResponse.json({ ok: false, error: "Portfolio name is required" }, { status: 400 });
            }

            await ensurePortfoliosDir();
            let id = slugify(name.trim());

            // Ensure unique ID
            const existingIds = manifest.portfolios.map(p => p.id);
            let finalId = id;
            let counter = 1;
            while (existingIds.includes(finalId)) {
                finalId = `${id}-${counter++}`;
            }

            const emptyData = {
                assets: [],
                history: [],
                deposits: [],
                transactions: [],
                exchangeRates: { EUR: 25.0, USD: 23.0 },
                historicalRates: {},
                settings: {},
                lastSaved: new Date().toISOString(),
            };

            await fs.writeFile(getPortfolioPath(finalId), JSON.stringify(emptyData, null, 2), "utf-8");
            manifest.portfolios.push({ id: finalId, name: name.trim(), createdAt: new Date().toISOString() });
            manifest.activePortfolioId = finalId;
            await writeManifest(manifest);

            return NextResponse.json({ ok: true, id: finalId, name: name.trim() });
        }

        // ── Rename portfolio ──
        if (action === "rename") {
            const { id, name } = await request.json();
            const entry = manifest.portfolios.find(p => p.id === id);
            if (!entry) {
                return NextResponse.json({ ok: false, error: "Portfolio not found" }, { status: 404 });
            }
            entry.name = name.trim();
            await writeManifest(manifest);
            return NextResponse.json({ ok: true });
        }

        // ── Delete portfolio ──
        if (action === "delete") {
            const { id } = await request.json();
            const idx = manifest.portfolios.findIndex(p => p.id === id);
            if (idx === -1) {
                return NextResponse.json({ ok: false, error: "Portfolio not found" }, { status: 404 });
            }

            // Delete file
            try { await fs.unlink(getPortfolioPath(id)); } catch { /* file may not exist */ }

            manifest.portfolios.splice(idx, 1);

            // Switch active to first remaining or null
            if (manifest.activePortfolioId === id) {
                manifest.activePortfolioId = manifest.portfolios[0]?.id || null;
            }
            await writeManifest(manifest);

            return NextResponse.json({ ok: true, activePortfolioId: manifest.activePortfolioId });
        }

        // ── Set active portfolio ──
        if (action === "setActive") {
            const { id } = await request.json();
            if (!manifest.portfolios.find(p => p.id === id)) {
                return NextResponse.json({ ok: false, error: "Portfolio not found" }, { status: 404 });
            }
            manifest.activePortfolioId = id;
            await writeManifest(manifest);
            return NextResponse.json({ ok: true });
        }

        // ── Default: save portfolio data ──
        const portfolioId = request.nextUrl.searchParams.get("portfolio") || manifest.activePortfolioId;
        if (!portfolioId) {
            return NextResponse.json({ ok: false, error: "No portfolio specified" }, { status: 400 });
        }

        await ensurePortfoliosDir();
        const body = await request.json();
        const json = JSON.stringify(body, null, 2);
        await fs.writeFile(getPortfolioPath(portfolioId), json, "utf-8");
        return NextResponse.json({ ok: true });

    } catch (err: any) {
        console.error("Storage POST error:", err);
        return NextResponse.json({ ok: false, error: "Failed to write storage" }, { status: 500 });
    }
}

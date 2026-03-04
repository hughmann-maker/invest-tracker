import { NextResponse } from "next/server";

export async function POST() {
    // In a development environment, this allows the user to shut down the server
    if (process.env.NODE_ENV === "development") {
        setTimeout(() => {
            console.log("Ukoncuji server na zadost uzivatele...");
            process.exit(0);
        }, 1000);
        return NextResponse.json({ message: "Server se vypíná..." });
    }

    return NextResponse.json(
        { error: "Vypnutí je povolené pouze ve vývojovém režimu." },
        { status: 403 }
    );
}

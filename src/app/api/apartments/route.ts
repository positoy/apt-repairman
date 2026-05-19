import { listApartmentPins } from "@/lib/apartments";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const apartments = await listApartmentPins();
    return NextResponse.json({ apartments });
  } catch (error) {
    console.error("Failed to load apartment pins", error);
    return NextResponse.json({ apartments: [], error: "Failed to load apartment pins" }, { status: 500 });
  }
}

import { getApartmentDetail } from "@/lib/apartments";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

export async function GET(_request: Request, context: RouteContext) {
  const params = await context.params;
  const apartmentId = Number(params.id);

  if (!Number.isInteger(apartmentId) || apartmentId <= 0) {
    return NextResponse.json({ apartment: null, error: "Invalid apartment id" }, { status: 400 });
  }

  try {
    const apartment = await getApartmentDetail(apartmentId);

    if (!apartment) {
      return NextResponse.json({ apartment: null, error: "Apartment not found" }, { status: 404 });
    }

    return NextResponse.json({ apartment });
  } catch (error) {
    console.error("Failed to load apartment detail", error);
    return NextResponse.json({ apartment: null, error: "Failed to load apartment detail" }, { status: 500 });
  }
}

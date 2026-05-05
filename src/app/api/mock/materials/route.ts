import { NextResponse } from "next/server";
import { materialDatabase } from "@/mocks/materials";

export function GET() {
  return NextResponse.json(materialDatabase);
}

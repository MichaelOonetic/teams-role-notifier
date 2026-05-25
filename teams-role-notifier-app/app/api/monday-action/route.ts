import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "Monday action endpoint OK",
  });
}

export async function POST(req: any) {
  const body = await req.json();

  console.log("MONDAY ACTION PAYLOAD:", JSON.stringify(body, null, 2));

  return NextResponse.json({
    success: true,
    message: "Action monday reçue",
  });
}
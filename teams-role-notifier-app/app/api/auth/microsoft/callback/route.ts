import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const code = searchParams.get("code");

  console.log("Microsoft OAuth code:", code);

  return NextResponse.json({
    success: true,
    message: "Microsoft connecté avec succès",
    code,
  });
}
import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const formData = await req.formData();

  const email =
    String(formData.get("email") || "")
      .trim()
      .toLowerCase();

  if (!email) {
    return NextResponse.redirect(
      new URL("/?error=missing_email", req.url)
    );
  }

  await kv.del(
    `ms-refresh-token:${email}`
  );

  console.log(
    "MICROSOFT ACCOUNT DISCONNECTED",
    email
  );

  return NextResponse.redirect(
    new URL("/", req.url)
  );
}
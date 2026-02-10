import { NextResponse } from "next/server";

export async function GET() {
  // fetch from DB
  return NextResponse.json([
    {
      id: "1",
      title: "CBT Session",
      start: "2026-02-06T11:00:00",
      end: "2026-02-06T11:45:00",
      extendedProps: {
        patient: "John Doe",
        notes: "",
      },
    },
  ]);
}

export async function POST(req: Request) {
  const body = await req.json();
  // save appointment
  return NextResponse.json({ status: "success" });
}

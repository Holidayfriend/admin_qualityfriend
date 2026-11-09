import { NextResponse } from "next/server";
import { admin } from "../../../../../lib/auth/session";
import { prisma } from "../../../../../lib/prisma";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await admin()) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const activeMcp = body?.activeMcp === true;
  const mcpHotelId = typeof body?.mcpHotelId === "string" ? body.mcpHotelId.trim() : "";
  if (mcpHotelId.length > 128 || (activeMcp && !mcpHotelId)) return NextResponse.json({ error: activeMcp && !mcpHotelId ? "MCP_HOTEL_ID_REQUIRED" : "INVALID_FIELDS" }, { status: 400 });
  const hotel = await prisma.hotelTenant.findUnique({ where: { id }, select: { id: true } });
  if (!hotel) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  await prisma.$executeRaw`UPDATE hotel_tenants SET active_mcp = ${activeMcp}, mcp_hotel_id = ${mcpHotelId || null} WHERE id = CAST(${id} AS uuid)`;
  return NextResponse.json({ activeMcp, mcpHotelId: mcpHotelId || null });
}

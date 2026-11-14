import { NextResponse } from "next/server";
import { admin } from "../../../../../../lib/auth/session";
import { prisma } from "../../../../../../lib/prisma";

const baseUrl = () => (process.env.MCP_API_BASE_URL || "https://apis.qualityfriend.solutions").replace(/\/$/, "");

async function mcpLogin(email: string, password: string) {
  const response = await fetch(`${baseUrl()}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await response.json().catch(() => null) as { token?: string; error?: string; message?: string } | null;
  if (!response.ok || !data?.token) return { token: null, error: data?.error || data?.message || "MCP login failed." };
  return { token: data.token, error: "" };
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; userId: string }> }) {
  if (!await admin()) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  const { id, userId } = await params;
  const body = await request.json().catch(() => null);
  const email = typeof body?.mcpEmail === "string" ? body.mcpEmail.trim().toLowerCase() : "";
  const password = typeof body?.mcpPassword === "string" ? body.mcpPassword.trim() : "";
  if (!/^\S+@\S+\.\S+$/.test(email) || password.length < 8) return NextResponse.json({ error: "INVALID_FIELDS" }, { status: 400 });

  const user = await prisma.user.findFirst({
    where: { id: userId, hotelTenantId: id, isDeleted: false },
    select: { id: true, email: true, role: true, isActive: true, mcpUserId: true, mcpUserEmail: true, mcpUserPassword: true, hotelTenant: { select: { activeMcp: true, mcpHotelId: true, mcpUserEmail: true, mcpUserPassword: true, mcpUserDepartment: true } } },
  });
  if (!user) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  const previousEmail = user.mcpUserEmail || `mcp-user-${user.id}@qualityfriend.solutions`;
  const emailChanged = email !== (user.mcpUserEmail || "").toLowerCase() && email !== previousEmail;
  const passwordChanged = password !== (user.mcpUserPassword || "");
  const hotel = user.hotelTenant;

  if (user.mcpUserId && hotel.activeMcp && hotel.mcpHotelId && hotel.mcpUserEmail && hotel.mcpUserPassword && (emailChanged || passwordChanged)) {
    const service = await mcpLogin(hotel.mcpUserEmail, hotel.mcpUserPassword);
    if (!service.token) return NextResponse.json({ error: "MCP_HOTEL_LOGIN_FAILED" }, { status: 502 });
    if (emailChanged) {
      const updated = await fetch(`${baseUrl()}/users/${encodeURIComponent(user.mcpUserId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${service.token}` },
        body: JSON.stringify({ hotelId: hotel.mcpHotelId, email, role: user.role === "ADMIN" || user.role === "MANAGEMENT" ? "author" : "reader", isActive: user.isActive, ...(hotel.mcpUserDepartment ? { departmentId: hotel.mcpUserDepartment } : {}) }),
      });
      if (!updated.ok) {
        const detail = await updated.json().catch(() => null) as { error?: string; message?: string } | null;
        return NextResponse.json({ error: detail?.message || detail?.error || "MCP_EMAIL_UPDATE_FAILED" }, { status: 502 });
      }
    }
    if (passwordChanged && user.mcpUserPassword) {
      const candidates = [...new Set([user.mcpUserEmail, previousEmail, user.email].filter((value): value is string => Boolean(value)))];
      let userToken = "";
      for (const candidate of candidates) {
        const login = await mcpLogin(candidate, user.mcpUserPassword);
        if (login.token) { userToken = login.token; break; }
      }
      if (!userToken) return NextResponse.json({ error: "MCP_PASSWORD_LOGIN_FAILED" }, { status: 502 });
      const changed = await fetch(`${baseUrl()}/auth/password`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${userToken}` },
        body: JSON.stringify({ currentPassword: user.mcpUserPassword, newPassword: password }),
      });
      if (!changed.ok) {
        const detail = await changed.json().catch(() => null) as { error?: string; message?: string } | null;
        return NextResponse.json({ error: detail?.message || detail?.error || "MCP_PASSWORD_UPDATE_FAILED" }, { status: 502 });
      }
    }
  }

  await prisma.user.update({ where: { id: user.id }, data: { mcpUserEmail: email, mcpUserPassword: password } });
  return NextResponse.json({ mcpEmail: email });
}

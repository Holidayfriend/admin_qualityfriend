import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { admin } from "../../../lib/auth/session";
import { prisma } from "../../../lib/prisma";

const languages = new Set(["EN", "DE", "IT"]);

const systemRoles = [
  { key: "EMPLOYEE", nameEn: "Employee", nameDe: "Mitarbeiter", nameIt: "Dipendente" },
  { key: "TEAM_LEAD", nameEn: "Team/Department Lead", nameDe: "Team-/Abteilungsleitung", nameIt: "Responsabile team/reparto" },
  { key: "MANAGEMENT", nameEn: "Management", nameDe: "Management", nameIt: "Direzione" },
  { key: "ADMIN", nameEn: "Administrator", nameDe: "Administrator", nameIt: "Amministratore" },
];

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function optional(value: unknown) {
  const normalized = text(value);
  return normalized || null;
}

export async function POST(request: Request) {
  if (!await admin()) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
  const data = body as Record<string, unknown>;

  const companyName = text(data.company);
  const hotelName = text(data.hotelName);
  const firstName = text(data.firstName);
  const lastName = text(data.lastName);
  const email = text(data.email).toLowerCase();
  const password = text(data.password);
  const country = text(data.country);
  const city = text(data.city);
  const streetAddress = text(data.streetAddress);
  const postalCode = text(data.zip);
  const requestedLanguage = text(data.language).toUpperCase();
  const hotelLanguage = languages.has(requestedLanguage) ? requestedLanguage as "EN" | "DE" | "IT" : "EN";
  const phoneNumber = optional(data.phone);
  const vatId = optional(data.vatId);
  const province = optional(data.province);

  if (!companyName || !hotelName || !firstName || !lastName || !email || !/^\S+@\S+\.\S+$/.test(email) || password.length < 8 || !country || !city || !streetAddress || !postalCode) {
    return NextResponse.json({ error: "INVALID_FIELDS" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const contactPerson = `${firstName} ${lastName}`.trim();
  try {
    const hotel = await prisma.$transaction(async (tx) => {
      const created = await tx.hotelTenant.create({
        data: {
          id: randomUUID(),
          hotelNameEn: hotelName,
          hotelNameDe: hotelName,
          hotelNameIt: hotelName,
          email,
          hotelLanguage,
          isActive: true,
          companyName,
          streetAddress,
          postalCode,
          city,
          country,
          province,
          contactPerson,
          phoneNumber,
          vatId,
          activeMcp: false,
          subscriptionStatus: "COMPED",
          creationSource: "ADMIN",
          createdAt: new Date(),
        },
      });
      await tx.hotelRole.createMany({
        data: systemRoles.map((role) => ({ ...role, hotelTenantId: created.id, isSystem: true })),
      });
      await tx.user.create({
        data: {
          id: randomUUID(),
          hotelTenantId: created.id,
          firstName,
          lastName,
          email,
          passwordHash,
          phoneNumber,
          language: hotelLanguage,
          role: "ADMIN",
          isActive: true,
          isDeleted: false,
        },
      });
      return created;
    });
    return NextResponse.json({ id: hotel.id }, { status: 201 });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      return NextResponse.json({ error: "EMAIL_EXISTS" }, { status: 409 });
    }
    console.error("Admin hotel create failed", error);
    return NextResponse.json({ error: "CREATE_FAILED" }, { status: 500 });
  }
}

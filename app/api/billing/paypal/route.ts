import { NextResponse } from "next/server";
import { admin } from "../../../../lib/auth/session";
import { prisma } from "../../../../lib/prisma";
import { createPlan, createProduct, updatePlanPrice } from "../../../../lib/billing/paypal";

const environment = () => process.env.PAYPAL_ENVIRONMENT === "live" ? "live" : "sandbox";
const validPrice = (value: unknown) => { const number=typeof value==="string"?Number(value):NaN;return Number.isFinite(number)&&number>=1&&number<=100000?number.toFixed(2):null; };

export async function GET() {
  if (!await admin()) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  const configId = `paypal_${environment()}`;
  const config = await prisma.billingConfiguration.findUnique({ where: { id: configId } });
  const matchesEnvironment = config?.environment === environment();
  return NextResponse.json({ configured: Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET), environment: environment(), productId: matchesEnvironment ? config?.productId : null, planId: matchesEnvironment ? config?.planId : null, productName: config?.productName ?? "QualityFriend Hotel Operations", planName: config?.planName ?? "QualityFriend Monthly", price: config?.monthlyPrice.toFixed(2) ?? "39.00", currency: "EUR" });
}

export async function POST(request: Request) {
  if (!await admin()) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  const body=await request.json().catch(()=>null),action=body?.action,price=validPrice(body?.price),productName=typeof body?.productName==="string"?body.productName.trim().slice(0,127):"",planName=typeof body?.planName==="string"?body.planName.trim().slice(0,127):"";
  if (!price) return NextResponse.json({ error: "INVALID_PRICE" }, { status: 400 });
  try {
    const configId = `paypal_${environment()}`;
    const current = await prisma.billingConfiguration.findUnique({ where: { id: configId } });
    const currentEnvironment = current?.environment === environment();
    if (action === "create") {
      if (currentEnvironment && current?.planId) return NextResponse.json({ error: "PLAN_ALREADY_EXISTS" }, { status: 409 });
      const product = currentEnvironment && current?.productId ? { id: current.productId } : await createProduct(productName || "QualityFriend Hotel Operations");
      const plan = await createPlan(product.id, planName || "QualityFriend Monthly", price);
      const saved = await prisma.billingConfiguration.upsert({ where: { id: configId }, create: { id: configId, environment: environment(), productId: product.id, planId: plan.id, productName: productName || "QualityFriend Hotel Operations", planName: planName || "QualityFriend Monthly", currencyCode: "EUR", monthlyPrice: price }, update: { productId: product.id, planId: plan.id, productName: productName || "QualityFriend Hotel Operations", planName: planName || "QualityFriend Monthly", monthlyPrice: price } });
      return NextResponse.json({ success: true, productId: saved.productId, planId: saved.planId, price: saved.monthlyPrice.toFixed(2) });
    }
    if (action === "update-price") {
      if (!currentEnvironment || !current?.planId) return NextResponse.json({ error: "PLAN_NOT_CREATED" }, { status: 409 });
      await updatePlanPrice(current.planId, price);
      const saved = await prisma.billingConfiguration.update({ where: { id: configId }, data: { monthlyPrice: price } });
      return NextResponse.json({ success: true, planId: saved.planId, price: saved.monthlyPrice.toFixed(2) });
    }
    return NextResponse.json({ error: "INVALID_ACTION" }, { status: 400 });
  } catch (error) {
    console.error("PayPal billing administration failed", error);
    return NextResponse.json({ error: "PAYPAL_REQUEST_FAILED" }, { status: 502 });
  }
}

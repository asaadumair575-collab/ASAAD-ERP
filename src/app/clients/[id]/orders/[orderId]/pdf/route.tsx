import { prisma } from "@/lib/prisma";
import { getBusinessProfile } from "@/lib/businessProfile";
import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";

function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function formatCurrency(n: number) {
  return `PKR ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 10, color: "#111827" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  logo: { width: 64, height: 64, borderRadius: 6 },
  businessName: { fontSize: 16, fontWeight: 700 },
  muted: { color: "#6b7280", fontSize: 9, marginTop: 2 },
  invoiceTitle: { fontSize: 26, fontWeight: 700, textAlign: "right" },
  invoiceNumber: { color: "#6b7280", fontSize: 10, textAlign: "right", marginTop: 4 },
  section: { marginTop: 24, flexDirection: "row", justifyContent: "space-between" },
  label: { color: "#6b7280", fontSize: 8, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 },
  bold: { fontWeight: 700 },
  rightCol: { alignItems: "flex-end" },
  detailRow: { flexDirection: "row", justifyContent: "space-between", gap: 24, marginBottom: 4 },
  balanceBand: { backgroundColor: "#f9fafb", paddingHorizontal: 8, paddingVertical: 6, borderRadius: 6, flexDirection: "row", justifyContent: "space-between", gap: 24 },
  table: { marginTop: 24 },
  tableHeader: { flexDirection: "row", backgroundColor: "#111827", borderRadius: 6, paddingVertical: 8, paddingHorizontal: 10 },
  th: { color: "#ffffff", fontSize: 8, textTransform: "uppercase", letterSpacing: 0.5 },
  tr: { flexDirection: "row", paddingVertical: 8, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  td: { fontSize: 10 },
  colItem: { flex: 2 },
  colQty: { flex: 1, textAlign: "right" },
  colRate: { flex: 1, textAlign: "right" },
  colAmount: { flex: 1, textAlign: "right" },
  totals: { marginTop: 16, alignItems: "flex-end" },
  totalsBox: { width: 220 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  totalFinalRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 4, paddingTop: 6, borderTopWidth: 1, borderTopColor: "#e5e7eb" },
  notesSection: { marginTop: 24 },
  notesLabel: { color: "#6b7280", fontSize: 8, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 },
  notesText: { fontSize: 9, color: "#374151" },
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; orderId: string }> }
) {
  const { id, orderId } = await params;
  const clientId = parseInt(id, 10);
  const orderIdNum = parseInt(orderId, 10);

  const order = await prisma.order.findUnique({
    where: { id: orderIdNum },
    include: { items: true, client: true, payments: true },
  });

  if (!order || order.clientId !== clientId) {
    return new NextResponse("Not found", { status: 404 });
  }

  const profile = await getBusinessProfile();
  const invoiceNumber = `INV-${String(order.id).padStart(4, "0")}`;
  const paidSoFar = order.payments.reduce((s, p) => s + p.amount, 0);
  const balanceDue = order.saleAmount - paidSoFar;
  const subtotal = round2(order.items.reduce((s, i) => s + i.quantity * i.rate, 0));
  const taxAmount = round2((subtotal - order.discount) * (order.taxPercent / 100));
  const formattedDate = order.date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const doc = (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            {profile?.logo && <Image style={styles.logo} src={profile.logo} />}
            <View>
              <Text style={styles.businessName}>{profile?.name ?? "Your Business"}</Text>
              {profile?.address && <Text style={styles.muted}>{profile.address}</Text>}
              {profile?.phone && <Text style={styles.muted}>{profile.phone}</Text>}
            </View>
          </View>
          <View>
            <Text style={styles.invoiceTitle}>INVOICE</Text>
            <Text style={styles.invoiceNumber}># {invoiceNumber}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <View>
            <Text style={styles.label}>Bill To</Text>
            <Text style={styles.bold}>
              {order.client.name}
              {order.client.businessName ? ` (${order.client.businessName})` : ""}
            </Text>
            <Text style={styles.muted}>{order.client.city}</Text>
          </View>
          <View style={styles.rightCol}>
            <View style={styles.detailRow}>
              <Text style={{ color: "#6b7280" }}>Date:</Text>
              <Text>{formattedDate}</Text>
            </View>
            {order.paymentTerms && (
              <View style={styles.detailRow}>
                <Text style={{ color: "#6b7280" }}>Payment Terms:</Text>
                <Text>{order.paymentTerms}</Text>
              </View>
            )}
            <View style={styles.balanceBand}>
              <Text style={{ color: "#6b7280" }}>Balance Due:</Text>
              <Text style={styles.bold}>{formatCurrency(balanceDue)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.th, styles.colItem]}>Item</Text>
            <Text style={[styles.th, styles.colQty]}>Quantity</Text>
            <Text style={[styles.th, styles.colRate]}>Rate</Text>
            <Text style={[styles.th, styles.colAmount]}>Amount</Text>
          </View>
          {order.items.map((item) => (
            <View style={styles.tr} key={item.id}>
              <Text style={[styles.td, styles.colItem, styles.bold]}>{item.description}</Text>
              <Text style={[styles.td, styles.colQty]}>{item.quantity}</Text>
              <Text style={[styles.td, styles.colRate]}>{formatCurrency(item.rate)}</Text>
              <Text style={[styles.td, styles.colAmount]}>
                {formatCurrency(item.quantity * item.rate)}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.totals}>
          <View style={styles.totalsBox}>
            <View style={styles.totalRow}>
              <Text style={{ color: "#6b7280" }}>Subtotal:</Text>
              <Text>{formatCurrency(subtotal)}</Text>
            </View>
            {order.discount > 0 && (
              <View style={styles.totalRow}>
                <Text style={{ color: "#6b7280" }}>Discount:</Text>
                <Text>{formatCurrency(order.discount)}</Text>
              </View>
            )}
            <View style={styles.totalRow}>
              <Text style={{ color: "#6b7280" }}>Tax ({order.taxPercent}%):</Text>
              <Text>{formatCurrency(taxAmount)}</Text>
            </View>
            <View style={styles.totalFinalRow}>
              <Text style={{ color: "#6b7280", fontWeight: 700 }}>Total:</Text>
              <Text style={styles.bold}>{formatCurrency(order.saleAmount)}</Text>
            </View>
          </View>
        </View>

        {(order.notes || order.terms) && (
          <View style={styles.notesSection}>
            {order.notes && (
              <View style={{ marginBottom: 12 }}>
                <Text style={styles.notesLabel}>Notes:</Text>
                <Text style={styles.notesText}>{order.notes}</Text>
              </View>
            )}
            {order.terms && (
              <View>
                <Text style={styles.notesLabel}>Terms:</Text>
                <Text style={styles.notesText}>{order.terms}</Text>
              </View>
            )}
          </View>
        )}
      </Page>
    </Document>
  );

  const buffer = await renderToBuffer(doc);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${invoiceNumber}.pdf"`,
    },
  });
}

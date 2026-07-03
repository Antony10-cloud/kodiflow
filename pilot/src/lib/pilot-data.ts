export const properties = [
  { name: "Greenview Apartments", location: "Kilimani, Nairobi", units: 12, occupied: 11, rent: 330000 },
  { name: "Mugo Court", location: "Ruiru, Kiambu", units: 8, occupied: 7, rent: 112000 },
  { name: "Coastline Studios", location: "Bamburi, Mombasa", units: 6, occupied: 5, rent: 90000 },
];

export const tenants = [
  { name: "Grace Wanjiku", unit: "Greenview A4", phone: "0712 345 678", reference: "KDF-GVA4", balance: 0 },
  { name: "Brian Otieno", unit: "Greenview B2", phone: "0722 876 410", reference: "KDF-GVB2", balance: 18500 },
  { name: "Faith Njeri", unit: "Mugo Court 3", phone: "0701 442 918", reference: "KDF-MC03", balance: 7000 },
  { name: "Ali Hassan", unit: "Coastline S5", phone: "0798 330 512", reference: "KDF-CS05", balance: 8000 },
];

export const invoices = [
  { number: "INV-2026-0701", tenant: "Grace Wanjiku", kind: "Rent", due: "05 Jul 2026", amount: 30000, balance: 0, status: "Paid" },
  { number: "INV-2026-0702", tenant: "Brian Otieno", kind: "Rent", due: "05 Jul 2026", amount: 35000, balance: 18500, status: "Part paid" },
  { number: "INV-2026-0703", tenant: "Faith Njeri", kind: "Rent", due: "05 Jul 2026", amount: 16000, balance: 7000, status: "Overdue" },
  { number: "INV-2026-0704", tenant: "Ali Hassan", kind: "Water", due: "08 Jul 2026", amount: 1200, balance: 1200, status: "Pending" },
];

export const payments = [
  { receipt: "TGF4K8P2QZ", tenant: "Grace Wanjiku", reference: "KDF-GVA4", amount: 30000, time: "03 Jul, 09:41", status: "Matched" },
  { receipt: "TGF7B1L9MX", tenant: "Brian Otieno", reference: "KDF-GVB2", amount: 16500, time: "03 Jul, 10:16", status: "Matched" },
  { receipt: "TGF2N4W6RC", tenant: "Unidentified", reference: "HOUSE7", amount: 8000, time: "03 Jul, 11:02", status: "Unmatched" },
  { receipt: "TGF9D3H5KA", tenant: "Faith Njeri", reference: "KDF-MC03", amount: 9000, time: "03 Jul, 13:25", status: "Matched" },
];

export const expenses = [
  { date: "02 Jul 2026", property: "Greenview Apartments", category: "Repairs", description: "Water pump service", amount: 12500 },
  { date: "28 Jun 2026", property: "Mugo Court", category: "Security", description: "Night guard", amount: 18000 },
  { date: "25 Jun 2026", property: "Coastline Studios", category: "Utilities", description: "Common-area electricity", amount: 6400 },
];

export const money = (value: number) =>
  new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(value);

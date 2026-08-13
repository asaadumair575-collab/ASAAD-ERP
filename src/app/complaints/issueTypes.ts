export type FieldDef =
  | { key: string; label: string; type: "text"; required: boolean; placeholder?: string }
  | { key: string; label: string; type: "number"; required: boolean; placeholder?: string }
  | { key: string; label: string; type: "file"; required: boolean; accept?: string }
  | { key: string; label: string; type: "select"; required: boolean; options: { value: string; label: string }[] };

export type IssueType = {
  value: string;
  label: string;
  group: "CUSTOMER" | "INTERNAL";
  defaultTitle: string;
  fields: FieldDef[];
};

export const ISSUE_TYPES: IssueType[] = [
  // ── Customer complaints ──────────────────────────────────────
  {
    value: "BALL_QUALITY",
    label: "Ball Quality Issue",
    group: "CUSTOMER",
    defaultTitle: "Ball Quality Complaint",
    fields: [
      { key: "orderId",  label: "Order ID",                   type: "text",   required: true,  placeholder: "e.g. INV-1234" },
      { key: "photo",    label: "Photo of defective product",  type: "file",   required: true,  accept: "image/*" },
    ],
  },
  {
    value: "PAYMENT_NOT_RECEIVED",
    label: "Payment Not Received (from customer)",
    group: "CUSTOMER",
    defaultTitle: "Customer Payment Pending",
    fields: [
      { key: "orderId", label: "Order ID",          type: "text",   required: true,  placeholder: "e.g. INV-1234" },
      { key: "amount",  label: "Pending Amount (₨)", type: "number", required: true,  placeholder: "0" },
    ],
  },
  {
    value: "WRONG_ITEM",
    label: "Wrong Item Sent",
    group: "CUSTOMER",
    defaultTitle: "Wrong Item Dispatched",
    fields: [
      { key: "orderId", label: "Order ID",    type: "text", required: true,  placeholder: "e.g. INV-1234" },
      { key: "photo",   label: "Photo proof", type: "file", required: false, accept: "image/*" },
    ],
  },
  {
    value: "DELIVERY_ISSUE",
    label: "Delivery / Dispatch Issue",
    group: "CUSTOMER",
    defaultTitle: "Delivery Problem",
    fields: [
      { key: "orderId", label: "Order ID", type: "text", required: true, placeholder: "e.g. INV-1234" },
    ],
  },
  {
    value: "CUSTOMER_BEHAVIOR",
    label: "Customer Complaint / Behavior",
    group: "CUSTOMER",
    defaultTitle: "Customer Issue",
    fields: [
      { key: "orderId", label: "Order ID", type: "text", required: false, placeholder: "e.g. INV-1234 (if applicable)" },
    ],
  },

  // ── Internal complaints ──────────────────────────────────────
  {
    value: "SALARY_ISSUE",
    label: "Salary / Pay Issue",
    group: "INTERNAL",
    defaultTitle: "Salary Complaint",
    fields: [
      { key: "month",  label: "Month",             type: "text",   required: true,  placeholder: "e.g. July 2026" },
      { key: "amount", label: "Expected Amount (₨)", type: "number", required: false, placeholder: "0" },
    ],
  },
  {
    value: "SOFTWARE_BUG",
    label: "Software / System Bug",
    group: "INTERNAL",
    defaultTitle: "Software Issue",
    fields: [
      { key: "screenshot", label: "Screenshot (optional)", type: "file", required: false, accept: "image/*" },
    ],
  },
  {
    value: "WORKLOAD",
    label: "Workload Issue",
    group: "INTERNAL",
    defaultTitle: "Workload Complaint",
    fields: [],
  },
  {
    value: "WORKPLACE",
    label: "Workplace Issue",
    group: "INTERNAL",
    defaultTitle: "Workplace Complaint",
    fields: [],
  },
  {
    value: "OTHER_INTERNAL",
    label: "Other Internal Issue",
    group: "INTERNAL",
    defaultTitle: "",
    fields: [],
  },
];

export const CUSTOMER_ISSUES = ISSUE_TYPES.filter((t) => t.group === "CUSTOMER");
export const INTERNAL_ISSUES = ISSUE_TYPES.filter((t) => t.group === "INTERNAL");

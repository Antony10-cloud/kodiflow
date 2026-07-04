type SendResult = {
  providerMessageId?: string;
  providerStatus: string;
};

const normalizeKenyanPhone = (value: string) => {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("254")) return `+${digits}`;
  if (digits.startsWith("0")) return `+254${digits.slice(1)}`;
  if (digits.length === 9) return `+254${digits}`;
  return `+${digits}`;
};

export function notificationConfiguration() {
  return {
    sms: Boolean(process.env.AFRICASTALKING_USERNAME && process.env.AFRICASTALKING_API_KEY),
    whatsapp: Boolean(
      process.env.META_WHATSAPP_ACCESS_TOKEN &&
      process.env.META_WHATSAPP_PHONE_NUMBER_ID &&
      process.env.META_WHATSAPP_TEMPLATE_NAME,
    ),
  };
}

export async function sendSms(recipient: string, message: string): Promise<SendResult> {
  const username = process.env.AFRICASTALKING_USERNAME;
  const apiKey = process.env.AFRICASTALKING_API_KEY;
  if (!username || !apiKey) throw new Error("Africa's Talking SMS is not configured.");

  const sandbox = process.env.AFRICASTALKING_ENVIRONMENT !== "production";
  const endpoint = sandbox
    ? "https://api.sandbox.africastalking.com/version1/messaging"
    : "https://api.africastalking.com/version1/messaging";
  const payload = new URLSearchParams({
    username,
    to: normalizeKenyanPhone(recipient),
    message,
  });
  if (process.env.AFRICASTALKING_SENDER_ID) {
    payload.set("from", process.env.AFRICASTALKING_SENDER_ID);
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
      apiKey,
    },
    body: payload,
    signal: AbortSignal.timeout(15_000),
  });
  const data = await response.json() as {
    SMSMessageData?: { Recipients?: Array<{ messageId?: string; status?: string }> };
    errorMessage?: string;
  };
  const result = data.SMSMessageData?.Recipients?.[0];
  if (!response.ok || !result || result.status?.toLowerCase().includes("rejected")) {
    throw new Error(data.errorMessage ?? result?.status ?? "SMS provider rejected the message.");
  }
  return { providerMessageId: result.messageId, providerStatus: result.status ?? "Sent" };
}

export async function sendWhatsAppTemplate(input: {
  recipient: string;
  tenantName: string;
  unitName: string;
  amount: string;
  dueDate: string;
  paymentInstructions: string;
  accountReference: string;
}): Promise<SendResult> {
  const accessToken = process.env.META_WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.META_WHATSAPP_PHONE_NUMBER_ID;
  const templateName = process.env.META_WHATSAPP_TEMPLATE_NAME;
  if (!accessToken || !phoneNumberId || !templateName) {
    throw new Error("WhatsApp Cloud API is not configured.");
  }

  const version = process.env.META_WHATSAPP_API_VERSION || "v23.0";
  const response = await fetch(`https://graph.facebook.com/${version}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: normalizeKenyanPhone(input.recipient).slice(1),
      type: "template",
      template: {
        name: templateName,
        language: { code: process.env.META_WHATSAPP_TEMPLATE_LANGUAGE || "en_US" },
        components: [{
          type: "body",
          parameters: [
            { type: "text", text: input.tenantName },
            { type: "text", text: input.unitName },
            { type: "text", text: input.amount },
            { type: "text", text: input.dueDate },
            { type: "text", text: input.paymentInstructions },
            { type: "text", text: input.accountReference },
          ],
        }],
      },
    }),
    signal: AbortSignal.timeout(15_000),
  });
  const data = await response.json() as {
    messages?: Array<{ id?: string; message_status?: string }>;
    error?: { message?: string };
  };
  const result = data.messages?.[0];
  if (!response.ok || !result?.id) {
    throw new Error(data.error?.message ?? "WhatsApp rejected the message.");
  }
  return {
    providerMessageId: result.id,
    providerStatus: result.message_status ?? "accepted",
  };
}

export function rentReminderMessage(input: {
  tenantName: string;
  amount: number;
  dueDate: string;
  accountReference: string;
  unitName?: string;
  paymentType?: string;
  shortcode?: string;
}) {
  const amount = new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(input.amount);
  const dueDate = new Date(`${input.dueDate}T12:00:00`).toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return {
    amount,
    dueDate,
    body: [
      `Hello ${input.tenantName}, your rent${input.unitName ? ` for ${input.unitName}` : ""} is ${amount}.`,
      `Due: ${dueDate}.`,
      input.shortcode
        ? `Pay via M-Pesa ${input.paymentType === "till" ? "Till" : "Paybill"} ${input.shortcode}, Account: ${input.accountReference}.`
        : `Use account ${input.accountReference} when paying.`,
      "Ignore this reminder if you have already paid.",
    ].join(" "),
  };
}

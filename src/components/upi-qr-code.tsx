import QRCode from "qrcode";
import { QrCode } from "lucide-react";
import { getDictionary } from "@/lib/i18n/server";
import { fmt } from "@/lib/i18n/format";
import { cn } from "@/lib/utils";

/** Builds a standards-compliant UPI intent URI. */
export function upiUri({
  upiId,
  payeeName,
  amount,
  note,
}: {
  upiId: string;
  payeeName?: string | null;
  amount?: number;
  note?: string;
}) {
  const params = new URLSearchParams({ pa: upiId, cu: "INR" });
  if (payeeName) params.set("pn", payeeName);
  if (amount && amount > 0) params.set("am", amount.toFixed(2));
  if (note) params.set("tn", note);
  return `upi://pay?${params.toString()}`;
}

/**
 * Rendered on the server so no QR library reaches the browser bundle.
 * Deliberately encodes no amount — the donor enters it in their own UPI app,
 * which is also what keeps this app out of the payment path entirely.
 */
export async function UPIQRCode({
  upiId,
  payeeName,
  className,
}: {
  upiId: string | null;
  payeeName?: string | null;
  className?: string;
}) {
  const t = await getDictionary();

  if (!upiId) {
    return (
      <div
        className={cn(
          "grid aspect-square w-full max-w-[15rem] place-items-center rounded-card border border-dashed border-ink-300 bg-ink-50 p-6 text-center",
          className,
        )}
      >
        <div>
          <QrCode className="mx-auto size-8 text-ink-400" strokeWidth={1.5} aria-hidden />
          <p className="mt-3 text-[0.8125rem] font-medium text-ink-600">
            {t.donate.upiNotSet}
          </p>
          <p className="mt-1 text-[0.75rem] leading-relaxed text-ink-400">
            {t.donate.upiNotSetBody}
          </p>
        </div>
      </div>
    );
  }

  const dataUrl = await QRCode.toDataURL(upiUri({ upiId, payeeName }), {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 512,
    color: { dark: "#1a1613", light: "#ffffff" },
  });

  return (
    <div
      className={cn(
        "w-full max-w-[15rem] rounded-card bg-white p-3 ring-1 ring-hairline",
        className,
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- inline data URI, nothing for the optimiser to do */}
      <img
        src={dataUrl}
        alt={fmt(t.donate.qrAlt, { upiId })}
        width={512}
        height={512}
        className="aspect-square w-full rounded-[0.75rem]"
      />
    </div>
  );
}

/** The UPI apps a donor can scan this code with. */
const UPI_APPS = [
  { name: "GPay", short: "G", tone: "text-[#1a73e8] bg-[#e8f0fe]" },
  { name: "PhonePe", short: "Pe", tone: "text-[#5f259f] bg-[#f0e9f9]" },
  { name: "Paytm", short: "P", tone: "text-[#00b9f1] bg-[#e3f6fd]" },
  { name: "BHIM", short: "B", tone: "text-[#e07b39] bg-[#fdf0e6]" },
  // Shortened from "Amazon Pay" — it ellipsises in the five-column row at 390px.
  { name: "Amazon", short: "A", tone: "text-[#ff9900] bg-[#fff4e5]" },
];

export async function UpiAppRow({ className }: { className?: string }) {
  const t = await getDictionary();

  return (
    <ul
      className={cn("flex items-start justify-between gap-2", className)}
      aria-label={t.donate.upiAppsAria}
    >
      {UPI_APPS.map((app) => (
        <li key={app.name} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
          <span
            className={cn(
              "grid size-11 place-items-center rounded-[0.875rem] text-[0.875rem] font-bold",
              app.tone,
            )}
            aria-hidden
          >
            {app.short}
          </span>
          <span className="w-full truncate text-center text-[0.6875rem] font-medium text-ink-500">
            {app.name}
          </span>
        </li>
      ))}
    </ul>
  );
}

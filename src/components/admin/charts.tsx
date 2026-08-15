"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency } from "@/lib/utils";

/**
 * Chart colours come from the app palette rather than Recharts' defaults, so
 * the dashboard reads as part of the same design system as the public app.
 */
const SAFFRON = "#f96a12";
const AXIS = "#a8a099";
const GRID = "#f0ece6";

const CATEGORY_COLORS = [
  "#f96a12",
  "#e3b44c",
  "#5a534e",
  "#fdb171",
  "#b97a25",
  "#a8a099",
  "#c23e09",
  "#d6d0c8",
];

const AXIS_TICK = { fill: AXIS, fontSize: 11 } as const;

function tooltipStyles() {
  return {
    contentStyle: {
      borderRadius: 12,
      border: "1px solid #f0ece6",
      boxShadow: "0 8px 24px -12px rgba(26,22,19,0.25)",
      fontSize: 12,
      padding: "8px 12px",
    },
    labelStyle: { color: "#5a534e", fontWeight: 600, marginBottom: 2 },
  };
}

export function DonationTrendChart({
  data,
}: {
  data: { label: string; total: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
        <defs>
          <linearGradient id="donationFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={SAFFRON} stopOpacity={0.28} />
            <stop offset="100%" stopColor={SAFFRON} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tick={AXIS_TICK}
          minTickGap={24}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={AXIS_TICK}
          width={56}
          tickFormatter={(value: number) => formatCurrency(value, { compact: true })}
        />
        <Tooltip
          {...tooltipStyles()}
          formatter={(value) => [formatCurrency(Number(value)), "Cumulative"]}
        />
        <Area
          type="monotone"
          dataKey="total"
          stroke={SAFFRON}
          strokeWidth={2}
          fill="url(#donationFill)"
          dot={false}
          activeDot={{ r: 4, strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function ExpenseCategoryChart({
  data,
}: {
  data: { label: string; total: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(180, data.length * 38)}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 16, bottom: 4, left: 8 }}
        barCategoryGap={10}
      >
        <CartesianGrid stroke={GRID} horizontal={false} />
        <XAxis
          type="number"
          tickLine={false}
          axisLine={false}
          tick={AXIS_TICK}
          tickFormatter={(value: number) => formatCurrency(value, { compact: true })}
        />
        <YAxis
          type="category"
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tick={AXIS_TICK}
          width={104}
        />
        <Tooltip
          {...tooltipStyles()}
          cursor={{ fill: "rgba(26,22,19,0.04)" }}
          formatter={(value) => [formatCurrency(Number(value)), "Spent"]}
        />
        <Bar dataKey="total" radius={[0, 6, 6, 0]}>
          {data.map((entry, index) => (
            <Cell
              key={entry.label}
              fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

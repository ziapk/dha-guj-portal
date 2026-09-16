"use client";

import { DatePicker } from "antd";
import dayjs, { type Dayjs } from "dayjs";

export type DateRange = { from: string; to: string };

const FORMAT = "YYYY-MM-DD";

/** The last 30 days including today, matching the API default. */
export function defaultRange(days = 30): DateRange {
  return { from: dayjs().subtract(days - 1, "day").format(FORMAT), to: dayjs().format(FORMAT) };
}

const PRESETS: { label: string; value: [Dayjs, Dayjs] }[] = [
  { label: "Last 7 days", value: [dayjs().subtract(6, "day"), dayjs()] },
  { label: "Last 30 days", value: [dayjs().subtract(29, "day"), dayjs()] },
  { label: "Last 90 days", value: [dayjs().subtract(89, "day"), dayjs()] },
  { label: "This month", value: [dayjs().startOf("month"), dayjs()] },
  { label: "Last month", value: [dayjs().subtract(1, "month").startOf("month"), dayjs().subtract(1, "month").endOf("month")] },
];

/** From/to date picker for reports: no future dates and at most one year, like the API allows. */
export function DateRangeFilter({ value, onChange }: { value: DateRange; onChange: (range: DateRange) => void }) {
  return (
    <DatePicker.RangePicker
      allowClear={false}
      aria-label="Date range"
      format="DD MMM YYYY"
      value={[dayjs(value.from), dayjs(value.to)]}
      presets={PRESETS}
      disabledDate={(date, info) => {
        if (date.isAfter(dayjs(), "day")) {
          return true;
        }

        // While picking, keep the other end within a year of the first date chosen.
        const start = info?.from;

        return Boolean(start && Math.abs(date.diff(start, "day")) > 365);
      }}
      onChange={(dates) => {
        if (dates?.[0] && dates[1]) {
          onChange({ from: dates[0].format(FORMAT), to: dates[1].format(FORMAT) });
        }
      }}
    />
  );
}

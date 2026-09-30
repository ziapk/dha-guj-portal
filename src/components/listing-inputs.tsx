"use client";

import { ArrowLeftOutlined, ArrowRightOutlined, DeleteOutlined, HolderOutlined, PlusOutlined, YoutubeFilled } from "@ant-design/icons";
import { Button, Form, Input, InputNumber, Select, Space } from "antd";
import { useState, type DragEvent, type ReactNode } from "react";
import { AREA_UNIT_LABELS, toOptions } from "@/lib/labels";
import type { AreaUnit } from "@/types/api";

/*
 * Inputs used by the Add / Edit listing form. The Admin Portal and Property Admin keep identical copies of this file.
 */

/** The plot sizes people list most in DHA Gujranwala. */
export const AREA_PRESETS: { size: number; unit: AreaUnit; label: string }[] = [
  { size: 4, unit: "marla", label: "4 Marla" },
  { size: 5, unit: "marla", label: "5 Marla" },
  { size: 6, unit: "marla", label: "6 Marla" },
  { size: 8, unit: "marla", label: "8 Marla" },
  { size: 10, unit: "marla", label: "10 Marla" },
  { size: 1, unit: "kanal", label: "1 Kanal" },
  { size: 2, unit: "kanal", label: "2 Kanal" },
];

const isPreset = (size: unknown, unit: unknown) => AREA_PRESETS.some((preset) => Number(size) === preset.size && unit === preset.unit);

/**
 * Area size as one-tap chips for the common sizes, plus "Other". Only "Other" (or a saved size that is not a
 * chip) shows the number and unit fields. Must sit inside the listing Form; it owns area_size and area_unit.
 */
export function AreaSizeField({ disabled }: { disabled?: boolean }) {
  const form = Form.useFormInstance();
  const size = Form.useWatch("area_size", form);
  const unit = Form.useWatch("area_unit", form);
  const [other, setOther] = useState(false);
  const hasSize = size !== undefined && size !== null && size !== "";
  const custom = other || (hasSize && !isPreset(size, unit));

  return (
    <>
      <div className="lf-chips lf-area-presets" role="radiogroup" aria-label="Area size">
        {AREA_PRESETS.map((preset) => {
          const active = !custom && Number(size) === preset.size && unit === preset.unit;

          return (
            <button
              key={preset.label}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={disabled}
              className={`lf-chip${active ? " active" : ""}`}
              onClick={() => {
                setOther(false);
                form.setFieldsValue({ area_size: preset.size, area_unit: preset.unit });
                void form.validateFields(["area_size"]);
              }}
            >
              {preset.label}
            </button>
          );
        })}
        <button
          type="button"
          role="radio"
          aria-checked={custom}
          disabled={disabled}
          className={`lf-chip${custom ? " active" : ""}`}
          onClick={() => {
            if (!custom) {
              setOther(true);
              form.setFieldsValue({ area_size: undefined, area_unit: unit ?? "marla" });
            }
          }}
        >
          <PlusOutlined /> Other
        </button>
      </div>
      {/* The fields stay mounted while hidden so "required" still reports a missing size under the chips. */}
      <div className={custom ? "lf-pair" : undefined}>
        <Form.Item name="area_size" rules={[{ required: true, message: custom ? "Enter the area" : "Choose a size, or Other to enter your own" }]} style={custom ? undefined : { marginBottom: 0 }}>
          <InputNumber min={0.01} placeholder="Enter area" autoFocus={other} style={custom ? { width: "100%" } : { display: "none" }} />
        </Form.Item>
        <Form.Item name="area_unit" rules={[{ required: true }]} hidden={!custom}>
          <Select options={toOptions(AREA_UNIT_LABELS)} aria-label="Area unit" />
        </Form.Item>
      </div>
    </>
  );
}

/** How many recent years get their own chip; older (or future, e.g. under construction) years go through "Other". */
const YEAR_CHIPS = 6;

/**
 * Year built as chips for recent years, plus "Other" for any other year. Optional: clicking the chosen chip again
 * clears it. Must sit inside the listing Form; it owns year_built.
 */
export function YearBuiltField({ disabled }: { disabled?: boolean }) {
  const form = Form.useFormInstance();
  const year = Form.useWatch("year_built", form);
  const [other, setOther] = useState(false);
  const thisYear = new Date().getFullYear();
  const years = Array.from({ length: YEAR_CHIPS }, (_, index) => thisYear - index);
  const hasYear = year !== undefined && year !== null && year !== "";
  const custom = other || (hasYear && !years.includes(Number(year)));

  return (
    <>
      <div className="lf-chips lf-area-presets" role="radiogroup" aria-label="Year built">
        {years.map((item) => {
          const active = !custom && Number(year) === item;

          return (
            <button
              key={item}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={disabled}
              className={`lf-chip${active ? " active" : ""}`}
              onClick={() => {
                setOther(false);
                form.setFieldValue("year_built", active ? null : item);
              }}
            >
              {item}
            </button>
          );
        })}
        <button
          type="button"
          role="radio"
          aria-checked={custom}
          disabled={disabled}
          className={`lf-chip${custom ? " active" : ""}`}
          onClick={() => {
            // Clicking Other again closes it, like the year chips.
            setOther(!custom);
            form.setFieldValue("year_built", null);
          }}
        >
          <PlusOutlined /> Other
        </button>
      </div>
      <Form.Item name="year_built" hidden={!custom}>
        <InputNumber min={1900} max={thisYear + 2} precision={0} placeholder={`e.g. ${thisYear - 10}`} autoFocus={other} style={{ width: 160 }} />
      </Form.Item>
    </>
  );
}

const PRICE_UNITS = [
  { value: 1_000, label: "Thousand" },
  { value: 100_000, label: "Lakh" },
  { value: 10_000_000, label: "Crore" },
];

/** The unit a stored amount reads best in: 1,50,00,000 → 1.5 Crore, 45,000 → 45 Thousand. */
function unitFor(amount: number): number {
  return [...PRICE_UNITS].reverse().find((unit) => amount >= unit.value)?.value ?? 1_000;
}

const trim = (value: number) => Number(value.toFixed(3));

/**
 * A PKR price typed the way it is said: an amount plus Thousand / Lakh / Crore. Works as a Form.Item control;
 * its value is always the full amount in rupees, which is what the API stores.
 */
export function PriceInput({ value, onChange, disabled, placeholder = "e.g. 1.5" }: { value?: number | null; onChange?: (value: number | null) => void; disabled?: boolean; placeholder?: string }) {
  const [unit, setUnit] = useState(() => (value ? unitFor(value) : 100_000));
  const [amount, setAmount] = useState<number | null>(() => (value ? trim(value / unit) : null));
  // A value set from outside (e.g. a saved listing loading) is shown in the unit that reads best.
  const [seen, setSeen] = useState(value ?? null);

  if ((value ?? null) !== seen) {
    setSeen(value ?? null);

    if (value && Math.round((amount ?? 0) * unit) !== value) {
      const next = unitFor(value);
      setUnit(next);
      setAmount(trim(value / next));
    } else if (!value) {
      setAmount(null);
    }
  }

  function emit(nextAmount: number | null, nextUnit: number) {
    const rupees = nextAmount ? Math.round(nextAmount * nextUnit) : null;
    setSeen(rupees);
    onChange?.(rupees);
  }

  return (
    <div className="lf-price">
      <InputNumber<number>
        min={0}
        step={0.5}
        precision={3}
        placeholder={placeholder}
        disabled={disabled}
        value={amount}
        onChange={(next) => {
          setAmount(next);
          emit(next, unit);
        }}
        style={{ width: "100%" }}
        prefix="PKR"
      />
      <Select
        value={unit}
        disabled={disabled}
        options={PRICE_UNITS}
        aria-label="Price unit"
        onChange={(next) => {
          setUnit(next);
          emit(amount, next);
        }}
      />
    </div>
  );
}

export type SortableThumb = { key: string | number; src?: string; alt: string; badge?: ReactNode };

/**
 * Photo thumbnails that can be dragged into a new order (arrow buttons do the same on touch screens and for
 * keyboard users). The first one is the cover; the order is the gallery order on the property page.
 */
export function SortableThumbs({
  items,
  onReorder,
  onRemove,
  disabled,
}: {
  items: SortableThumb[];
  onReorder: (keys: SortableThumb["key"][]) => void;
  onRemove?: (key: SortableThumb["key"]) => void;
  disabled?: boolean;
}) {
  const [dragging, setDragging] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);

  function move(from: number, to: number) {
    if (from === to || to < 0 || to >= items.length) {
      return;
    }

    const keys = items.map((item) => item.key);
    const [moved] = keys.splice(from, 1);
    keys.splice(to, 0, moved);
    onReorder(keys);
  }

  function drop(event: DragEvent, index: number) {
    event.preventDefault();

    if (dragging !== null) {
      move(dragging, index);
    }

    setDragging(null);
    setOver(null);
  }

  return (
    <div className="lf-thumbs">
      {items.map((item, index) => (
        <div
          key={item.key}
          className={`lf-thumb${dragging === index ? " dragging" : ""}${over === index && dragging !== index ? " drop-target" : ""}`}
          draggable={!disabled}
          onDragStart={(event) => {
            event.dataTransfer.effectAllowed = "move";
            setDragging(index);
          }}
          onDragOver={(event) => {
            event.preventDefault();
            setOver(index);
          }}
          onDragLeave={() => setOver((current) => (current === index ? null : current))}
          onDrop={(event) => drop(event, index)}
          onDragEnd={() => {
            setDragging(null);
            setOver(null);
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- local blob or stored thumbnail */}
          <img src={item.src} alt={item.alt} draggable={false} />
          {index === 0 ? <span className="lf-thumb-cover">Cover</span> : <span className="lf-thumb-cover lf-thumb-index">{index + 1}</span>}
          {item.badge}
          {!disabled && (
            <>
              <HolderOutlined className="lf-thumb-grip" aria-hidden />
              <div className="lf-thumb-moves">
                <button type="button" aria-label="Move earlier" disabled={index === 0} onClick={() => move(index, index - 1)}>
                  <ArrowLeftOutlined />
                </button>
                <button type="button" aria-label="Move later" disabled={index === items.length - 1} onClick={() => move(index, index + 1)}>
                  <ArrowRightOutlined />
                </button>
              </div>
              {onRemove && (
                <button type="button" aria-label="Remove photo" className="lf-thumb-remove" onClick={() => onRemove(item.key)}>
                  <DeleteOutlined />
                </button>
              )}
            </>
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * A video link box with its Add button, always visible. Enter adds too. The box clears once onAdd succeeds
 * (a rejected promise keeps the link so it can be fixed).
 */
export function VideoLinkInput({ onAdd, loading, disabled }: { onAdd: (url: string) => void | Promise<unknown>; loading?: boolean; disabled?: boolean }) {
  const [url, setUrl] = useState("");

  async function add() {
    const link = url.trim();

    if (!link) {
      return;
    }

    try {
      await onAdd(link);
      setUrl("");
    } catch {
      // The caller shows the error; keep the link so it can be corrected.
    }
  }

  return (
    <Space.Compact style={{ width: "100%" }}>
      <Input
        size="large"
        prefix={<YoutubeFilled style={{ color: "#ff0000", fontSize: 18 }} aria-hidden />}
        placeholder="Paste a YouTube or Vimeo link, e.g. https://youtu.be/…"
        value={url}
        disabled={disabled}
        onChange={(event) => setUrl(event.target.value)}
        onPressEnter={(event) => {
          event.preventDefault();
          void add();
        }}
        aria-label="Video link"
      />
      <Button size="large" type="primary" icon={<PlusOutlined />} loading={loading} disabled={disabled || !url.trim()} onClick={() => void add()}>
        Add
      </Button>
    </Space.Compact>
  );
}

"use client";

import { SearchOutlined } from "@ant-design/icons";
import { Empty, Input, Modal } from "antd";
import { useMemo, useState, type KeyboardEvent, type ReactNode } from "react";

export type PaletteEntry = {
  key: string;
  label: string;
  group: string;
  icon: ReactNode;
  keywords?: string;
  run: () => void;
};

export function CommandPalette({ open, onClose, entries }: { open: boolean; onClose: () => void; entries: PaletteEntry[] }) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return needle
      ? entries.filter((entry) => `${entry.label} ${entry.group} ${entry.keywords ?? ""}`.toLowerCase().includes(needle))
      : entries;
  }, [entries, query]);

  const activeIndex = Math.min(active, Math.max(results.length - 1, 0));

  function choose(entry: PaletteEntry) {
    onClose();
    entry.run();
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (results.length === 0) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((activeIndex + 1) % results.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((activeIndex - 1 + results.length) % results.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      choose(results[activeIndex]);
    }
  }

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      closable={false}
      width={560}
      style={{ top: 96 }}
      styles={{ body: { padding: 0 } }}
      destroyOnHidden
    >
      <Input
        size="large"
        variant="borderless"
        prefix={<SearchOutlined />}
        placeholder="Search pages and actions…"
        value={query}
        autoFocus
        onChange={(event) => {
          setQuery(event.target.value);
          setActive(0);
        }}
        onKeyDown={onKeyDown}
        style={{ padding: "12px 16px" }}
      />
      <div className="palette-results" role="listbox">
        {results.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No matches" />
        ) : (
          results.map((entry, index) => (
            <div
              key={entry.key}
              role="option"
              aria-selected={index === activeIndex}
              className={`palette-item${index === activeIndex ? " active" : ""}`}
              onMouseEnter={() => setActive(index)}
              onClick={() => choose(entry)}
            >
              <span className="palette-icon">{entry.icon}</span>
              <span className="palette-label">
                {entry.label}
                <small>{entry.group}</small>
              </span>
              {index === activeIndex && <kbd>↵</kbd>}
            </div>
          ))
        )}
      </div>
      <div className="palette-footer">
        <span>
          <kbd>↑</kbd>
          <kbd>↓</kbd>navigate
        </span>
        <span>
          <kbd>↵</kbd>open
        </span>
        <span>
          <kbd>esc</kbd>close
        </span>
      </div>
    </Modal>
  );
}

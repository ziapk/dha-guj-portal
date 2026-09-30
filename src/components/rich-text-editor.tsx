"use client";

import { Skeleton } from "antd";
import dynamic from "next/dynamic";

export type RichTextEditorProps = {
  value?: string;
  onChange?: (html: string) => void;
  height?: number;
  placeholder?: string;
  disabled?: boolean;
};

/**
 * A simple visual editor (TinyMCE, self-hosted) for listing descriptions: paragraphs, headings, bold / italic,
 * bullet and numbered lists and links. Loaded only in the browser because TinyMCE needs `window`.
 * Works as an antd Form.Item child (value / onChange); the API cleans the HTML when it is saved.
 */
export const RichTextEditor = dynamic<RichTextEditorProps>(() => import("@/components/rich-text-editor-impl").then((module) => module.RichTextEditorImpl), {
  ssr: false,
  loading: () => <Skeleton.Node active style={{ width: "100%", height: 320 }} />,
});

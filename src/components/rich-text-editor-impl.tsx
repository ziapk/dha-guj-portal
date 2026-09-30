"use client";

import { Editor } from "@tinymce/tinymce-react";
// TinyMCE is bundled instead of loaded from Tiny Cloud, so no API key is needed (GPL licence).
import "tinymce/tinymce";
import "tinymce/models/dom/model";
import "tinymce/themes/silver";
import "tinymce/icons/default";
import "tinymce/skins/ui/oxide/skin.js";
import "tinymce/skins/ui/oxide/content.js";
import "tinymce/skins/ui/oxide-dark/skin.js";
import "tinymce/skins/ui/oxide-dark/content.js";
import "tinymce/skins/content/default/content.js";
import "tinymce/skins/content/dark/content.js";
import "tinymce/plugins/autolink";
import "tinymce/plugins/link";
import "tinymce/plugins/lists";
import "tinymce/plugins/wordcount";
import type { RichTextEditorProps } from "@/components/rich-text-editor";
import { useThemeSettings } from "@/theme/theme-provider";

export function RichTextEditorImpl({ value, onChange, height = 320, placeholder, disabled }: RichTextEditorProps) {
  const { resolvedMode } = useThemeSettings();
  const dark = resolvedMode === "dark";

  return (
    <div className="lf-rich-text">
      <Editor
        // TinyMCE cannot switch skins after start-up, so a theme change re-creates the editor.
        key={resolvedMode}
        licenseKey="gpl"
        value={value ?? ""}
        disabled={disabled}
        onEditorChange={(html) => onChange?.(html)}
        init={{
          height,
          placeholder,
          promotion: false,
          branding: false,
          menubar: false,
          statusbar: true,
          elementpath: false,
          skin: dark ? "oxide-dark" : "oxide",
          content_css: dark ? "dark" : "default",
          content_style: "body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; line-height: 1.6; }",
          plugins: "autolink link lists wordcount",
          toolbar: "undo redo | blocks | bold italic underline | bullist numlist | link | removeformat",
          block_formats: "Paragraph=p; Heading=h3; Subheading=h4",
          // Pasted text keeps its paragraphs and lists but not fonts, colours or images from other sites.
          paste_block_drop: true,
          invalid_elements: "img,iframe,video,audio,script,style,table",
          relative_urls: false,
          convert_urls: false,
          link_default_target: "_blank",
        }}
      />
    </div>
  );
}

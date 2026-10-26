"use client";

import { App, Input, Modal, Typography } from "antd";
import { useState } from "react";
import { api } from "@/lib/api-client";
import { errorMessage } from "@/lib/form-errors";
import { thumbnailUrl } from "@/lib/media";
import type { ProjectMedia, PropertyMedia, Resource } from "@/types/api";

/** Longest alt text the API accepts, for every image. */
export const ALT_TEXT_MAX = 150;

/** Short help under the plain "Alt text" inputs (logo, cover, profile photo). */
export const ALT_TEXT_EXTRA = "Describes the image for screen readers and search engines. Leave blank to use the website's own description.";

const ALT_TEXT_HINT =
  "Describe what the photo shows, e.g. “Front of a double-storey house with a car porch”. Don't repeat the title or stuff keywords. Leave it blank only for a purely decorative image; the website then uses its own description.";

/**
 * Edit one photo's alt text. `onSave` gets the trimmed text, or null when left blank; the dialog closes once it
 * resolves (a rejected promise keeps it open so the text is not lost).
 */
export function AltTextModal({
  photo,
  onSave,
  onClose,
}: {
  /** The photo being edited; null keeps the dialog closed. */
  photo: { src?: string; altText?: string | null } | null;
  onSave: (altText: string | null) => void | Promise<unknown>;
  onClose: () => void;
}) {
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  // Start from the photo's saved text each time the dialog opens on a photo.
  const identity = photo ? `${photo.src ?? ""}|${photo.altText ?? ""}` : null;
  const [seen, setSeen] = useState<string | null>(null);

  if (identity !== seen) {
    setSeen(identity);
    setText(photo?.altText ?? "");
  }

  async function save() {
    setSaving(true);

    try {
      await onSave(text.trim() || null);
      onClose();
    } catch {
      // The caller shows the error.
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={photo?.altText ? "Edit alt text" : "Add alt text"} open={photo !== null} okText="Save" confirmLoading={saving} onOk={() => void save()} onCancel={onClose} destroyOnHidden>
      {photo?.src && (
        // eslint-disable-next-line @next/next/no-img-element -- local blob or stored thumbnail
        <img src={photo.src} alt="" style={{ display: "block", width: "100%", maxHeight: 240, objectFit: "contain", borderRadius: 8, background: "var(--app-bg)", marginBottom: 12 }} />
      )}
      <Input.TextArea
        value={text}
        onChange={(event) => setText(event.target.value)}
        maxLength={ALT_TEXT_MAX}
        showCount
        rows={3}
        autoFocus
        aria-label="Alt text"
        placeholder="What the photo shows"
      />
      <Typography.Paragraph type="secondary" style={{ margin: "20px 0 0", fontSize: 12 }}>
        {ALT_TEXT_HINT}
      </Typography.Paragraph>
    </Modal>
  );
}

/**
 * The alt text dialog for a stored listing or project photo: saves through PATCH {endpoint}/{id} and hands the
 * updated photo to `onSaved`. The API refuses while the listing or project is under review.
 */
export function MediaAltTextModal<T extends PropertyMedia | ProjectMedia>({
  endpoint,
  media,
  onSaved,
  onClose,
}: {
  /** The owner's media endpoint, e.g. portal/properties/5/media. */
  endpoint: string;
  media: T | null;
  onSaved: (media: T) => void;
  onClose: () => void;
}) {
  const { message } = App.useApp();

  return (
    <AltTextModal
      photo={media && { src: thumbnailUrl(media), altText: media.alt_text }}
      onClose={onClose}
      onSave={async (altText) => {
        if (!media) {
          return;
        }

        try {
          const response = await api<Resource<T>>(`${endpoint}/${media.id}`, { method: "PATCH", body: { alt_text: altText } });
          onSaved(response.data);
          message.success(altText ? "Alt text saved" : "Alt text cleared");
        } catch (error) {
          message.error(errorMessage(error));
          throw error;
        }
      }}
    />
  );
}

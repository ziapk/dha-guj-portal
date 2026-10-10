"use client";

import { ArrowDownOutlined, ArrowUpOutlined, DeleteOutlined, PictureOutlined, PlusOutlined, UploadOutlined } from "@ant-design/icons";
import { App, Alert, Avatar, Button, Flex, Select, Typography, Upload } from "antd";
import { useEffect, useRef, useState } from "react";
import { SortableThumbs } from "@/components/listing-inputs";
import { sizedImage } from "@/lib/media";
import { uploadErrorMessage, uploadForm } from "@/lib/upload";
import { PageIconGlyph } from "@/components/page-icons";
import { PAGE_ICONS, type PageIcon } from "@/types/api";

/** Largest section image the API accepts, in MB. */
const MAX_IMAGE_MB = 5;

/** Posts one image to the company page image endpoint and returns its URL. */
async function uploadContentImage(file: File): Promise<string> {
  const body = new FormData();
  body.append("file", file);

  return (await uploadForm<{ location: string }>("portal/developer-profile/content-images", body)).location;
}

/** An icon name with its drawing, used for both the list rows and the chosen value. */
function IconOption({ name, label }: { name: PageIcon; label: React.ReactNode }) {
  return (
    <Flex align="center" gap={8}>
      <PageIconGlyph name={name} />
      <span>{label}</span>
    </Flex>
  );
}

/**
 * The icon picker used by section repeaters. The values match the names the website can draw,
 * and each option shows that drawing, so anything chosen here is guaranteed to render as previewed.
 */
export function IconSelect(props: { value?: string | null; onChange?: (value: string | null) => void }) {
  return (
    <Select
      allowClear
      showSearch={{ optionFilterProp: "label" }}
      placeholder="Pick an icon"
      value={props.value ?? undefined}
      onChange={(value) => props.onChange?.(value ?? null)}
      options={PAGE_ICONS.map((icon) => ({ value: icon, label: icon.replace(/^./, (c) => c.toUpperCase()) }))}
      optionRender={(option) => <IconOption name={option.value as PageIcon} label={option.label} />}
      labelRender={(selected) =>
        (PAGE_ICONS as readonly string[]).includes(String(selected.value)) ? <IconOption name={selected.value as PageIcon} label={selected.label} /> : selected.label
      }
    />
  );
}

/**
 * An image field inside a section. Images are uploaded to the shared content-images endpoint and
 * the returned URL is stored in the page's sections, so no extra upload route is needed.
 */
export function SectionImage({
  value,
  onChange,
  shape = "square",
  hint,
}: {
  value?: string | null;
  onChange?: (value: string | null) => void;
  shape?: "square" | "circle";
  hint?: string;
}) {
  const { message } = App.useApp();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async (file: File) => {
    setUploading(true);
    setError(null);

    try {
      const body = new FormData();
      body.append("file", file);
      const response = await uploadForm<{ location: string }>("portal/developer-profile/content-images", body);
      onChange?.(response.location);
      message.success("Image uploaded");
    } catch (uploadError) {
      setError(uploadErrorMessage(uploadError, "file"));
    } finally {
      setUploading(false);
    }
  };

  return (
    <Flex vertical gap={8}>
      <Flex align="center" gap={12}>
        <Avatar shape={shape} size={64} src={sizedImage(value, "thumbnail") ?? undefined} icon={<PictureOutlined />} />
        <Flex gap={8} wrap>
          <Upload
            accept="image/png,image/jpeg,image/webp"
            showUploadList={false}
            beforeUpload={(file) => {
              if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
                setError(`The image must be ${MAX_IMAGE_MB} MB or smaller.`);
              } else {
                void upload(file);
              }

              // antd's own uploader is never used; the file is posted by hand above.
              return Upload.LIST_IGNORE;
            }}
          >
            <Button size="small" icon={<UploadOutlined />} loading={uploading}>
              {value ? "Replace" : "Upload"}
            </Button>
          </Upload>
          {value && (
            <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={() => onChange?.(null)}>
              Remove
            </Button>
          )}
        </Flex>
      </Flex>
      {hint && (
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {hint}
        </Typography.Text>
      )}
      {error && <Alert type="error" showIcon title={error} />}
    </Flex>
  );
}

/**
 * A repeater card with a title and a remove button, used by every section list. Pass the move
 * handlers (see `moveProps`) where the order is the display order on the website.
 */
export function RepeaterCard({
  title,
  onRemove,
  onMoveUp,
  onMoveDown,
  extra,
  children,
}: {
  title: string;
  onRemove: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  extra?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div style={{ border: "1px solid var(--app-border, #e6ebf2)", borderRadius: 10, padding: 14, marginBottom: 12 }}>
      <Flex justify="space-between" align="center" style={{ marginBottom: 10 }}>
        <Typography.Text strong>{title}</Typography.Text>
        <Flex align="center" gap={4}>
          {extra}
          {(onMoveUp || onMoveDown) && (
            <>
              <Button size="small" type="text" icon={<ArrowUpOutlined />} aria-label={`Move ${title} up`} disabled={!onMoveUp} onClick={onMoveUp} />
              <Button size="small" type="text" icon={<ArrowDownOutlined />} aria-label={`Move ${title} down`} disabled={!onMoveDown} onClick={onMoveDown} />
            </>
          )}
          <Button size="small" type="text" danger icon={<DeleteOutlined />} aria-label={`Remove ${title}`} onClick={onRemove} />
        </Flex>
      </Flex>
      {children}
    </div>
  );
}

/** Move handlers for row `index` of `count` rows in a Form.List. */
export function moveProps(index: number, count: number, move: (from: number, to: number) => void) {
  return {
    onMoveUp: index > 0 ? () => move(index, index - 1) : undefined,
    onMoveDown: index < count - 1 ? () => move(index, index + 1) : undefined,
  };
}

/** A tag input for a simple list of strings, e.g. mission points or document names. */
export function StringListField(props: { value?: string[]; onChange?: (value: string[]) => void; placeholder?: string }) {
  return (
    <Select
      mode="tags"
      open={false}
      suffixIcon={null}
      allowClear
      placeholder={props.placeholder}
      value={props.value ?? []}
      onChange={(value) => props.onChange?.(value)}
    />
  );
}

/** Several images stored as a list of URLs (e.g. a construction update's gallery). Drag to reorder. */
export function ImageListField({ value, onChange, max = 30 }: { value?: string[] | null; onChange?: (value: string[]) => void; max?: number }) {
  const [uploading, setUploading] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const images = value ?? [];
  const imagesRef = useRef(images);

  useEffect(() => {
    imagesRef.current = images;
  });

  const upload = async (file: File) => {
    setUploading((count) => count + 1);
    setError(null);

    try {
      const url = await uploadContentImage(file);
      // Several uploads can finish before the form re-renders, so append to the newest list, not this render's.
      imagesRef.current = [...imagesRef.current, url];
      onChange?.(imagesRef.current);
    } catch (uploadError) {
      setError(uploadErrorMessage(uploadError, "file"));
    } finally {
      setUploading((count) => count - 1);
    }
  };

  return (
    <Flex vertical gap={8}>
      {images.length > 0 && (
        <SortableThumbs
          items={images.map((url, index) => ({ key: url, src: sizedImage(url, "thumbnail"), alt: `Image ${index + 1}` }))}
          onReorder={(keys) => onChange?.(keys.map(String))}
          onRemove={(key) => onChange?.(images.filter((url) => url !== key))}
        />
      )}
      <Upload
        accept="image/png,image/jpeg,image/webp"
        multiple
        showUploadList={false}
        disabled={images.length >= max}
        beforeUpload={(file) => {
          if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
            setError(`Each image must be ${MAX_IMAGE_MB} MB or smaller.`);
          } else {
            void upload(file);
          }

          return Upload.LIST_IGNORE;
        }}
      >
        <Button size="small" icon={<PlusOutlined />} loading={uploading > 0} disabled={images.length >= max}>
          Add images
        </Button>
      </Upload>
      {error && <Alert type="error" showIcon title={error} />}
    </Flex>
  );
}

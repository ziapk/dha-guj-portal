"use client";

import { BuildOutlined, PlusOutlined, UploadOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { Alert, App, Avatar, Button, Card, Col, Flex, Form, Input, InputNumber, Row, Select, Switch, Tabs, Typography, Upload, type FormInstance } from "antd";
import { useState } from "react";
import { htmlText } from "@/components/listing-form";
import { RichTextEditor } from "@/components/rich-text-editor";
import { IconSelect, RepeaterCard, SectionImage, moveProps } from "@/components/section-fields";
import { api } from "@/lib/api-client";
import {
  CONSTRUCTION_STATUS_LABELS,
  DEVELOPER_TYPE_LABELS,
  GALLERY_CATEGORY_LABELS,
  PROJECT_STATUS_LABELS,
  SOCIAL_PLATFORM_LABELS,
  toOptions,
} from "@/lib/labels";
import { uploadErrorMessage, uploadForm } from "@/lib/upload";
import type {
  City,
  Developer,
  DeveloperFaq,
  DeveloperGalleryItem,
  DeveloperLeader,
  DeveloperListItem,
  DeveloperPortfolioItem,
  DeveloperSection,
  DeveloperSectionContent,
  DeveloperSocialLink,
  DeveloperStat,
  DeveloperTeamMember,
  DeveloperType,
  Collection,
  Paginated,
  Project,
  Resource,
} from "@/types/api";

/** Largest logo or cover image the API accepts, in MB. */
const MAX_IMAGE_MB = 5;

/** Most entries the API accepts in the core values, expertise and team lists. */
const MAX_ITEMS = 20;

/** Most photos the API accepts in the work gallery. */
const MAX_GALLERY = 60;

/** Most people the API accepts in the leadership block. */
const MAX_LEADERS = 10;

/** Most questions the API accepts in the FAQ list. */
const MAX_FAQS = 30;

/** Most projects the API accepts in the portfolio. */
const MAX_PORTFOLIO = 100;

/** The website's own wording, shown as placeholders so an admin only types what should differ. */
const SECTION_DEFAULTS: Record<DeveloperSection, { label: string; heading: string }> = {
  overview: { label: "About company", heading: "Company Overview" },
  history: { label: "Our story", heading: "Company History" },
  mission: { label: "Our purpose", heading: "Our Mission" },
  vision: { label: "Looking ahead", heading: "Our Vision" },
  values: { label: "Our principles", heading: "Core Values" },
  expertise: { label: "What we do", heading: "Areas of Expertise" },
  stats: { label: "Our experience", heading: "Experience & Statistics" },
  projects: { label: "Our projects", heading: "Projects / Portfolio" },
  gallery: { label: "Gallery", heading: "Our Work Gallery" },
  leadership: { label: "Leadership", heading: "Team / Leadership" },
  team: { label: "Our people", heading: "Our Team" },
  registration: { label: "Company registration & verification", heading: "Registered & Verified" },
  contact: { label: "Contact us", heading: "Get in Touch" },
  social: { label: "Follow us", heading: "Connect With Us" },
  faqs: { label: "FAQs", heading: "Frequently Asked Questions" },
};

const STAT_FIELDS: { name: DeveloperStat; label: string }[] = [
  { name: "years_experience", label: "Years of experience" },
  { name: "total_projects", label: "Total projects" },
  { name: "completed_projects", label: "Completed projects" },
  { name: "ongoing_projects", label: "Ongoing projects" },
  { name: "upcoming_projects", label: "Upcoming projects" },
  { name: "cities_covered", label: "Cities covered" },
  { name: "total_units", label: "Total units developed" },
];

const STAT_SOURCES: Record<DeveloperStat, string> = {
  years_experience: "from the year established",
  total_projects: "live projects",
  completed_projects: "live projects marked ready",
  ongoing_projects: "live projects under construction",
  upcoming_projects: "live projects marked upcoming",
  cities_covered: "different cities of live projects",
  total_units: "sum of units on completed live projects",
};

const REGISTRATION_FIELDS: { name: keyof DeveloperFormValues; label: string; placeholder: string; max: number }[] = [
  { name: "legal_name", label: "Legal company name", placeholder: "e.g. DHA GRW Properties (Pvt.) Ltd.", max: 150 },
  { name: "registered_name", label: "Registered company name", placeholder: "Name as on the SECP certificate", max: 150 },
  { name: "registration_number", label: "SECP registration no.", placeholder: "e.g. 0123456", max: 100 },
  { name: "business_type", label: "Business type", placeholder: "e.g. Private Limited Company", max: 100 },
  { name: "ntn_number", label: "NTN", placeholder: "e.g. 1234567-8", max: 50 },
  { name: "strn_number", label: "STRN", placeholder: "e.g. 03-1234567-8-001", max: 50 },
  { name: "license_number", label: "Licence number", placeholder: "e.g. DHA/RE/2024/001", max: 100 },
  { name: "license_authority", label: "Licence issuing authority", placeholder: "e.g. DHA Gujranwala", max: 150 },
];

/** Text fields sent as null when left empty, so the API stores nothing rather than "". */
const OPTIONAL_TEXT: (keyof DeveloperFormValues)[] = [
  "tagline",
  "short_description",
  "registration_number",
  "legal_name",
  "registered_name",
  "ntn_number",
  "strn_number",
  "license_number",
  "license_authority",
  "business_type",
  "history",
  "mission",
  "vision",
  "address",
  "google_maps_url",
  "phone",
  "whatsapp",
  "email",
  "business_hours",
  "website",
  "meta_title",
  "meta_description",
];

export type DeveloperFormValues = {
  name: string;
  company_type: DeveloperType;
  tagline?: string | null;
  short_description?: string | null;
  description?: string;
  sections: Partial<Record<DeveloperSection, DeveloperSectionContent>>;
  stats: Partial<Record<DeveloperStat, number | null>>;
  portfolio: DeveloperPortfolioItem[];
  history?: string | null;
  mission?: string | null;
  vision?: string | null;
  core_values: DeveloperListItem[];
  expertise: DeveloperListItem[];
  leadership: DeveloperLeader[];
  team: DeveloperTeamMember[];
  gallery: DeveloperGalleryItem[];
  faqs: DeveloperFaq[];

  established_year?: number | null;
  registration_number?: string | null;
  legal_name?: string | null;
  registered_name?: string | null;
  ntn_number?: string | null;
  strn_number?: string | null;
  license_number?: string | null;
  license_authority?: string | null;
  business_type?: string | null;
  city_id?: number | null;
  address?: string | null;
  google_maps_url?: string | null;
  highlights: string[];

  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  business_hours?: string | null;
  website?: string | null;
  social_links: DeveloperSocialLink[];

  meta_title?: string | null;
  meta_description?: string | null;
};

export const EMPTY_DEVELOPER: Partial<DeveloperFormValues> = {
  company_type: "developer",
  description: "",
  sections: {},
  stats: {},
  portfolio: [],
  highlights: [],
  core_values: [],
  expertise: [],
  leadership: [],
  team: [],
  gallery: [],
  faqs: [],
  social_links: [],
};

export function developerToFormValues(developer: Developer): DeveloperFormValues {
  return {
    name: developer.name,
    company_type: developer.company_type,
    tagline: developer.tagline,
    short_description: developer.short_description,
    description: developer.description ?? "",
    sections: developer.sections ?? {},
    stats: developer.stats_overrides ?? {},
    portfolio: developer.portfolio ?? [],
    history: developer.history ?? null,
    mission: developer.mission ?? null,
    vision: developer.vision ?? null,
    core_values: developer.core_values ?? [],
    expertise: developer.expertise ?? [],
    leadership: developer.leadership ?? [],
    team: developer.team ?? [],
    gallery: developer.gallery ?? [],
    faqs: developer.faqs ?? [],

    established_year: developer.established_year,
    registration_number: developer.registration_number,
    legal_name: developer.legal_name,
    registered_name: developer.registered_name,
    ntn_number: developer.ntn_number,
    strn_number: developer.strn_number,
    license_number: developer.license_number,
    license_authority: developer.license_authority,
    business_type: developer.business_type,
    city_id: developer.city_id,
    address: developer.address,
    google_maps_url: developer.google_maps_url,
    highlights: developer.highlights ?? [],

    phone: developer.phone,
    whatsapp: developer.whatsapp,
    email: developer.email,
    business_hours: developer.business_hours,
    website: developer.website,
    social_links: developer.social_links ?? [],

    meta_title: developer.meta_title,
    meta_description: developer.meta_description,
  };
}

function blank(value: string | null | undefined): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

/** Every string in a flat object, blanked to null when empty. */
function blankStrings<T extends object>(item: T): T {
  return Object.fromEntries(Object.entries(item).map(([key, value]) => [key, typeof value === "string" ? blank(value) : (value ?? null)])) as T;
}

/** Form values → API body. */
export function formValuesToPayload(values: DeveloperFormValues): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    ...values,
    established_year: values.established_year ?? null,
    city_id: values.city_id ?? null,
    sections: Object.fromEntries(Object.entries(values.sections ?? {}).map(([key, section]) => [key, blankStrings(section ?? {})])),
    stats: Object.fromEntries(Object.entries(values.stats ?? {}).map(([key, value]) => [key, typeof value === "number" ? value : null])),
    portfolio: (values.portfolio ?? []).filter((item) => item?.project_id).map((item) => ({ project_id: item.project_id, is_featured: Boolean(item.is_featured) })),
    core_values: (values.core_values ?? []).map(blankStrings),
    expertise: (values.expertise ?? []).map(blankStrings),
    leadership: (values.leadership ?? []).map(blankStrings),
    team: (values.team ?? []).map(blankStrings),
    gallery: (values.gallery ?? []).filter((photo) => photo?.url).map(blankStrings),
    faqs: (values.faqs ?? []).map((faq) => ({ ...faq, is_active: faq.is_active ?? true })),
    social_links: (values.social_links ?? []).map((link) => ({ ...link, is_active: link.is_active ?? true })),
  };

  for (const field of OPTIONAL_TEXT) {
    const value = values[field];
    payload[field] = typeof value === "string" && value.trim() !== "" ? value : null;
  }

  return payload;
}

/** Upload button for the logo or the cover; both need a saved company first. */
function ImageUpload({
  developer,
  type,
  label,
  hint,
  onSaved,
}: {
  developer: Developer | null;
  type: "logo" | "cover";
  label: string;
  hint: string;
  onSaved: (developer: Developer) => void;
}) {
  const { message } = App.useApp();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const url = type === "logo" ? developer?.logo_url : developer?.cover_url;

  const upload = async (file: File) => {
    if (!developer) {
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const body = new FormData();
      body.append("image", file);
      const response = await uploadForm<Resource<Developer>>(`portal/developer-profile/images/${type}`, body);
      message.success(`${label} uploaded`);
      onSaved(response.data);
    } catch (uploadError) {
      setError(uploadErrorMessage(uploadError, "image"));
    } finally {
      setUploading(false);
    }
  };

  return (
    <Flex vertical gap={10}>
      {type === "cover" && url ? (
        // eslint-disable-next-line @next/next/no-img-element -- a preview of an uploaded file on the API's storage
        <img src={url} alt="" style={{ width: "100%", aspectRatio: "3 / 1", objectFit: "cover", borderRadius: 8 }} />
      ) : null}
      <Flex align="center" gap={14}>
        {type === "logo" && <Avatar shape="square" size={72} src={url ?? undefined} icon={<BuildOutlined />} style={{ background: url ? "#fff" : undefined }} />}
        <Upload
          accept="image/png,image/jpeg,image/webp"
          showUploadList={false}
          disabled={!developer}
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
          <Button icon={<UploadOutlined />} loading={uploading} disabled={!developer}>
            {url ? `Replace ${label.toLowerCase()}` : `Upload ${label.toLowerCase()}`}
          </Button>
        </Upload>
      </Flex>
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        {developer ? hint : "Save your company details first, then upload images."}
      </Typography.Text>
      {error && <Alert type="error" showIcon title={error} />}
    </Flex>
  );
}

/**
 * Section label and heading, with the website's default wording as placeholders.
 * `description` adds an intro line under the heading.
 */
function SectionHeadingFields({ section, description = false }: { section: DeveloperSection; description?: boolean }) {
  const defaults = SECTION_DEFAULTS[section];

  return (
    <Row gutter={12}>
      <Col xs={24} md={10}>
        <Form.Item name={["sections", section, "label"]} label="Section label" rules={[{ max: 60 }]}>
          <Input placeholder={defaults.label} />
        </Form.Item>
      </Col>
      <Col xs={24} md={14}>
        <Form.Item name={["sections", section, "heading"]} label="Heading" rules={[{ max: 150 }]}>
          <Input placeholder={defaults.heading} />
        </Form.Item>
      </Col>
      {description && (
        <Col xs={24}>
          <Form.Item name={["sections", section, "description"]} label="Intro text" rules={[{ max: 1000 }]}>
            <Input.TextArea rows={2} maxLength={1000} showCount />
          </Form.Item>
        </Col>
      )}
    </Row>
  );
}

/** History, mission and vision share one shape: heading fields, the text column, and an icon or an image. */
function StoryCard({ section, field, placeholder, max }: { section: "history" | "mission" | "vision"; field: "history" | "mission" | "vision"; placeholder: string; max: number }) {
  return (
    <Card title={SECTION_DEFAULTS[section].heading} style={{ marginBottom: 16 }}>
      <SectionHeadingFields section={section} />
      <Form.Item name={field} label="Description" rules={[{ max }]}>
        <Input.TextArea rows={4} maxLength={max} showCount placeholder={placeholder} />
      </Form.Item>
      <Row gutter={12}>
        <Col xs={24} md={10}>
          <Form.Item name={["sections", section, "icon"]} label="Icon" extra="Used when there is no image.">
            <IconSelect />
          </Form.Item>
        </Col>
        <Col xs={24} md={14}>
          <Form.Item name={["sections", section, "image_url"]} label="Image" style={{ marginBottom: 0 }}>
            <SectionImage />
          </Form.Item>
        </Col>
      </Row>
    </Card>
  );
}

/** Repeater for the core values and the areas of expertise, which share one shape. */
function ListItemsField({ name, singular, titlePlaceholder }: { name: "core_values" | "expertise"; singular: string; titlePlaceholder: string }) {
  return (
    <Form.List name={name}>
      {(fields, { add, remove, move }) => (
        <>
          {fields.map((field, index) => (
            <RepeaterCard key={field.key} title={`${singular} ${index + 1}`} onRemove={() => remove(field.name)} {...moveProps(index, fields.length, move)}>
              <Row gutter={12}>
                <Col xs={24} md={8}>
                  <Form.Item name={[field.name, "icon"]} label="Icon">
                    <IconSelect />
                  </Form.Item>
                </Col>
                <Col xs={24} md={16}>
                  <Form.Item name={[field.name, "title"]} label="Name" rules={[{ required: true, whitespace: true, message: "Enter a name" }, { max: 100 }]}>
                    <Input placeholder={titlePlaceholder} />
                  </Form.Item>
                </Col>
                <Col xs={24}>
                  <Form.Item name={[field.name, "text"]} label="Description" rules={[{ max: 300 }]} style={{ marginBottom: 0 }}>
                    <Input.TextArea rows={2} maxLength={300} showCount />
                  </Form.Item>
                </Col>
              </Row>
            </RepeaterCard>
          ))}
          <Button icon={<PlusOutlined />} disabled={fields.length >= MAX_ITEMS} onClick={() => add({ icon: null, title: "", text: null })}>
            Add {singular.toLowerCase()}
          </Button>
        </>
      )}
    </Form.List>
  );
}

/** Contact links shared by leaders and team members. */
function PersonLinks({ name }: { name: number }) {
  return (
    <>
      <Col xs={24} md={8}>
        <Form.Item name={[name, "email"]} label="Email" rules={[{ type: "email" }]}>
          <Input />
        </Form.Item>
      </Col>
      <Col xs={24} md={8}>
        <Form.Item name={[name, "linkedin"]} label="LinkedIn" rules={[{ type: "url", message: "Enter a full address" }]}>
          <Input placeholder="https://" />
        </Form.Item>
      </Col>
      <Col xs={24} md={8}>
        <Form.Item name={[name, "facebook"]} label="Facebook" rules={[{ type: "url", message: "Enter a full address" }]}>
          <Input placeholder="https://" />
        </Form.Item>
      </Col>
    </>
  );
}

/** The portfolio picker: the company's own projects, in display order, with a featured switch each. */
function PortfolioField({ developer }: { developer: Developer | null }) {
  const projects = useQuery({
    queryKey: ["projects", "by-developer", developer?.id],
    queryFn: () => api<Paginated<Project>>("portal/projects", { query: { kind: "portfolio", per_page: 50 } }).then((response) => response.data),
    enabled: Boolean(developer),
  });

  if (!developer) {
    return <Alert type="info" showIcon title="Save your company details first; your portfolio projects are then linked to it automatically." />;
  }

  const options = (projects.data ?? []).map((project) => ({
    value: project.id,
    label: `${project.name} · ${PROJECT_STATUS_LABELS[project.status]}${project.construction_status ? ` · ${CONSTRUCTION_STATUS_LABELS[project.construction_status]}` : ""}`,
  }));

  return (
    <Form.List name="portfolio">
      {(fields, { add, remove, move }) => (
        <>
          {fields.length === 0 && (
            <Typography.Paragraph type="secondary">No projects picked, so the page shows every live project of this company, featured ones first.</Typography.Paragraph>
          )}
          {fields.map((field, index) => (
            <RepeaterCard
              key={field.key}
              title={`Project ${index + 1}`}
              onRemove={() => remove(field.name)}
              {...moveProps(index, fields.length, move)}
              extra={
                <Form.Item name={[field.name, "is_featured"]} valuePropName="checked" style={{ margin: "0 8px 0 0" }}>
                  <Switch size="small" checkedChildren="Featured" unCheckedChildren="Normal" />
                </Form.Item>
              }
            >
              <Form.Item name={[field.name, "project_id"]} rules={[{ required: true, message: "Pick a project" }]} style={{ marginBottom: 0 }}>
                <Select showSearch={{ optionFilterProp: "label" }} loading={projects.isLoading} options={options} placeholder="Pick a project" />
              </Form.Item>
            </RepeaterCard>
          ))}
          <Button icon={<PlusOutlined />} disabled={fields.length >= MAX_PORTFOLIO || options.length === 0} onClick={() => add({ is_featured: false })}>
            Add project
          </Button>
          {projects.isSuccess && options.length === 0 && (
            <Typography.Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
              You have no portfolio projects yet. Add one from Projects → Add Portfolio Project.
            </Typography.Paragraph>
          )}
          <Typography.Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
            Only live projects appear on the website. The image, name, status, location, price and type come from each project.
          </Typography.Paragraph>
        </>
      )}
    </Form.List>
  );
}

export function DeveloperForm({
  form,
  developer,
  onFinish,
  onSaved,
}: {
  form: FormInstance<DeveloperFormValues>;
  /** null while creating; the saved record once it exists, which images and counts need. */
  developer: Developer | null;
  onFinish: (values: DeveloperFormValues) => void;
  onSaved: (developer: Developer) => void;
}) {
  const metaDescription = Form.useWatch("meta_description", form);

  const cities = useQuery({
    queryKey: ["master", "cities", "all"],
    queryFn: () => api<Collection<City>>("public/cities").then((response) => response.data),
    staleTime: Infinity,
  });

  const overview = (
    <>
      <Card title="Company" style={{ marginBottom: 16 }}>
        <Row gutter={12}>
          <Col xs={24}>
            <Form.Item name="name" label="Company name" rules={[{ required: true, whitespace: true, message: "Enter the company name" }, { max: 150 }]}>
              <Input placeholder="e.g. Palm Developers (Pvt) Ltd" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="company_type" label="Company type" rules={[{ required: true }]}>
              <Select options={toOptions(DEVELOPER_TYPE_LABELS)} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="tagline" label="Tagline" rules={[{ max: 255 }]}>
              <Input placeholder="e.g. Building landmarks since 1998" />
            </Form.Item>
          </Col>
          <Col xs={24}>
            <Form.Item name="short_description" label="Short description" extra="Shown on company cards in the directory." rules={[{ max: 500 }]}>
              <Input.TextArea rows={3} showCount maxLength={500} />
            </Form.Item>
          </Col>
          <Col xs={24}>
            <Form.Item name="highlights" label="Highlights" extra="Trust strip under the header. Press Enter after each one, e.g. 25+ projects delivered." style={{ marginBottom: 0 }}>
              <Select mode="tags" allowClear maxCount={20} open={false} suffixIcon={null} placeholder="e.g. On-time delivery, LDA approved" />
            </Form.Item>
          </Col>
        </Row>
      </Card>

      <Card title="Company overview" style={{ marginBottom: 16 }}>
        <SectionHeadingFields section="overview" />
        <Form.Item name="description" label="Description">
          <RichTextEditor height={320} placeholder="Who you are, your track record, quality standards…" />
        </Form.Item>
        <Row gutter={12}>
          <Col xs={24} md={12}>
            <Form.Item name={["sections", "overview", "image_url"]} label="Company image" extra="Falls back to the first gallery photo, then the cover.">
              <SectionImage />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name={["sections", "overview", "button_label"]} label="Button label" rules={[{ max: 40 }]}>
              <Input placeholder="View Our Projects" />
            </Form.Item>
            <Form.Item
              name={["sections", "overview", "button_url"]}
              label="Button URL"
              extra="A full address, a site path (/projects) or a section (#projects). Empty jumps to the projects."
              rules={[{ max: 255 }, { pattern: /^(https?:\/\/|\/|#)/, message: "Start with https://, / or #" }]}
            >
              <Input placeholder="#projects" />
            </Form.Item>
          </Col>
        </Row>
        <Typography.Text type="secondary">The statistics in this block come from the Statistics & projects tab.</Typography.Text>
      </Card>
    </>
  );

  const story = (
    <>
      <StoryCard section="history" field="history" max={5000} placeholder="How and when the company started, milestones…" />
      <StoryCard section="mission" field="mission" max={2000} placeholder="What the company sets out to do." />
      <StoryCard section="vision" field="vision" max={2000} placeholder="Where the company is heading." />
    </>
  );

  const valuesTab = (
    <>
      <Card title="Core values" extra={<Typography.Text type="secondary">Shown in this order</Typography.Text>} style={{ marginBottom: 16 }}>
        <SectionHeadingFields section="values" description />
        <ListItemsField name="core_values" singular="Value" titlePlaceholder="e.g. Integrity" />
      </Card>
      <Card title="Areas of expertise" extra={<Typography.Text type="secondary">Shown in this order</Typography.Text>}>
        <SectionHeadingFields section="expertise" description />
        <ListItemsField name="expertise" singular="Area" titlePlaceholder="e.g. Residential projects" />
      </Card>
    </>
  );

  const statsAndProjects = (
    <>
      <Card title="Experience & statistics" style={{ marginBottom: 16 }}>
        <SectionHeadingFields section="stats" />
        <Typography.Paragraph type="secondary">Leave a figure empty to count it automatically. Type a number only to override it.</Typography.Paragraph>
        <Row gutter={12}>
          {STAT_FIELDS.map((stat) => {
            const shown = developer?.stats?.[stat.name];

            return (
              <Col xs={12} md={8} key={stat.name}>
                <Form.Item
                  name={["stats", stat.name]}
                  label={stat.label}
                  extra={developer ? `Auto: ${STAT_SOURCES[stat.name]}${shown !== undefined && shown !== null ? ` · showing ${shown.toLocaleString()}` : ""}` : `Auto: ${STAT_SOURCES[stat.name]}`}
                >
                  <InputNumber min={0} max={10000000} style={{ width: "100%" }} placeholder="Auto" controls={false} />
                </Form.Item>
              </Col>
            );
          })}
        </Row>
      </Card>
      <Card title="Projects / portfolio">
        <SectionHeadingFields section="projects" description />
        <PortfolioField developer={developer} />
      </Card>
    </>
  );

  const gallery = (
    <Card title="Our work gallery" extra={<Typography.Text type="secondary">Shown in this order; the first photo is shown large</Typography.Text>}>
      <SectionHeadingFields section="gallery" description />
      <Form.List name="gallery">
        {(fields, { add, remove, move }) => (
          <>
            {fields.map((field, index) => (
              <RepeaterCard key={field.key} title={`Photo ${index + 1}`} onRemove={() => remove(field.name)} {...moveProps(index, fields.length, move)}>
                <Row gutter={12}>
                  <Col xs={24} md={8}>
                    <Form.Item name={[field.name, "url"]} label="Image" rules={[{ required: true, message: "Upload a photo" }]}>
                      <SectionImage />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={16}>
                    <Row gutter={12}>
                      <Col xs={24} md={12}>
                        <Form.Item name={[field.name, "title"]} label="Title" rules={[{ max: 100 }]}>
                          <Input />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={12}>
                        <Form.Item name={[field.name, "category"]} label="Category">
                          <Select allowClear options={toOptions(GALLERY_CATEGORY_LABELS)} placeholder="Pick a category" />
                        </Form.Item>
                      </Col>
                      <Col xs={24}>
                        <Form.Item name={[field.name, "caption"]} label="Caption" rules={[{ max: 300 }]}>
                          <Input />
                        </Form.Item>
                      </Col>
                      <Col xs={24}>
                        <Form.Item name={[field.name, "alt"]} label="Alt text" extra="Describes the photo for screen readers and search engines." rules={[{ max: 150 }]} style={{ marginBottom: 0 }}>
                          <Input />
                        </Form.Item>
                      </Col>
                    </Row>
                  </Col>
                </Row>
              </RepeaterCard>
            ))}
            <Button icon={<PlusOutlined />} disabled={fields.length >= MAX_GALLERY} onClick={() => add({ url: null })}>
              Add photo
            </Button>
          </>
        )}
      </Form.List>
    </Card>
  );

  const people = (
    <>
      <Card title="Leadership" extra={<Typography.Text type="secondary">Shown in this order</Typography.Text>} style={{ marginBottom: 16 }}>
        <SectionHeadingFields section="leadership" description />
        <Form.List name="leadership">
          {(fields, { add, remove, move }) => (
            <>
              {fields.map((field, index) => (
                <RepeaterCard key={field.key} title={`Leader ${index + 1}`} onRemove={() => remove(field.name)} {...moveProps(index, fields.length, move)}>
                  <Row gutter={12}>
                    <Col xs={24} md={8}>
                      <Form.Item name={[field.name, "photo_url"]} label="Profile image">
                        <SectionImage shape="circle" hint="Portrait, at least 600 px tall." />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={16}>
                      <Row gutter={12}>
                        <Col xs={24} md={12}>
                          <Form.Item name={[field.name, "name"]} label="Name" rules={[{ required: true, whitespace: true, message: "Enter a name" }, { max: 100 }]}>
                            <Input />
                          </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                          <Form.Item name={[field.name, "designation"]} label="Designation" rules={[{ max: 100 }]}>
                            <Input placeholder="e.g. CEO & Managing Director" />
                          </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                          <Form.Item name={[field.name, "experience"]} label="Experience" rules={[{ max: 50 }]}>
                            <Input placeholder="e.g. 25+ years" />
                          </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                          <Form.Item name={[field.name, "specialization"]} label="Specialization" rules={[{ max: 150 }]}>
                            <Input placeholder="e.g. Real estate development" />
                          </Form.Item>
                        </Col>
                      </Row>
                    </Col>
                    <Col xs={24}>
                      <Form.Item name={[field.name, "bio"]} label="Biography" rules={[{ max: 2000 }]}>
                        <Input.TextArea rows={4} maxLength={2000} showCount />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={16}>
                      <Form.Item name={[field.name, "quote"]} label="Quote" rules={[{ max: 1000 }]}>
                        <Input.TextArea rows={3} maxLength={1000} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                      <Form.Item name={[field.name, "signature_url"]} label="Signature image">
                        <SectionImage hint="Transparent PNG works best." />
                      </Form.Item>
                    </Col>
                    <PersonLinks name={field.name} />
                  </Row>
                </RepeaterCard>
              ))}
              <Button icon={<PlusOutlined />} disabled={fields.length >= MAX_LEADERS} onClick={() => add({ name: "" })}>
                Add leader
              </Button>
            </>
          )}
        </Form.List>
      </Card>

      <Card title="Our team" extra={<Typography.Text type="secondary">Shown in this order</Typography.Text>}>
        <SectionHeadingFields section="team" description />
        <Form.List name="team">
          {(fields, { add, remove, move }) => (
            <>
              {fields.map((field, index) => (
                <RepeaterCard key={field.key} title={`Member ${index + 1}`} onRemove={() => remove(field.name)} {...moveProps(index, fields.length, move)}>
                  <Row gutter={12}>
                    <Col xs={24} md={8}>
                      <Form.Item name={[field.name, "photo_url"]} label="Profile image">
                        <SectionImage shape="circle" hint="Portrait, at least 600 px tall." />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={16}>
                      <Row gutter={12}>
                        <Col xs={24} md={12}>
                          <Form.Item name={[field.name, "name"]} label="Name" rules={[{ required: true, whitespace: true, message: "Enter a name" }, { max: 100 }]}>
                            <Input />
                          </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                          <Form.Item name={[field.name, "designation"]} label="Designation" rules={[{ max: 100 }]}>
                            <Input placeholder="e.g. Project Manager" />
                          </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                          <Form.Item name={[field.name, "experience"]} label="Years of experience" rules={[{ max: 50 }]}>
                            <Input placeholder="e.g. 6+ years" />
                          </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                          <Form.Item name={[field.name, "specialization"]} label="Specialization" rules={[{ max: 150 }]}>
                            <Input placeholder="e.g. Structural engineering" />
                          </Form.Item>
                        </Col>
                      </Row>
                    </Col>
                    <Col xs={24}>
                      <Form.Item name={[field.name, "bio"]} label="Short description" rules={[{ max: 600 }]}>
                        <Input.TextArea rows={2} maxLength={600} showCount />
                      </Form.Item>
                    </Col>
                    <PersonLinks name={field.name} />
                  </Row>
                </RepeaterCard>
              ))}
              <Button icon={<PlusOutlined />} disabled={fields.length >= MAX_ITEMS} onClick={() => add({ name: "" })}>
                Add team member
              </Button>
            </>
          )}
        </Form.List>
      </Card>
    </>
  );

  const registration = (
    <Card title="Company registration & verification">
      <SectionHeadingFields section="registration" />
      <Row gutter={12}>
        {REGISTRATION_FIELDS.map((field) => (
          <Col xs={24} md={12} key={field.name}>
            <Form.Item name={field.name} label={field.label} rules={[{ max: field.max }]}>
              <Input placeholder={field.placeholder} />
            </Form.Item>
          </Col>
        ))}
        <Col xs={24} md={12}>
          <Form.Item name="established_year" label="Year established" rules={[{ type: "number", min: 1900, max: new Date().getFullYear() }]}>
            <InputNumber style={{ width: "100%" }} placeholder="e.g. 1998" controls={false} />
          </Form.Item>
        </Col>
        <Col xs={24}>
          <Alert
            type="info"
            showIcon
            title={developer?.is_verified ? "Your company is verified" : "Verification is done by the DHA GUJ team"}
            description={developer?.is_verified ? undefined : "Fill in your registration details; the team checks them and adds the verified badge."}
          />
        </Col>
      </Row>
    </Card>
  );

  const contact = (
    <>
      <Card title="Contact / get in touch" style={{ marginBottom: 16 }}>
        <SectionHeadingFields section="contact" description />
        <Row gutter={12}>
          <Col xs={24} md={8}>
            <Form.Item name="email" label="Email" rules={[{ type: "email" }]}>
              <Input />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item name="phone" label="Phone" rules={[{ max: 20 }]}>
              <Input placeholder="03001234567" />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item name="whatsapp" label="WhatsApp" rules={[{ max: 20 }]}>
              <Input placeholder="03001234567" />
            </Form.Item>
          </Col>
          <Col xs={24} md={16}>
            <Form.Item name="address" label="Office address" rules={[{ max: 255 }]}>
              <Input />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item name="city_id" label="City">
              <Select
                allowClear
                showSearch={{ optionFilterProp: "label" }}
                loading={cities.isLoading}
                options={(cities.data ?? []).map((city) => ({ value: city.id, label: city.name }))}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="business_hours" label="Business hours" rules={[{ max: 150 }]}>
              <Input placeholder="e.g. Monday – Saturday, 9:00 AM – 7:00 PM" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="google_maps_url" label="Google Maps URL" rules={[{ type: "url", message: "Enter a full address" }, { max: 500 }]}>
              <Input placeholder="https://maps.google.com/…" />
            </Form.Item>
          </Col>
          <Col xs={24}>
            <Form.Item name="website" label="Website" rules={[{ type: "url", message: "Enter a full address, e.g. https://example.com" }]} style={{ marginBottom: 0 }}>
              <Input placeholder="https://example.com" />
            </Form.Item>
          </Col>
        </Row>
      </Card>

      <Card title="Social media / connect with us" extra={<Typography.Text type="secondary">Shown in this order; the icon follows the platform</Typography.Text>}>
        <SectionHeadingFields section="social" description />
        <Form.List name="social_links">
          {(fields, { add, remove, move }) => (
            <>
              {fields.map((field, index) => (
                <RepeaterCard
                  key={field.key}
                  title={`Link ${index + 1}`}
                  onRemove={() => remove(field.name)}
                  {...moveProps(index, fields.length, move)}
                  extra={
                    <Form.Item name={[field.name, "is_active"]} valuePropName="checked" style={{ margin: "0 8px 0 0" }}>
                      <Switch size="small" checkedChildren="Active" unCheckedChildren="Hidden" />
                    </Form.Item>
                  }
                >
                  <Row gutter={12}>
                    <Col xs={24} md={8}>
                      <Form.Item name={[field.name, "platform"]} label="Platform" rules={[{ required: true, message: "Pick a platform" }]} style={{ marginBottom: 0 }}>
                        <Select options={toOptions(SOCIAL_PLATFORM_LABELS)} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={16}>
                      <Form.Item
                        name={[field.name, "url"]}
                        label="URL"
                        rules={[{ required: true, message: "Enter the link" }, { type: "url", message: "Enter a full address" }]}
                        style={{ marginBottom: 0 }}
                      >
                        <Input placeholder="https://" />
                      </Form.Item>
                    </Col>
                  </Row>
                </RepeaterCard>
              ))}
              <Button icon={<PlusOutlined />} disabled={fields.length >= 12} onClick={() => add({ is_active: true })}>
                Add social link
              </Button>
            </>
          )}
        </Form.List>
      </Card>
    </>
  );

  const faqs = (
    <Card title="FAQs" extra={<Typography.Text type="secondary">Shown in this order</Typography.Text>}>
      <SectionHeadingFields section="faqs" description />
      <Form.List name="faqs">
        {(fields, { add, remove, move }) => (
          <>
            {fields.map((field, index) => (
              <RepeaterCard
                key={field.key}
                title={`FAQ ${index + 1}`}
                onRemove={() => remove(field.name)}
                {...moveProps(index, fields.length, move)}
                extra={
                  <Form.Item name={[field.name, "is_active"]} valuePropName="checked" style={{ margin: "0 8px 0 0" }}>
                    <Switch size="small" checkedChildren="Published" unCheckedChildren="Hidden" />
                  </Form.Item>
                }
              >
                <Form.Item name={[field.name, "question"]} label="Question" rules={[{ required: true, whitespace: true, message: "Write the question" }, { max: 255 }]}>
                  <Input placeholder="e.g. Are your projects DHA approved?" />
                </Form.Item>
                <Form.Item
                  name={[field.name, "answer"]}
                  label="Answer"
                  rules={[{ validator: (_, value?: string) => (htmlText(value).length > 0 ? Promise.resolve() : Promise.reject(new Error("Write the answer"))) }]}
                  style={{ marginBottom: 0 }}
                >
                  <RichTextEditor height={200} />
                </Form.Item>
              </RepeaterCard>
            ))}
            <Button icon={<PlusOutlined />} disabled={fields.length >= MAX_FAQS} onClick={() => add({ is_active: true })}>
              Add FAQ
            </Button>
          </>
        )}
      </Form.List>
    </Card>
  );

  const seo = (
    <Card title="SEO information">
      <Row gutter={12}>
        <Col xs={24} md={12}>
          <Form.Item name="meta_title" label="Meta title" extra="Falls back to the company name." rules={[{ max: 255 }]}>
            <Input />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item
            name="meta_description"
            label="Meta description"
            extra={`${(metaDescription ?? "").length}/300 — falls back to the short description.`}
            rules={[{ max: 300 }]}
          >
            <Input.TextArea rows={2} maxLength={300} />
          </Form.Item>
        </Col>
      </Row>
    </Card>
  );

  return (
    <Form form={form} layout="vertical" initialValues={EMPTY_DEVELOPER} onFinish={onFinish} scrollToFirstError>
      <Row gutter={16}>
        <Col xs={24} xl={16}>
          <Tabs
            // Every tab stays mounted so validation errors on a hidden tab still block the save.
            destroyOnHidden={false}
            items={[
              { key: "overview", label: "Overview", children: overview, forceRender: true },
              { key: "story", label: "History, mission & vision", children: story, forceRender: true },
              { key: "values", label: "Values & expertise", children: valuesTab, forceRender: true },
              { key: "stats", label: "Statistics & projects", children: statsAndProjects, forceRender: true },
              { key: "gallery", label: "Gallery", children: gallery, forceRender: true },
              { key: "people", label: "Leadership & team", children: people, forceRender: true },
              { key: "registration", label: "Registration", children: registration, forceRender: true },
              { key: "contact", label: "Contact & social", children: contact, forceRender: true },
              { key: "faqs", label: "FAQs", children: faqs, forceRender: true },
              { key: "seo", label: "SEO", children: seo, forceRender: true },
            ]}
          />
        </Col>

        <Col xs={24} xl={8}>
          <Card title="Logo" style={{ marginBottom: 16 }}>
            <ImageUpload developer={developer} type="logo" label="Logo" hint="Square or wide PNG with a transparent background works best." onSaved={onSaved} />
          </Card>

          {developer && !developer.is_active && (
            <Alert
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
              title="Your company page is not live yet"
              description="The DHA GUJ team reviews new company pages and switches them on. You can keep editing in the meantime."
            />
          )}

          <Card title="Cover image" style={{ marginBottom: 16 }}>
            <ImageUpload developer={developer} type="cover" label="Cover" hint="Wide banner, about 1600 × 530 px." onSaved={onSaved} />
          </Card>

          {developer && (
            <Card title="Your company page">
              <Flex vertical gap={8}>
                <div>
                  <Typography.Text type="secondary">Projects</Typography.Text>
                  <div>
                    <Typography.Text strong>{developer.projects_count ?? 0}</Typography.Text> live
                    {developer.all_projects_count !== undefined && ` · ${developer.all_projects_count} linked in total`}
                  </div>
                </div>
                <div>
                  <Typography.Text type="secondary">Company page URL</Typography.Text>
                  <div>
                    <Typography.Link href={developer.public_url} target="_blank" rel="noopener noreferrer" ellipsis>
                      {developer.public_url}
                    </Typography.Link>
                  </div>
                </div>
              </Flex>
            </Card>
          )}
        </Col>
      </Row>
    </Form>
  );
}

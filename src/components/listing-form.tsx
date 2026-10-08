"use client";

import {
  ApartmentOutlined,
  AppstoreOutlined,
  BankOutlined,
  BorderOutlined,
  BuildOutlined,
  BulbOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  CheckOutlined,
  CheckSquareOutlined,
  CompassOutlined,
  DollarOutlined,
  EnvironmentOutlined,
  ExpandOutlined,
  FileTextOutlined,
  FlagOutlined,
  FontSizeOutlined,
  GoldOutlined,
  HomeOutlined,
  IdcardOutlined,
  CoffeeOutlined,
  InsuranceOutlined,
  KeyOutlined,
  LayoutOutlined,
  LockOutlined,
  NumberOutlined,
  PictureOutlined,
  ProfileOutlined,
  RocketOutlined,
  ShopOutlined,
  SkinOutlined,
  StarOutlined,
  SwapOutlined,
  TagOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { Card, Col, Form, Input, InputNumber, Row, Select, Skeleton, Switch, Tag, Typography, type FormInstance } from "antd";
import { useEffect, type ReactNode } from "react";
import { AreaSizeField, PriceInput, YearBuiltField } from "@/components/listing-inputs";
import { RichTextEditor } from "@/components/rich-text-editor";
import { useMe } from "@/hooks/use-me";
import { groupAmenities } from "@/lib/amenities";
import { api } from "@/lib/api-client";
import { FURNISHED_LABELS, PROPERTY_AVAILABILITY_LABELS, PROPERTY_STATUS_COLORS, PROPERTY_STATUS_LABELS, formatCompactPrice, formatDate } from "@/lib/labels";
import type {
  AgentsResponse,
  Amenity,
  AreaUnit,
  Block,
  Collection,
  FurnishedStatus,
  ListingLocation,
  Property,
  PropertyAvailability,
  PropertyCategory,
  PropertyPurpose,
  PropertyType,
  Sector,
} from "@/types/api";

export type ListingFormValues = {
  purpose: PropertyPurpose;
  category: PropertyCategory;
  property_type_id?: number;
  title: string;
  /** HTML from the rich text editor. */
  description: string;
  price?: number;
  is_negotiable: boolean;
  installment_available: boolean;
  advance_amount?: number | null;
  monthly_installment?: number | null;
  installments_count?: number | null;
  area_size?: number;
  area_unit: AreaUnit;
  phase?: string | null;
  sector?: string | null;
  block?: string | null;
  /** House / plot number: private, only the owner and admins see it. */
  plot_number?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  kitchens?: number | null;
  year_built?: number | null;
  furnished?: FurnishedStatus | null;
  amenity_ids: number[];
  /** Agency only: the agent whose profile and contact details the listing shows. */
  agent_user_id?: number | null;
  property_status: PropertyAvailability;
  is_urgent: boolean;
};

export const EMPTY_LISTING: Partial<ListingFormValues> = {
  purpose: "sale",
  category: "residential",
  area_unit: "marla",
  is_negotiable: false,
  installment_available: false,
  amenity_ids: [],
  property_status: "available",
  is_urgent: false,
};

const toNumber = (value: string | null) => (value === null ? null : Number(value));

export function propertyToFormValues(property: Property): ListingFormValues {
  return {
    purpose: property.purpose,
    category: property.property_type?.category ?? "residential",
    property_type_id: property.property_type?.id,
    title: property.title,
    description: property.description,
    price: Number(property.price),
    is_negotiable: property.is_negotiable,
    installment_available: property.installment_available,
    advance_amount: toNumber(property.advance_amount),
    monthly_installment: toNumber(property.monthly_installment),
    installments_count: property.installments_count,
    area_size: Number(property.area_size),
    area_unit: property.area_unit,
    phase: property.phase,
    sector: property.sector,
    block: property.block,
    plot_number: property.plot_number,
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
    kitchens: property.kitchens,
    year_built: property.year_built,
    furnished: property.furnished,
    amenity_ids: (property.amenities ?? []).map((amenity) => amenity.id),
    agent_user_id: property.agent_user_id,
    property_status: property.property_status,
    is_urgent: property.is_urgent,
  };
}

/** Form values → API body: drops UI-only fields and clears fields that do not apply to the property type. */
export function formValuesToPayload(values: ListingFormValues): Record<string, unknown> {
  const payload: Record<string, unknown> = { ...values };
  delete payload.category;

  if (!values.installment_available) {
    payload.advance_amount = null;
    payload.monthly_installment = null;
    payload.installments_count = null;
  }

  if (values.category !== "residential") {
    payload.bedrooms = null;
  }

  if (values.category === "plot") {
    payload.bathrooms = null;
    payload.kitchens = null;
    payload.year_built = null;
    payload.furnished = null;
  }

  for (const [key, value] of Object.entries(payload)) {
    if (value === "" || value === undefined) {
      payload[key] = null;
    }
  }

  return payload;
}

export function Section({ title, extra, children }: { title: string; extra?: ReactNode; children: ReactNode }) {
  return (
    <Card title={title} extra={extra} style={{ marginBottom: 16 }}>
      {children}
    </Card>
  );
}

/**
 * A phase or sector name: a searchable list when master data exists, otherwise free text.
 * The saved value is always the name, and a stored name that is no longer in the list still shows.
 */
export function NameChoice({
  names,
  loading,
  placeholder,
  value,
  onChange,
  onPick,
  disabled,
}: {
  names: { id: number; name: string }[] | undefined;
  loading: boolean;
  placeholder: string;
  value?: string | null;
  onChange?: (value: string | null) => void;
  /** Called when a name is picked from the list (not while typing free text). */
  onPick?: () => void;
  disabled?: boolean;
}) {
  if (loading) {
    return <Select loading disabled placeholder="Loading…" value={value ?? undefined} />;
  }

  if (!names || names.length === 0) {
    return <Input placeholder={placeholder} maxLength={50} value={value ?? ""} disabled={disabled} onChange={(event) => onChange?.(event.target.value)} />;
  }

  const options = names.map((item) => ({ value: item.name, label: item.name }));

  if (value && !options.some((option) => option.value === value)) {
    options.unshift({ value, label: value });
  }

  return (
    <Select
      showSearch={{ optionFilterProp: "label" }}
      allowClear
      placeholder={placeholder}
      disabled={disabled}
      value={value ?? undefined}
      options={options}
      onChange={(next) => {
        onChange?.(next ?? null);
        onPick?.();
      }}
    />
  );
}

export const withCommas = (value: number | string | undefined) => `${value ?? ""}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
export const withoutCommas = (value: string | undefined) => Number((value ?? "").replace(/,/g, ""));

/** The visible text of rich text HTML, for length checks. */
function htmlText(html: string | undefined): string {
  if (!html) {
    return "";
  }

  return (new DOMParser().parseFromString(html, "text/html").body.textContent ?? "").trim();
}

/* ---------- Building blocks for the listing form layout ---------- */

/** A full-width card: icon and title on the left, the fields on the right. */
function FormBlock({ icon, title, hint, children }: { icon: ReactNode; title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="lf-block">
      <div className="lf-block-head">
        <span className="lf-block-icon">{icon}</span>
        <h3 className="lf-block-title">{title}</h3>
        {hint && <p className="lf-block-hint">{hint}</p>}
      </div>
      <div className="lf-block-body">{children}</div>
    </section>
  );
}

/** One question inside a block: a small icon in the gutter, a label, an optional hint and action. */
export function Field({
  icon,
  label,
  hint,
  action,
  children,
}: {
  icon: ReactNode;
  label: ReactNode;
  hint?: ReactNode;
  action?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="lf-field">
      <span className="lf-field-icon">{icon}</span>
      <div className="lf-field-main">
        <div className="lf-field-head">
          <div>
            <div className="lf-field-label">{label}</div>
            {hint && <div className="lf-field-hint">{hint}</div>}
          </div>
          {action}
        </div>
        {children}
      </div>
    </div>
  );
}

type ChipOption<T> = { value: T; label: ReactNode; icon?: ReactNode };

/** Pill buttons for a single choice. Works as a Form.Item control (value / onChange). */
function ChipGroup<T extends string | number>({
  options,
  value,
  onChange,
  disabled,
  clearable = false,
}: {
  options: ChipOption<T>[];
  value?: T | null;
  onChange?: (value: T | null) => void;
  disabled?: boolean;
  /** Clicking the chosen chip again clears the choice. */
  clearable?: boolean;
}) {
  return (
    <div className="lf-chips" role="radiogroup">
      {options.map((option) => {
        const active = option.value === value;

        return (
          <button
            key={String(option.value)}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            className={`lf-chip${active ? " active" : ""}`}
            onClick={() => onChange?.(active && clearable ? null : option.value)}
          >
            {option.icon}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/** Number chips 1–max, then a "max+" chip that opens a number box for larger values. */
function CountChips({
  max = 8,
  limit,
  value,
  onChange,
  disabled,
}: {
  max?: number;
  limit: number;
  value?: number | null;
  onChange?: (value: number | null) => void;
  disabled?: boolean;
}) {
  const many = typeof value === "number" && value > max;
  const options: ChipOption<number>[] = Array.from({ length: max }, (_, index) => ({ value: index + 1, label: index + 1 }));

  return (
    <div className="lf-chips">
      <ChipGroup options={options} value={many ? null : value} onChange={onChange} disabled={disabled} clearable />
      <button type="button" disabled={disabled} className={`lf-chip${many ? " active" : ""}`} onClick={() => onChange?.(many ? null : max + 1)}>
        {max}+
      </button>
      {many && <InputNumber size="small" min={max + 1} max={limit} value={value} disabled={disabled} onChange={(next) => onChange?.(next ?? null)} style={{ width: 90 }} />}
    </div>
  );
}

/** "Add at least N …" nudge with a percentage, like a progress score. */
export function QualityTip({ text, current, target }: { text: string; current: number; target: number }) {
  const percent = Math.min(100, Math.round((current / target) * 100));
  const done = percent >= 100;

  return (
    <div className={`lf-tip${done ? " done" : ""}`}>
      <BulbOutlined className="lf-tip-icon" />
      <div className="lf-tip-text">
        <strong>{done ? "Looks great" : "Quality tip"}</strong>
        <span>{done ? "This part of your listing is complete." : text}</span>
      </div>
      <span className="lf-tip-score">{percent}%</span>
    </div>
  );
}

/** A switch on the right of a label and description, for yes/no questions. */
function ToggleRow({ name, label, hint, disabled }: { name: keyof ListingFormValues; label: string; hint: string; disabled?: boolean }) {
  return (
    <div className="lf-toggle">
      <div>
        <div className="lf-field-label">{label}</div>
        <div className="lf-field-hint">{hint}</div>
      </div>
      <Form.Item name={name} valuePropName="checked" noStyle>
        <Switch disabled={disabled} />
      </Form.Item>
    </div>
  );
}

/** A best-guess icon for a property type chip, from its name. */
function propertyTypeIcon(type: PropertyType): ReactNode {
  const name = `${type.slug} ${type.name}`.toLowerCase();

  if (/flat|apartment|penthouse/.test(name)) return <ApartmentOutlined />;
  if (/shop|mart|store/.test(name)) return <ShopOutlined />;
  if (/office/.test(name)) return <BankOutlined />;
  if (/warehouse|factory|godown/.test(name)) return <GoldOutlined />;
  if (/building|plaza/.test(name)) return <BuildOutlined />;
  if (/plot|land|file/.test(name)) return <BorderOutlined />;
  if (/house|home|villa|farm|portion|room|annexe/.test(name)) return <HomeOutlined />;
  return <AppstoreOutlined />;
}

/**
 * Which building details a property type has: none for plots and land, bedrooms only for homes,
 * bathrooms, year built and furnishing for any built property.
 */
function detailsFor(category: PropertyCategory, type: PropertyType | undefined) {
  const land = category === "plot" || (type !== undefined && /plot|land|file/i.test(`${type.slug} ${type.name}`));

  return { built: !land, bedrooms: !land && category === "residential" };
}

const AMENITY_TARGET = 5;

/** Amenities that apply to a property type: those assigned to it, plus those assigned to no type (every type). */
export function featuresFor(amenities: Amenity[], propertyTypeId: number | undefined): Amenity[] {
  if (!propertyTypeId) {
    return [];
  }

  return amenities.filter((amenity) => !amenity.property_type_ids?.length || amenity.property_type_ids.includes(propertyTypeId));
}

/** Toggle chips for the amenities, under their group headings. */
function FeatureChips({ features, value = [], onChange, disabled }: { features: Amenity[]; value?: number[]; onChange?: (ids: number[]) => void; disabled?: boolean }) {
  return (
    <div className="lf-feature-groups">
      {groupAmenities(features).map((block) => (
        <div key={block.key} className="lf-feature-group">
          {block.label && <div className="lf-feature-group-title">{block.label}</div>}
          <div className="lf-chips">
            {block.amenities.map((feature) => {
              const active = value.includes(feature.id);

              return (
                <button
                  key={feature.id}
                  type="button"
                  role="checkbox"
                  aria-checked={active}
                  disabled={disabled}
                  className={`lf-chip${active ? " active" : ""}`}
                  onClick={() => onChange?.(active ? value.filter((id) => id !== feature.id) : [...value, feature.id])}
                >
                  {active && <CheckOutlined />}
                  {feature.name}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/** A read-only row of the listing's current state, e.g. "Featured · until 12 Oct". */
function StateRow({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <div className="lf-state-row">
      <div>
        <div className="lf-field-label">{label}</div>
        {hint && <div className="lf-field-hint">{hint}</div>}
      </div>
      <div>{value}</div>
    </div>
  );
}

const PROPERTY_STATUS_HINTS: Record<PropertyAvailability, string> = {
  available: "On the market and shown in search.",
  under_offer: "Still shown in search, marked as under offer.",
  sold: "The page stays online with a SOLD notice and similar listings, but leaves search and frees its slot.",
  rented: "The page stays online with a RENTED notice and similar listings, but leaves search and frees its slot.",
};

/**
 * Who buyers contact. Never typed per listing: it comes from the account, the agency or the chosen agent's profile.
 */
function ContactBlock({ property, disabled }: { property?: Property; disabled?: boolean }) {
  const me = useMe();
  const isAgency = me.data?.account_type === "agency";
  const postedByAgent = property?.owner?.account_type === "agent";
  const agents = useQuery({
    queryKey: ["agents"],
    queryFn: () => api<AgentsResponse>("portal/agents"),
    enabled: isAgency,
  });

  if (!me.data) {
    return <Skeleton active paragraph={{ rows: 1 }} />;
  }

  if (me.data.account_type === "agent" || postedByAgent) {
    const agentName = postedByAgent ? property?.owner?.name : me.data.name;

    return (
      <Field icon={<IdcardOutlined />} label="Shown on the listing" hint="The agent's public profile: name, photo, phone and WhatsApp. Change them on the agent profile page.">
        <Tag icon={<UserOutlined />}>{agentName}</Tag>
      </Field>
    );
  }

  if (!isAgency) {
    return (
      <Field icon={<IdcardOutlined />} label="Shown on the listing" hint="Your account name and phone number. Change them on your profile page.">
        <Tag icon={<UserOutlined />}>
          {me.data.name}
          {me.data.phone ? ` · ${me.data.phone}` : ""}
        </Tag>
      </Field>
    );
  }

  const activeAgents = (agents.data?.data ?? []).filter((agent) => agent.status === "active");

  return (
    <Field
      icon={<TeamOutlined />}
      label="Agent on this listing"
      hint="By default the listing shows your agency's contact details. Pick an agent to show their profile, phone and WhatsApp instead."
    >
      <Form.Item name="agent_user_id">
        <Select
          allowClear
          disabled={disabled}
          loading={agents.isLoading}
          placeholder={`${me.data.name} (agency contact)`}
          options={activeAgents.map((agent) => ({ value: agent.id, label: `${agent.name}${agent.phone ? ` · ${agent.phone}` : ""}` }))}
          notFoundContent="No active agents yet. Add agents on the Agents page."
        />
      </Form.Item>
    </Field>
  );
}

export function ListingForm({
  form,
  onFinish,
  disabled = false,
  media,
  property,
}: {
  form: FormInstance<ListingFormValues>;
  onFinish: (values: ListingFormValues) => void;
  disabled?: boolean;
  /** Photos & videos block content, shown as the Media section. */
  media?: ReactNode;
  /** The saved listing, when editing: its listing status and promotions are shown read-only. */
  property?: Property;
}) {
  const category = Form.useWatch("category", form) ?? "residential";
  const propertyTypeId = Form.useWatch("property_type_id", form);
  const phaseName = Form.useWatch("phase", form);
  const sectorName = Form.useWatch("sector", form);
  const price = Form.useWatch("price", form);
  const installments = Form.useWatch("installment_available", form);
  const amenityIds = Form.useWatch("amenity_ids", form);
  const propertyStatus = Form.useWatch("property_status", form) ?? "available";

  const propertyTypes = useQuery({
    queryKey: ["master", "property-types"],
    queryFn: () => api<Collection<PropertyType>>("public/property-types").then((response) => response.data),
    staleTime: Infinity,
  });
  const location = useQuery({
    queryKey: ["master", "listing-location"],
    queryFn: () => api<{ data: ListingLocation }>("public/listing-location").then((response) => response.data),
    staleTime: Infinity,
  });
  // Listings store the phase name, so find the chosen phase's id to load its sectors.
  const phaseId = location.data?.phases.find((phase) => phase.name === phaseName)?.id;
  const sectors = useQuery({
    queryKey: ["master", "sectors", phaseId],
    queryFn: () => api<Collection<Sector>>("public/sectors", { query: { phase_id: phaseId } }).then((response) => response.data),
    enabled: Boolean(phaseId),
    staleTime: Infinity,
  });
  // Same for the sector: its name identifies the record whose blocks we load.
  const sectorId = sectors.data?.find((sector) => sector.name === sectorName)?.id;
  const blocks = useQuery({
    queryKey: ["master", "blocks", sectorId],
    queryFn: () => api<Collection<Block>>("public/blocks", { query: { sector_id: sectorId } }).then((response) => response.data),
    enabled: Boolean(sectorId),
    staleTime: Infinity,
  });
  const amenities = useQuery({
    queryKey: ["master", "amenities"],
    queryFn: () => api<Collection<Amenity>>("public/amenities").then((response) => response.data),
    staleTime: Infinity,
  });

  const typeOptions = (propertyTypes.data ?? [])
    .filter((type) => type.category === category)
    .map((type) => ({ value: type.id, label: type.name, icon: propertyTypeIcon(type) }));
  const details = detailsFor(
    category,
    (propertyTypes.data ?? []).find((type) => type.id === propertyTypeId),
  );
  const features = featuresFor(amenities.data ?? [], propertyTypeId);
  const chosenFeatures = features.filter((feature) => (amenityIds ?? []).includes(feature.id)).length;

  // A new listing starts on the default phase (Phase 1).
  useEffect(() => {
    if (!property && location.data && !form.getFieldValue("phase")) {
      form.setFieldValue("phase", location.data.default_phase);
    }
  }, [property, location.data, form]);

  // A different property type offers different amenities: drop the ones it does not have.
  useEffect(() => {
    if (!amenities.data || !propertyTypeId) {
      return;
    }

    const allowed = new Set(featuresFor(amenities.data, propertyTypeId).map((feature) => feature.id));
    const current: number[] = form.getFieldValue("amenity_ids") ?? [];

    if (current.some((id) => !allowed.has(id))) {
      form.setFieldValue(
        "amenity_ids",
        current.filter((id) => allowed.has(id)),
      );
    }
  }, [amenities.data, propertyTypeId, form]);

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={onFinish}
      initialValues={EMPTY_LISTING}
      disabled={disabled}
      scrollToFirstError
      requiredMark={false}
      className="listing-form"
    >
      <FormBlock icon={<FileTextOutlined />} title="Basic Information">
        <Field icon={<CheckCircleOutlined />} label="Select purpose">
          <Form.Item name="purpose" rules={[{ required: true }]}>
            <ChipGroup
              disabled={disabled}
              options={[
                { value: "sale", label: "Sell", icon: <TagOutlined /> },
                { value: "rent", label: "Rent", icon: <KeyOutlined /> },
              ]}
            />
          </Form.Item>
        </Field>

        <Field icon={<AppstoreOutlined />} label="Select property type" hint="The main features and amenities below change with the property type.">
          <Form.Item name="category" noStyle>
            <CategoryTabs disabled={disabled} onPick={() => form.setFieldValue("property_type_id", undefined)} />
          </Form.Item>
          <Form.Item name="property_type_id" rules={[{ required: true, message: "Choose a property type" }]}>
            {propertyTypes.isLoading ? <Skeleton.Button active size="small" style={{ width: 280 }} /> : <ChipGroup disabled={disabled} options={typeOptions} />}
          </Form.Item>
        </Field>

        <Field icon={<ExpandOutlined />} label="Area size" hint="Pick a common size, or Other to enter the exact area and unit.">
          <AreaSizeField disabled={disabled} />
        </Field>

        <Field icon={<FontSizeOutlined />} label="Title">
          <Form.Item name="title" rules={[{ required: true, message: "Enter a title" }, { min: 10, message: "At least 10 characters" }]}>
            <Input maxLength={150} showCount placeholder="Enter property title, e.g. Beautiful 10 Marla house in DHA Phase 1" />
          </Form.Item>
        </Field>
        <Field icon={<ProfileOutlined />} label="Description" hint="Use paragraphs, bullet points and bold text to make the details easy to read.">
          <Form.Item
            name="description"
            rules={[
              {
                validator: (_, value: string | undefined) => {
                  const length = htmlText(value).length;

                  if (length === 0) return Promise.reject(new Error("Describe the property"));
                  if (length < 30) return Promise.reject(new Error("At least 30 characters"));
                  if (length > 5000) return Promise.reject(new Error("At most 5,000 characters"));
                  return Promise.resolve();
                },
              },
            ]}
          >
            <RichTextEditor disabled={disabled} placeholder="Describe your property, its features, the area it is in, etc." />
          </Form.Item>
        </Field>
      </FormBlock>

      <FormBlock icon={<EnvironmentOutlined />} title="Location" hint={`${location.data?.society?.name ?? "DHA Gujranwala"}: choose the phase, sector and block.`}>
        <Field icon={<CompassOutlined />} label="Phase, sector and block">
          <Row gutter={12}>
            <Col xs={24} sm={8}>
              <Form.Item name="phase" label="Phase" rules={[{ required: true, message: "Choose the phase" }, { max: 50, message: "At most 50 characters" }]}>
                <NameChoice
                  names={location.data?.phases}
                  loading={location.isLoading}
                  placeholder="Phase, e.g. Phase 1"
                  onPick={() => form.setFieldsValue({ sector: undefined, block: undefined })}
                />
              </Form.Item>
            </Col>
            <Col xs={12} sm={8}>
              <Form.Item name="sector" label="Sector" rules={[{ max: 50, message: "At most 50 characters" }]}>
                <NameChoice
                  names={phaseId ? sectors.data : []}
                  loading={Boolean(phaseId) && sectors.isFetching}
                  placeholder="Select sector"
                  onPick={() => form.setFieldValue("block", undefined)}
                />
              </Form.Item>
            </Col>
            <Col xs={12} sm={8}>
              <Form.Item name="block" label="Block" rules={[{ max: 50, message: "At most 50 characters" }]}>
                <NameChoice names={sectorId ? blocks.data : []} loading={Boolean(sectorId) && blocks.isFetching} placeholder="Select block" />
              </Form.Item>
            </Col>
          </Row>
        </Field>
        <Field icon={<NumberOutlined />} label="House / plot number">
          <Form.Item name="plot_number" rules={[{ max: 50, message: "At most 50 characters" }]}>
            <Input placeholder="e.g. 123-A" suffix={<LockOutlined />} />
          </Form.Item>
          <div className="lf-private-note">
            <LockOutlined /> Private: only you and our admins can see this. It is never shown on the website.
          </div>
        </Field>
      </FormBlock>

      <FormBlock icon={<DollarOutlined />} title="Pricing">
        <Field icon={<TagOutlined />} label="Price (PKR)" hint="Type the amount and pick Thousand, Lakh or Crore, e.g. 1.5 Crore or 45 Thousand.">
          <Form.Item name="price" rules={[{ required: true, message: "Enter the price" }]} extra={price ? `= PKR ${withCommas(price)} (${formatCompactPrice(price)})` : undefined}>
            <PriceInput disabled={disabled} />
          </Form.Item>
        </Field>

        <Field icon={<SwapOutlined />} label="Terms">
          <ToggleRow name="is_negotiable" label="Price is negotiable" hint="Buyers see that you are open to offers." disabled={disabled} />
          <ToggleRow name="installment_available" label="Installment available" hint="Enable if the listing can be paid in installments." disabled={disabled} />
          {installments && (
            <Row gutter={12} style={{ marginTop: 12 }}>
              <Col xs={24} sm={8}>
                <Form.Item name="advance_amount" label="Advance (Rs)">
                  <InputNumber<number> min={0} style={{ width: "100%" }} formatter={withCommas} parser={withoutCommas} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={8}>
                <Form.Item name="monthly_installment" label="Monthly (Rs)">
                  <InputNumber<number> min={0} style={{ width: "100%" }} formatter={withCommas} parser={withoutCommas} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={8}>
                <Form.Item name="installments_count" label="Installments">
                  <InputNumber min={1} max={600} style={{ width: "100%" }} />
                </Form.Item>
              </Col>
            </Row>
          )}
        </Field>
      </FormBlock>

      {details.built && (
        <FormBlock icon={<HomeOutlined />} title="Main Features" hint="Only the details that apply to this property type are asked.">
          {details.bedrooms && (
            <Field icon={<LayoutOutlined />} label="Bedrooms">
              <Form.Item name="bedrooms">
                <CountChips limit={50} disabled={disabled} />
              </Form.Item>
            </Field>
          )}
          <Field icon={<InsuranceOutlined />} label="Bathrooms">
            <Form.Item name="bathrooms">
              <CountChips limit={50} disabled={disabled} />
            </Form.Item>
          </Field>
          <Field icon={<CoffeeOutlined />} label="Kitchens">
            <Form.Item name="kitchens">
              <CountChips limit={20} disabled={disabled} />
            </Form.Item>
          </Field>
          <Field icon={<CalendarOutlined />} label="Year built" hint="Optional. Pick a recent year, or Other for any other year.">
            <YearBuiltField disabled={disabled} />
          </Field>
          <Field icon={<SkinOutlined />} label="Furnishing">
            <Form.Item name="furnished">
              <ChipGroup disabled={disabled} clearable options={Object.entries(FURNISHED_LABELS).map(([value, label]) => ({ value: value as FurnishedStatus, label }))} />
            </Form.Item>
          </Field>
        </FormBlock>
      )}

      <FormBlock icon={<StarOutlined />} title="Amenities" hint="Optional. Pick everything this property has; buyers can filter by these.">
        <Field icon={<CheckSquareOutlined />} label="Amenities" hint={propertyTypeId ? undefined : "Choose a property type first to see its amenities."}>
          {amenities.isLoading ? (
            <Skeleton active paragraph={{ rows: 2 }} />
          ) : (
            <Form.Item name="amenity_ids">
              <FeatureChips features={features} disabled={disabled} />
            </Form.Item>
          )}
          {features.length > 0 && <QualityTip text={`Add at least ${AMENITY_TARGET} amenities`} current={chosenFeatures} target={Math.min(AMENITY_TARGET, features.length)} />}
        </Field>
      </FormBlock>

      {media && (
        <FormBlock icon={<PictureOutlined />} title="Photos & Video">
          {media}
        </FormBlock>
      )}

      <FormBlock icon={<UserOutlined />} title="Contact Information" hint="Taken from your profile automatically, so buyers always reach the right person.">
        <ContactBlock property={property} disabled={disabled} />
      </FormBlock>

      <FormBlock icon={<FlagOutlined />} title="Listing Status" hint="Where the listing is in review and publishing. It changes through the actions at the top of the page.">
        <StateRow
          label="Current status"
          value={property ? <Tag color={PROPERTY_STATUS_COLORS[property.status]}>{PROPERTY_STATUS_LABELS[property.status]}</Tag> : <Tag>Draft</Tag>}
          hint={
            !property
              ? "Saving creates a free draft. Submit it for review to make it active. The page title, description and link are created automatically when it is approved."
              : property.status === "published" && property.expires_at
                ? `Active until ${formatDate(property.expires_at)}.`
                : property.status === "inactive" && property.published_at
                  ? "Switched off by you. Activate it again from the actions above."
                  : property.status === "downgraded"
                    ? "Taken offline because your plan ended or has no free slot."
                    : undefined
          }
        />
        {property?.published_at && (
          <StateRow
            label="Page link"
            value={
              <Typography.Link href={property.public_url} target="_blank" rel="noopener noreferrer" ellipsis style={{ maxWidth: 320 }}>
                {property.url}
              </Typography.Link>
            }
            hint="Created automatically from the property details when it was approved."
          />
        )}
      </FormBlock>

      <FormBlock icon={<CheckSquareOutlined />} title="Property Status" hint="Whether the property itself is still on the market. Separate from the listing status: a sold property's listing stays active.">
        <Field icon={<HomeOutlined />} label="Property status">
          <Form.Item name="property_status" extra={PROPERTY_STATUS_HINTS[propertyStatus]}>
            <ChipGroup disabled={disabled} options={(Object.entries(PROPERTY_AVAILABILITY_LABELS) as [PropertyAvailability, string][]).map(([value, label]) => ({ value, label }))} />
          </Form.Item>
        </Field>
      </FormBlock>

      <FormBlock icon={<RocketOutlined />} title="Promotion" hint="Promotions are separate from the listing status.">
        <ToggleRow name="is_urgent" label="Urgent" hint="Shows an Urgent label on the listing, e.g. for a quick sale." disabled={disabled} />
        {property && (
          <>
            <StateRow label="Featured" value={property.is_featured ? <Tag color="gold">Until {formatDate(property.featured_until)}</Tag> : <Tag>Off</Tag>} />
            <StateRow label="Hot" value={property.is_hot ? <Tag color="volcano">Until {formatDate(property.hot_until)}</Tag> : <Tag>Off</Tag>} />
            <StateRow label="Premium" value={property.is_premium ? <Tag color="purple">Until {formatDate(property.premium_until)}</Tag> : <Tag>Off</Tag>} hint="Set by our team." />
          </>
        )}
      </FormBlock>
    </Form>
  );
}

const CATEGORY_TABS: Record<PropertyCategory, string> = { residential: "Home", plot: "Plots", commercial: "Commercial" };

/** Home / Plots / Commercial underline tabs for the category. */
function CategoryTabs({
  value,
  onChange,
  onPick,
  disabled,
}: {
  value?: PropertyCategory;
  onChange?: (value: PropertyCategory) => void;
  onPick?: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="lf-tabs" role="tablist">
      {(Object.entries(CATEGORY_TABS) as [PropertyCategory, string][]).map(([key, label]) => (
        <button
          key={key}
          type="button"
          role="tab"
          aria-selected={value === key}
          disabled={disabled}
          className={`lf-tab${value === key ? " active" : ""}`}
          onClick={() => {
            if (value !== key) {
              onChange?.(key);
              onPick?.();
            }
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

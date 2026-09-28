"use client";

import {
  ApartmentOutlined,
  AppstoreOutlined,
  BankOutlined,
  BorderOutlined,
  BuildOutlined,
  BulbOutlined,
  CheckCircleOutlined,
  CheckOutlined,
  CheckSquareOutlined,
  ColumnHeightOutlined,
  CompassOutlined,
  DollarOutlined,
  EnvironmentOutlined,
  ExpandOutlined,
  FileTextOutlined,
  FlagOutlined,
  FontSizeOutlined,
  GlobalOutlined,
  GoldOutlined,
  HomeOutlined,
  IdcardOutlined,
  InsuranceOutlined,
  KeyOutlined,
  LayoutOutlined,
  LockOutlined,
  NumberOutlined,
  PhoneOutlined,
  PictureOutlined,
  ProfileOutlined,
  RocketOutlined,
  ShopOutlined,
  SkinOutlined,
  StarOutlined,
  SwapOutlined,
  TagOutlined,
  UserOutlined,
  WhatsAppOutlined,
} from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Skeleton,
  Switch,
  Tag,
  Typography,
  type FormInstance,
} from "antd";
import { useEffect, type ReactNode } from "react";
import { groupAmenities } from "@/lib/amenities";
import { api } from "@/lib/api-client";
import {
  AREA_UNIT_LABELS,
  FURNISHED_LABELS,
  PROPERTY_AVAILABILITY_LABELS,
  PROPERTY_STATUS_COLORS,
  PROPERTY_STATUS_LABELS,
  formatCompactPrice,
  formatDate,
  toOptions,
} from "@/lib/labels";
import type {
  Amenity,
  AreaUnit,
  Block,
  Sector,
  City,
  Collection,
  FurnishedStatus,
  Phase,
  Property,
  PropertyAvailability,
  PropertyCategory,
  PropertyPurpose,
  PropertyType,
  Society,
} from "@/types/api";

export type ListingFormValues = {
  purpose: PropertyPurpose;
  category: PropertyCategory;
  property_type_id?: number;
  title: string;
  description: string;
  price?: number;
  is_negotiable: boolean;
  installment_available: boolean;
  advance_amount?: number | null;
  monthly_installment?: number | null;
  installments_count?: number | null;
  area_size?: number;
  area_unit: AreaUnit;
  city_id?: number;
  society_id?: number | null;
  phase?: string | null;
  sector?: string | null;
  block?: string | null;
  address?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  floors?: number | null;
  year_built?: number | null;
  furnished?: FurnishedStatus | null;
  amenity_ids: number[];
  plot_number?: string | null;
  contact_name?: string | null;
  contact_phone?: string | null;
  contact_whatsapp?: string | null;
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
    city_id: property.city?.id,
    society_id: property.society?.id ?? null,
    phase: property.phase,
    sector: property.sector,
    block: property.block,
    address: property.address,
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
    floors: property.floors,
    year_built: property.year_built,
    furnished: property.furnished,
    amenity_ids: (property.amenities ?? []).map((amenity) => amenity.id),
    plot_number: property.plot_number,
    contact_name: property.contact_name,
    contact_phone: property.contact_phone,
    contact_whatsapp: property.contact_whatsapp,
    property_status: property.property_status,
    is_urgent: property.is_urgent,
  };
}

/** Form values → API body: drops UI-only fields and clears fields that do not apply. */
export function formValuesToPayload(values: ListingFormValues): Record<string, unknown> {
  const payload: Record<string, unknown> = { ...values };
  delete payload.category;

  if (!values.installment_available) {
    payload.advance_amount = null;
    payload.monthly_installment = null;
    payload.installments_count = null;
  }

  if (values.category === "plot") {
    payload.bedrooms = null;
    payload.bathrooms = null;
    payload.floors = null;
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
      placeholder="Choose"
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

const FEATURE_TARGET = 5;

/** Features that apply to a property type: those assigned to it, plus those assigned to no type (every type). */
export function featuresFor(amenities: Amenity[], propertyTypeId: number | undefined): Amenity[] {
  if (!propertyTypeId) {
    return [];
  }

  return amenities.filter((amenity) => !amenity.property_type_ids?.length || amenity.property_type_ids.includes(propertyTypeId));
}

/** Toggle chips for the main features, under their category headings. */
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
  /** The saved listing, when editing: its listing status, promotions and SEO are shown read-only. */
  property?: Property;
}) {
  const category = Form.useWatch("category", form) ?? "residential";
  const propertyTypeId = Form.useWatch("property_type_id", form);
  const cityId = Form.useWatch("city_id", form);
  const societyId = Form.useWatch("society_id", form);
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
  const cities = useQuery({
    queryKey: ["master", "cities"],
    queryFn: () => api<Collection<City>>("public/cities").then((response) => response.data),
    staleTime: Infinity,
  });
  const societies = useQuery({
    queryKey: ["master", "societies", cityId],
    queryFn: () => api<Collection<Society>>("public/societies", { query: { city_id: cityId } }).then((response) => response.data),
    enabled: Boolean(cityId),
    staleTime: Infinity,
  });
  const phases = useQuery({
    queryKey: ["master", "phases", societyId],
    queryFn: () => api<Collection<Phase>>("public/phases", { query: { society_id: societyId } }).then((response) => response.data),
    enabled: Boolean(societyId),
    staleTime: Infinity,
  });
  // Listings store the phase name, so find the chosen phase's id to load its sectors.
  const phaseId = phases.data?.find((phase) => phase.name === phaseName)?.id;
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
  const features = featuresFor(amenities.data ?? [], propertyTypeId);
  const chosenFeatures = features.filter((feature) => (amenityIds ?? []).includes(feature.id)).length;

  // A different property type offers different features: drop the ones it does not have.
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

  const seo = property?.seo;

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

        <Field icon={<AppstoreOutlined />} label="Select property type" hint="The main features below change with the property type.">
          <Form.Item name="category" noStyle>
            <CategoryTabs disabled={disabled} onPick={() => form.setFieldValue("property_type_id", undefined)} />
          </Form.Item>
          <Form.Item name="property_type_id" rules={[{ required: true, message: "Choose a property type" }]}>
            {propertyTypes.isLoading ? <Skeleton.Button active size="small" style={{ width: 280 }} /> : <ChipGroup disabled={disabled} options={typeOptions} />}
          </Form.Item>
        </Field>

        <Field icon={<ExpandOutlined />} label="Area size">
          <div className="lf-pair">
            <Form.Item name="area_size" rules={[{ required: true, message: "Enter the area" }]}>
              <InputNumber min={0.01} placeholder="Enter area" style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item name="area_unit" rules={[{ required: true }]}>
              <Select options={toOptions(AREA_UNIT_LABELS)} />
            </Form.Item>
          </div>
        </Field>

        <Field icon={<FontSizeOutlined />} label="Title">
          <Form.Item name="title" rules={[{ required: true, message: "Enter a title" }, { min: 10, message: "At least 10 characters" }]}>
            <Input maxLength={150} showCount placeholder="Enter property title, e.g. Beautiful 10 Marla house in DHA Phase 1" />
          </Form.Item>
        </Field>
        <Field icon={<ProfileOutlined />} label="Description">
          <Form.Item name="description" rules={[{ required: true, message: "Describe the property" }, { min: 30, message: "At least 30 characters" }]}>
            <Input.TextArea rows={6} maxLength={5000} showCount placeholder="Describe your property, its features, the area it is in, etc." />
          </Form.Item>
        </Field>
      </FormBlock>

      <FormBlock icon={<EnvironmentOutlined />} title="Location">
        <Field icon={<EnvironmentOutlined />} label="City">
          <Form.Item name="city_id" rules={[{ required: true, message: "Choose a city" }]}>
            <Select
              showSearch={{ optionFilterProp: "label" }}
              placeholder="Select city"
              loading={cities.isLoading}
              options={(cities.data ?? []).map((city) => ({ value: city.id, label: city.name }))}
              onChange={() => form.setFieldsValue({ society_id: undefined, phase: undefined, sector: undefined, block: undefined })}
            />
          </Form.Item>
        </Field>

        <Field icon={<CompassOutlined />} label="Location" hint="Society, then phase, sector and block where they apply.">
          <Form.Item name="society_id">
            <Select
              showSearch={{ optionFilterProp: "label" }}
              allowClear
              disabled={disabled || !cityId}
              placeholder={cityId ? "Search society / area" : "Choose a city first"}
              loading={societies.isFetching}
              options={(societies.data ?? []).map((society) => ({ value: society.id, label: society.name }))}
              onChange={() => form.setFieldsValue({ phase: undefined, sector: undefined, block: undefined })}
            />
          </Form.Item>
          <Row gutter={12}>
            <Col xs={24} sm={8}>
              <Form.Item name="phase" rules={[{ max: 50, message: "At most 50 characters" }]}>
                <NameChoice
                  names={societyId ? phases.data : []}
                  loading={Boolean(societyId) && phases.isFetching}
                  placeholder="Phase, e.g. Phase 1"
                  onPick={() => form.setFieldsValue({ sector: undefined, block: undefined })}
                />
              </Form.Item>
            </Col>
            <Col xs={12} sm={8}>
              <Form.Item name="sector" rules={[{ max: 50, message: "At most 50 characters" }]}>
                <NameChoice
                  names={phaseId ? sectors.data : []}
                  loading={Boolean(phaseId) && sectors.isFetching}
                  placeholder="Sector, e.g. K"
                  onPick={() => form.setFieldValue("block", undefined)}
                />
              </Form.Item>
            </Col>
            <Col xs={12} sm={8}>
              <Form.Item name="block" rules={[{ max: 50, message: "At most 50 characters" }]}>
                <NameChoice names={sectorId ? blocks.data : []} loading={Boolean(sectorId) && blocks.isFetching} placeholder="Block, e.g. A" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="address">
            <Input placeholder="Street, landmark (optional)" />
          </Form.Item>
        </Field>
      </FormBlock>

      <FormBlock icon={<DollarOutlined />} title="Pricing">
        <Field icon={<TagOutlined />} label="Price">
          <div className="lf-pair">
            <Form.Item name="price" rules={[{ required: true, message: "Enter the price" }]} extra={price ? `≈ ${formatCompactPrice(price)}` : undefined}>
              <InputNumber<number> min={1} step={100000} placeholder="Enter price" style={{ width: "100%" }} formatter={withCommas} parser={withoutCommas} />
            </Form.Item>
            <Select value="PKR" disabled options={[{ value: "PKR", label: "PKR" }]} />
          </div>
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

      <FormBlock icon={<HomeOutlined />} title="Main Features">
        {category !== "plot" && (
          <>
            <Field icon={<LayoutOutlined />} label="Bedrooms">
              <Form.Item name="bedrooms">
                <CountChips limit={50} disabled={disabled} />
              </Form.Item>
            </Field>
            <Field icon={<InsuranceOutlined />} label="Bathrooms">
              <Form.Item name="bathrooms">
                <CountChips limit={50} disabled={disabled} />
              </Form.Item>
            </Field>
            <Field icon={<ColumnHeightOutlined />} label="Floors and year built">
              <div className="lf-pair even">
                <Form.Item name="floors">
                  <InputNumber min={0} max={200} placeholder="Floors" style={{ width: "100%" }} />
                </Form.Item>
                <Form.Item name="year_built">
                  <InputNumber min={1900} max={new Date().getFullYear() + 2} placeholder="Year built" style={{ width: "100%" }} />
                </Form.Item>
              </div>
            </Field>
            <Field icon={<SkinOutlined />} label="Furnishing">
              <Form.Item name="furnished">
                <ChipGroup disabled={disabled} clearable options={Object.entries(FURNISHED_LABELS).map(([value, label]) => ({ value: value as FurnishedStatus, label }))} />
              </Form.Item>
            </Field>
          </>
        )}

        <Field icon={<StarOutlined />} label="Features" hint={propertyTypeId ? "Pick everything this property has. Buyers can filter by these." : "Choose a property type first to see its features."}>
          {amenities.isLoading ? (
            <Skeleton active paragraph={{ rows: 2 }} />
          ) : (
            <Form.Item name="amenity_ids">
              <FeatureChips features={features} disabled={disabled} />
            </Form.Item>
          )}
          {features.length > 0 && <QualityTip text={`Add at least ${FEATURE_TARGET} features`} current={chosenFeatures} target={Math.min(FEATURE_TARGET, features.length)} />}
        </Field>
      </FormBlock>

      {media && (
        <FormBlock icon={<PictureOutlined />} title="Media">
          {media}
        </FormBlock>
      )}

      <FormBlock icon={<FlagOutlined />} title="Listing Status" hint="Where the listing is in review and publishing. It changes through the actions at the top of the page.">
        <StateRow
          label="Current status"
          value={property ? <Tag color={PROPERTY_STATUS_COLORS[property.status]}>{PROPERTY_STATUS_LABELS[property.status]}</Tag> : <Tag>Draft</Tag>}
          hint={
            !property
              ? "Saving creates a free draft. Submit it for review to make it active."
              : property.status === "published" && property.expires_at
                ? `Active until ${formatDate(property.expires_at)}.`
                : property.status === "inactive" && property.published_at
                  ? "Switched off by you. Activate it again from the actions above."
                  : property.status === "downgraded"
                    ? "Taken offline because your plan ended or has no free slot."
                    : undefined
          }
        />
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

      <FormBlock icon={<GlobalOutlined />} title="SEO Settings" hint="Generated automatically from the listing details. Our team can fine-tune them.">
        {seo ? (
          <>
            <div className="lf-serp">
              <div className="lf-serp-url">{property?.public_url}</div>
              <div className="lf-serp-title">{seo.effective.title}</div>
              <div className="lf-serp-desc">{seo.effective.description}</div>
            </div>
            <StateRow label="Search engines" value={<Tag color={seo.effective.index ? "green" : "default"}>{seo.effective.index ? "Indexed" : "Not indexed"}</Tag>} />
            <StateRow label="Sitemap" value={<Tag color={seo.effective.sitemap ? "green" : "default"}>{seo.effective.sitemap ? "Included" : "Excluded"}</Tag>} />
          </>
        ) : (
          <Typography.Paragraph type="secondary" style={{ margin: "0 0 20px" }}>
            After saving, the title, description and a permanent link like /property/12548/5-marla-plot-sector-c-dha-gujranwala are created from the details above.
          </Typography.Paragraph>
        )}
      </FormBlock>

      <FormBlock icon={<UserOutlined />} title="Contact Information" hint="Leave empty to use your account details.">
        <Field icon={<IdcardOutlined />} label="Contact name">
          <Form.Item name="contact_name">
            <Input placeholder="Your account name" />
          </Form.Item>
        </Field>
        <Field icon={<PhoneOutlined />} label="Mobile">
          <Form.Item name="contact_phone">
            <Input prefix="🇵🇰" placeholder="03001234567" />
          </Form.Item>
        </Field>
        <Field icon={<WhatsAppOutlined />} label="WhatsApp">
          <Form.Item name="contact_whatsapp">
            <Input prefix="🇵🇰" placeholder="03001234567" />
          </Form.Item>
        </Field>
      </FormBlock>

      <FormBlock icon={<LockOutlined />} title="Private Details" hint="Only you and our admins can see this.">
        <Field icon={<NumberOutlined />} label="Plot / house number">
          <Form.Item name="plot_number">
            <Input placeholder="e.g. 123-A" />
          </Form.Item>
        </Field>
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

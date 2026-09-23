"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Card,
  Checkbox,
  Col,
  Form,
  Input,
  InputNumber,
  Row,
  Segmented,
  Select,
  Switch,
  Typography,
  type FormInstance,
} from "antd";
import type { ReactNode } from "react";
import { api } from "@/lib/api-client";
import {
  AREA_UNIT_LABELS,
  FURNISHED_LABELS,
  PROPERTY_CATEGORY_LABELS,
  PROPERTY_PURPOSE_LABELS,
  formatCompactPrice,
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
};

export const EMPTY_LISTING: Partial<ListingFormValues> = {
  purpose: "sale",
  category: "residential",
  area_unit: "marla",
  is_negotiable: false,
  installment_available: false,
  amenity_ids: [],
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

export function ListingForm({
  form,
  onFinish,
  disabled = false,
}: {
  form: FormInstance<ListingFormValues>;
  onFinish: (values: ListingFormValues) => void;
  disabled?: boolean;
}) {
  const category = Form.useWatch("category", form) ?? "residential";
  const cityId = Form.useWatch("city_id", form);
  const societyId = Form.useWatch("society_id", form);
  const phaseName = Form.useWatch("phase", form);
  const sectorName = Form.useWatch("sector", form);
  const price = Form.useWatch("price", form);
  const installments = Form.useWatch("installment_available", form);

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

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={onFinish}
      initialValues={EMPTY_LISTING}
      disabled={disabled}
      scrollToFirstError
      requiredMark="optional"
    >
      <Row gutter={16}>
        <Col xs={24} xl={14}>
          <Section title="What are you listing?">
            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item name="purpose" label="Purpose" rules={[{ required: true }]}>
                  <Segmented block options={toOptions(PROPERTY_PURPOSE_LABELS)} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item name="category" label="Category" rules={[{ required: true }]}>
                  <Segmented
                    block
                    options={toOptions(PROPERTY_CATEGORY_LABELS)}
                    onChange={() => form.setFieldValue("property_type_id", undefined)}
                  />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="property_type_id" label="Property type" rules={[{ required: true, message: "Choose a property type" }]}>
              <Select
                placeholder="e.g. House, Flat, Residential Plot"
                loading={propertyTypes.isLoading}
                options={(propertyTypes.data ?? [])
                  .filter((type) => type.category === category)
                  .map((type) => ({ value: type.id, label: type.name }))}
              />
            </Form.Item>
            <Form.Item name="title" label="Title" rules={[{ required: true }, { min: 10, message: "At least 10 characters" }]}>
              <Input maxLength={150} showCount placeholder="e.g. 10 Marla brand new house in DHA Phase 1" />
            </Form.Item>
            <Form.Item name="description" label="Description" rules={[{ required: true }, { min: 30, message: "At least 30 characters" }]}>
              <Input.TextArea rows={5} maxLength={5000} showCount placeholder="Describe the layout, condition, nearby places and anything buyers should know." />
            </Form.Item>
          </Section>

          <Section title="Location">
            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item name="city_id" label="City" rules={[{ required: true, message: "Choose a city" }]}>
                  <Select
                    showSearch
                    optionFilterProp="label"
                    loading={cities.isLoading}
                    options={(cities.data ?? []).map((city) => ({ value: city.id, label: city.name }))}
                    onChange={() => form.setFieldsValue({ society_id: undefined, phase: undefined, sector: undefined, block: undefined })}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item name="society_id" label="Society / area">
                  <Select
                    showSearch
                    allowClear
                    optionFilterProp="label"
                    disabled={disabled || !cityId}
                    placeholder={cityId ? "Choose a society" : "Choose a city first"}
                    loading={societies.isFetching}
                    options={(societies.data ?? []).map((society) => ({ value: society.id, label: society.name }))}
                    onChange={() => form.setFieldsValue({ phase: undefined, sector: undefined, block: undefined })}
                  />
                </Form.Item>
              </Col>
              <Col xs={12} sm={8}>
                <Form.Item name="phase" label="Phase" rules={[{ max: 50, message: "At most 50 characters" }]}>
                  <NameChoice
                    names={societyId ? phases.data : []}
                    loading={Boolean(societyId) && phases.isFetching}
                    placeholder="e.g. Phase 1"
                    onPick={() => form.setFieldsValue({ sector: undefined, block: undefined })}
                  />
                </Form.Item>
              </Col>
              <Col xs={12} sm={8}>
                <Form.Item name="sector" label="Sector" rules={[{ max: 50, message: "At most 50 characters" }]}>
                  <NameChoice
                    names={phaseId ? sectors.data : []}
                    loading={Boolean(phaseId) && sectors.isFetching}
                    placeholder="e.g. Sector K"
                    onPick={() => form.setFieldValue("block", undefined)}
                  />
                </Form.Item>
              </Col>
              <Col xs={12} sm={8}>
                <Form.Item name="block" label="Block" rules={[{ max: 50, message: "At most 50 characters" }]}>
                  <NameChoice names={sectorId ? blocks.data : []} loading={Boolean(sectorId) && blocks.isFetching} placeholder="e.g. Block A" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item name="address" label="Address">
                  <Input placeholder="Street, landmark" />
                </Form.Item>
              </Col>
            </Row>
          </Section>

          <Section title="Size & features">
            <Row gutter={16}>
              <Col xs={14} sm={8}>
                <Form.Item name="area_size" label="Area" rules={[{ required: true, message: "Enter the area" }]}>
                  <InputNumber min={0.01} style={{ width: "100%" }} />
                </Form.Item>
              </Col>
              <Col xs={10} sm={4}>
                <Form.Item name="area_unit" label="Unit" rules={[{ required: true }]}>
                  <Select options={toOptions(AREA_UNIT_LABELS)} />
                </Form.Item>
              </Col>
              {category !== "plot" && (
                <>
                  <Col xs={12} sm={6}>
                    <Form.Item name="bedrooms" label="Bedrooms">
                      <InputNumber min={0} max={50} style={{ width: "100%" }} />
                    </Form.Item>
                  </Col>
                  <Col xs={12} sm={6}>
                    <Form.Item name="bathrooms" label="Bathrooms">
                      <InputNumber min={0} max={50} style={{ width: "100%" }} />
                    </Form.Item>
                  </Col>
                  <Col xs={12} sm={8}>
                    <Form.Item name="floors" label="Floors">
                      <InputNumber min={0} max={200} style={{ width: "100%" }} />
                    </Form.Item>
                  </Col>
                  <Col xs={12} sm={8}>
                    <Form.Item name="year_built" label="Year built">
                      <InputNumber min={1900} max={new Date().getFullYear() + 2} style={{ width: "100%" }} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={8}>
                    <Form.Item name="furnished" label="Furnishing">
                      <Select allowClear options={toOptions(FURNISHED_LABELS)} />
                    </Form.Item>
                  </Col>
                </>
              )}
            </Row>
            <Form.Item name="amenity_ids" label="Amenities">
              <Checkbox.Group style={{ width: "100%" }}>
                <Row gutter={[8, 8]}>
                  {(amenities.data ?? []).map((amenity) => (
                    <Col key={amenity.id} xs={12} sm={8} lg={6} xl={8}>
                      <Checkbox value={amenity.id}>{amenity.name}</Checkbox>
                    </Col>
                  ))}
                </Row>
              </Checkbox.Group>
            </Form.Item>
          </Section>
        </Col>

        <Col xs={24} xl={10}>
          <Section title="Price" extra={price ? <Typography.Text type="secondary">≈ {formatCompactPrice(price)}</Typography.Text> : null}>
            <Form.Item name="price" label="Price (Rs)" rules={[{ required: true, message: "Enter the price" }]}>
              <InputNumber<number> min={1} step={100000} style={{ width: "100%" }} formatter={withCommas} parser={withoutCommas} />
            </Form.Item>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="is_negotiable" label="Negotiable" valuePropName="checked">
                  <Switch />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="installment_available" label="Installments" valuePropName="checked">
                  <Switch />
                </Form.Item>
              </Col>
            </Row>
            {installments && (
              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item name="advance_amount" label="Advance (Rs)">
                    <InputNumber<number> min={0} style={{ width: "100%" }} formatter={withCommas} parser={withoutCommas} />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item name="monthly_installment" label="Monthly (Rs)">
                    <InputNumber<number> min={0} style={{ width: "100%" }} formatter={withCommas} parser={withoutCommas} />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item name="installments_count" label="Number of installments">
                    <InputNumber min={1} max={600} style={{ width: "100%" }} />
                  </Form.Item>
                </Col>
              </Row>
            )}
          </Section>

          <Section title="Contact for this listing">
            <Form.Item name="contact_name" label="Contact name">
              <Input placeholder="Leave empty to use your account name" />
            </Form.Item>
            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item name="contact_phone" label="Phone">
                  <Input placeholder="03001234567" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item name="contact_whatsapp" label="WhatsApp">
                  <Input placeholder="03001234567" />
                </Form.Item>
              </Col>
            </Row>
          </Section>

          <Section title="Private details">
            <Form.Item name="plot_number" label="Plot / house number" extra="Only you and our admins can see this.">
              <Input />
            </Form.Item>
          </Section>
        </Col>
      </Row>
    </Form>
  );
}

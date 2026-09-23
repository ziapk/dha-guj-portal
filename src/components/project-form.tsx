"use client";

import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { Button, Card, Checkbox, Col, DatePicker, Empty, Flex, Form, Input, InputNumber, Row, Select, Typography, type FormInstance } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { NameChoice, Section, withCommas, withoutCommas } from "@/components/listing-form";
import { api } from "@/lib/api-client";
import { AREA_UNIT_LABELS, CONSTRUCTION_STATUS_LABELS, PROJECT_FEATURE_GROUP_LABELS, PROPERTY_CATEGORY_LABELS, formatPriceRange, toOptions } from "@/lib/labels";
import type { Amenity, AreaUnit, City, Collection, ConstructionStatus, Phase, Project, ProjectFeatureGroup, ProjectFeatures, PropertyCategory, PropertyType, Society } from "@/types/api";

/** The API accepts at most this many unit types per project. */
export const MAX_PROJECT_UNITS = 30;

export type ProjectUnitFormValues = {
  name?: string;
  property_type_id?: number | null;
  area_size?: number | null;
  area_unit?: AreaUnit | null;
  price_from?: number | null;
  price_to?: number | null;
  price_per_sq_ft?: number | null;
  down_payment?: number | null;
  monthly_installment?: number | null;
  installments_count?: number | null;
  payment_plan?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  drawing_rooms?: number | null;
  lounges?: number | null;
  kitchens?: number | null;
  study_rooms?: number | null;
  store_rooms?: number | null;
  balconies?: number | null;
  terraces?: number | null;
  parking_spaces?: number | null;
  availability?: string | null;
  description?: string | null;
};

export type NearbyPlaceFormValues = { name?: string; distance?: number | null; distance_unit?: string | null; description?: string | null };

export type PaymentPlanFormValues = {
  name?: string;
  unit_type?: string | null;
  total_price?: number | null;
  booking_amount?: number | null;
  down_payment?: number | null;
  monthly_installment?: number | null;
  quarterly_installment?: number | null;
  half_yearly_installment?: number | null;
  possession_payment?: number | null;
  development_charges?: number | null;
  other_charges?: number | null;
  notes?: string | null;
};

export type FloorPlanFormValues = {
  name?: string;
  unit_type?: string | null;
  level?: string | null;
  area_size?: number | null;
  area_unit?: AreaUnit | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  description?: string | null;
};

export type ProjectFormValues = {
  name: string;
  project_type?: string | null;
  short_description?: string | null;
  description: string;
  video_url?: string | null;
  virtual_tour_url?: string | null;

  developer_name: string;
  developer_description?: string | null;
  developer_website?: string | null;
  developer_phone?: string | null;
  developer_email?: string | null;
  architect?: string | null;
  construction_company?: string | null;

  city_id?: number;
  society_id?: number | null;
  phase?: string | null;
  sector?: string | null;
  block?: string | null;
  street?: string | null;
  address?: string | null;
  landmark?: string | null;
  maps_url?: string | null;
  location_description?: string | null;

  total_land_area?: string | null;
  buildings_count?: number | null;
  towers_count?: number | null;
  floors_count?: number | null;
  units_count?: number | null;
  launch_date?: Dayjs | null;
  construction_status: ConstructionStatus;
  completion_date?: Dayjs | null;
  possession_date?: Dayjs | null;
  approval_number?: string | null;

  price_from?: number | null;
  price_to?: number | null;
  price_disclaimer?: string | null;

  amenity_ids: number[];
  features: ProjectFeatures;

  sales_office_name?: string | null;
  contact_name?: string | null;
  contact_phone?: string | null;
  contact_whatsapp?: string | null;
  contact_email?: string | null;

  units: ProjectUnitFormValues[];
  nearby_places: NearbyPlaceFormValues[];
  payment_plans: PaymentPlanFormValues[];
  floor_plans: FloorPlanFormValues[];
};

const EMPTY_UNIT: ProjectUnitFormValues = { area_unit: "marla" };

export const EMPTY_PROJECT: Partial<ProjectFormValues> = {
  construction_status: "under_construction",
  amenity_ids: [],
  features: {},
  units: [EMPTY_UNIT],
  nearby_places: [],
  payment_plans: [],
  floor_plans: [],
};

const toNumber = (value: string | null) => (value === null ? null : Number(value));

const toDate = (value: string | null) => (value ? dayjs(value) : null);

export function projectToFormValues(project: Project): ProjectFormValues {
  return {
    name: project.name,
    project_type: project.project_type,
    short_description: project.short_description,
    description: project.description,
    video_url: project.video_url,
    virtual_tour_url: project.virtual_tour_url,

    developer_name: project.developer_name,
    developer_description: project.developer_description,
    developer_website: project.developer_website,
    developer_phone: project.developer_phone ?? null,
    developer_email: project.developer_email ?? null,
    architect: project.architect,
    construction_company: project.construction_company,

    city_id: project.city?.id ?? project.city_id,
    society_id: project.society?.id ?? project.society_id,
    phase: project.phase,
    sector: project.sector,
    block: project.block,
    street: project.street,
    address: project.address,
    landmark: project.landmark,
    maps_url: project.maps_url,
    location_description: project.location_description,

    total_land_area: project.total_land_area,
    buildings_count: project.buildings_count,
    towers_count: project.towers_count,
    floors_count: project.floors_count,
    units_count: project.units_total,
    launch_date: toDate(project.launch_date),
    construction_status: project.construction_status,
    completion_date: toDate(project.completion_date),
    possession_date: toDate(project.possession_date),
    approval_number: project.approval_number,

    price_from: project.price_from,
    price_to: project.price_to,
    price_disclaimer: project.price_disclaimer,

    amenity_ids: (project.amenities ?? []).map((amenity) => amenity.id),
    features: project.features ?? {},

    sales_office_name: project.sales_office_name ?? null,
    contact_name: project.contact_name,
    contact_phone: project.contact_phone,
    contact_whatsapp: project.contact_whatsapp,
    contact_email: project.contact_email,

    units: (project.units ?? []).map((unit) => ({
      name: unit.name,
      property_type_id: unit.property_type_id,
      area_size: toNumber(unit.area_size),
      area_unit: unit.area_unit,
      price_from: toNumber(unit.price_from),
      price_to: toNumber(unit.price_to),
      price_per_sq_ft: toNumber(unit.price_per_sq_ft),
      down_payment: toNumber(unit.down_payment),
      monthly_installment: toNumber(unit.monthly_installment),
      installments_count: unit.installments_count,
      payment_plan: unit.payment_plan,
      bedrooms: unit.bedrooms,
      bathrooms: unit.bathrooms,
      drawing_rooms: unit.drawing_rooms,
      lounges: unit.lounges,
      kitchens: unit.kitchens,
      study_rooms: unit.study_rooms,
      store_rooms: unit.store_rooms,
      balconies: unit.balconies,
      terraces: unit.terraces,
      parking_spaces: unit.parking_spaces,
      availability: unit.availability,
      description: unit.description,
    })),
    nearby_places: (project.nearby_places ?? []).map((place) => ({ ...place, distance: toNumber(place.distance as string | null) })),
    payment_plans: (project.payment_plans ?? []).map((plan) => ({
      ...plan,
      total_price: toNumber(plan.total_price),
      booking_amount: toNumber(plan.booking_amount),
      down_payment: toNumber(plan.down_payment),
      monthly_installment: toNumber(plan.monthly_installment),
      quarterly_installment: toNumber(plan.quarterly_installment),
      half_yearly_installment: toNumber(plan.half_yearly_installment),
      possession_payment: toNumber(plan.possession_payment),
      development_charges: toNumber(plan.development_charges),
      other_charges: toNumber(plan.other_charges),
    })),
    floor_plans: (project.floor_plans ?? []).map((plan) => ({ ...plan, area_size: toNumber(plan.area_size) })),
  };
}

const emptyToNull = (record: Record<string, unknown>) => {
  for (const [key, value] of Object.entries(record)) {
    if (value === "" || value === undefined) {
      record[key] = null;
    }
  }

  return record;
};

/** Form values → API body. Every repeater is sent in full, because the API replaces them. */
export function formValuesToPayload(values: ProjectFormValues): Record<string, unknown> {
  const date = (value: Dayjs | null | undefined) => (value ? value.format("YYYY-MM-DD") : null);

  const payload = emptyToNull({
    ...values,
    launch_date: date(values.launch_date),
    completion_date: date(values.completion_date),
    possession_date: date(values.possession_date),
  });

  payload.amenity_ids = values.amenity_ids ?? [];
  // Empty groups are dropped so the stored JSON only holds what was filled in.
  payload.features = Object.fromEntries(Object.entries(values.features ?? {}).filter(([, list]) => Array.isArray(list) && list.length > 0));

  const withAreaUnit = (row: Record<string, unknown>) => {
    const body = emptyToNull({ ...row });

    // The API only accepts an area unit together with an area size.
    if (body.area_size === null) {
      body.area_unit = null;
    }

    return body;
  };

  payload.units = (values.units ?? []).map(withAreaUnit);
  payload.floor_plans = (values.floor_plans ?? []).map(withAreaUnit);
  payload.nearby_places = (values.nearby_places ?? []).map((place) => emptyToNull({ ...place }));
  payload.payment_plans = (values.payment_plans ?? []).map((plan) => emptyToNull({ ...plan }));

  return payload;
}

/** One unit type: size, price range and payment plan. */
function UnitCard({ index, onRemove, propertyTypes, disabled }: { index: number; onRemove: () => void; propertyTypes: PropertyType[]; disabled: boolean }) {
  const form = Form.useFormInstance<ProjectFormValues>();
  const name = Form.useWatch(["units", index, "name"], form);
  const priceFrom = Form.useWatch(["units", index, "price_from"], form);
  const priceTo = Form.useWatch(["units", index, "price_to"], form);

  // Property types grouped by category, e.g. Residential → House, Flat.
  const typeOptions = (Object.keys(PROPERTY_CATEGORY_LABELS) as PropertyCategory[])
    .map((category) => ({
      label: PROPERTY_CATEGORY_LABELS[category],
      options: propertyTypes.filter((type) => type.category === category).map((type) => ({ value: type.id, label: type.name })),
    }))
    .filter((group) => group.options.length > 0);

  return (
    <Card
      size="small"
      style={{ marginBottom: 12 }}
      title={name || `Unit type ${index + 1}`}
      extra={
        <Flex align="center" gap={8}>
          {priceFrom ? <Typography.Text type="secondary">{formatPriceRange(priceFrom, priceTo)}</Typography.Text> : null}
          {!disabled && <Button size="small" type="text" danger icon={<DeleteOutlined />} aria-label="Remove unit type" onClick={onRemove} />}
        </Flex>
      }
    >
      <Row gutter={16}>
        <Col xs={24} sm={12}>
          <Form.Item name={[index, "name"]} label="Name" rules={[{ required: true, whitespace: true, message: "Name this unit type" }, { max: 100 }]}>
            <Input placeholder="e.g. 5 Marla house, 2 bed apartment" />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12}>
          <Form.Item name={[index, "property_type_id"]} label="Property type">
            <Select allowClear showSearch={{ optionFilterProp: "label" }} placeholder="e.g. House, Flat, Residential Plot" options={typeOptions} />
          </Form.Item>
        </Col>
        <Col xs={14} sm={8}>
          <Form.Item name={[index, "area_size"]} label="Area">
            <InputNumber min={0.01} style={{ width: "100%" }} />
          </Form.Item>
        </Col>
        <Col xs={10} sm={6}>
          <Form.Item name={[index, "area_unit"]} label="Unit">
            <Select options={toOptions(AREA_UNIT_LABELS)} />
          </Form.Item>
        </Col>
        <Col xs={24} sm={10}>
          <Form.Item name={[index, "availability"]} label="Availability">
            <Select
              allowClear
              placeholder="e.g. Available"
              options={[
                { value: "available", label: "Available" },
                { value: "limited", label: "Limited" },
                { value: "sold_out", label: "Sold out" },
                { value: "coming_soon", label: "Coming soon" },
              ]}
            />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12}>
          <Form.Item name={[index, "price_from"]} label="Price from (Rs)" rules={[{ required: true, message: "Enter the starting price" }]}>
            <InputNumber<number> min={1} step={100000} style={{ width: "100%" }} formatter={withCommas} parser={withoutCommas} />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12}>
          <Form.Item
            name={[index, "price_to"]}
            label="Price to (Rs)"
            dependencies={[["units", index, "price_from"]]}
            rules={[
              ({ getFieldValue }) => ({
                validator: (_, value: number | null | undefined) => {
                  const from = getFieldValue(["units", index, "price_from"]) as number | null | undefined;

                  return !value || !from || value >= from ? Promise.resolve() : Promise.reject(new Error("Cannot be below the starting price"));
                },
              }),
            ]}
          >
            <InputNumber<number> min={1} step={100000} style={{ width: "100%" }} formatter={withCommas} parser={withoutCommas} placeholder="Leave empty for one price" />
          </Form.Item>
        </Col>
        <Col xs={24} sm={8}>
          <Form.Item name={[index, "price_per_sq_ft"]} label="Price per sq. ft. (Rs)">
            <InputNumber<number> min={0} style={{ width: "100%" }} formatter={withCommas} parser={withoutCommas} />
          </Form.Item>
        </Col>
        <Col xs={24} sm={8}>
          <Form.Item name={[index, "down_payment"]} label="Down payment (Rs)">
            <InputNumber<number> min={0} style={{ width: "100%" }} formatter={withCommas} parser={withoutCommas} />
          </Form.Item>
        </Col>
        <Col xs={24} sm={8}>
          <Form.Item name={[index, "monthly_installment"]} label="Monthly (Rs)">
            <InputNumber<number> min={0} style={{ width: "100%" }} formatter={withCommas} parser={withoutCommas} />
          </Form.Item>
        </Col>
        <Col xs={24} sm={8}>
          <Form.Item name={[index, "installments_count"]} label="Installments">
            <InputNumber min={1} max={600} style={{ width: "100%" }} />
          </Form.Item>
        </Col>
      </Row>
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        Rooms
      </Typography.Text>
      <Row gutter={8} style={{ marginTop: 6 }}>
        {(
          [
            ["bedrooms", "Beds"],
            ["bathrooms", "Baths"],
            ["drawing_rooms", "Drawing"],
            ["lounges", "Lounge"],
            ["kitchens", "Kitchen"],
            ["study_rooms", "Study"],
            ["store_rooms", "Store"],
            ["balconies", "Balcony"],
            ["terraces", "Terrace"],
            ["parking_spaces", "Parking"],
          ] as const
        ).map(([roomField, roomLabel]) => (
          <Col xs={8} sm={6} md={4} key={roomField}>
            <Form.Item name={[index, roomField]} label={roomLabel}>
              <InputNumber min={0} max={50} style={{ width: "100%" }} />
            </Form.Item>
          </Col>
        ))}
      </Row>

      <Form.Item name={[index, "description"]} label="Unit description" rules={[{ max: 2000 }]}>
        <Input.TextArea rows={2} maxLength={2000} showCount />
      </Form.Item>

      <Form.Item name={[index, "payment_plan"]} label="Payment plan" style={{ marginBottom: 0 }}>
        <Input.TextArea rows={2} maxLength={1000} showCount placeholder="e.g. 25% down payment, 36 monthly installments, 4 half-yearly balloon payments, possession after 3 years." />
      </Form.Item>
    </Card>
  );
}

export function ProjectForm({
  form,
  onFinish,
  disabled = false,
}: {
  form: FormInstance<ProjectFormValues>;
  onFinish: (values: ProjectFormValues) => void;
  disabled?: boolean;
}) {
  const cityId = Form.useWatch("city_id", form);
  const societyId = Form.useWatch("society_id", form);

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
      initialValues={EMPTY_PROJECT}
      disabled={disabled}
      scrollToFirstError
      requiredMark="optional"
    >
      <Row gutter={16}>
        <Col xs={24} xl={14}>
          <Section title="Project basics">
            <Form.Item name="name" label="Project name" rules={[{ required: true }, { min: 3, message: "At least 3 characters" }]}>
              <Input maxLength={150} showCount placeholder="e.g. Green Valley Residencia" />
            </Form.Item>
            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item name="developer_name" label="Developer / builder" rules={[{ required: true }]}>
                  <Input maxLength={150} placeholder="The company building the project" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item name="project_type" label="Project type" rules={[{ max: 60 }]}>
                  <Input placeholder="e.g. Apartments, Housing scheme" />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="short_description" label="Short description" extra="One or two lines shown on project cards." rules={[{ max: 500 }]}>
              <Input.TextArea rows={2} maxLength={500} showCount />
            </Form.Item>
            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item name="construction_status" label="Construction status" rules={[{ required: true }]}>
                  <Select options={toOptions(CONSTRUCTION_STATUS_LABELS)} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item name="completion_date" label="Expected completion">
                  <DatePicker style={{ width: "100%" }} format="DD MMM YYYY" />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="description" label="Description" rules={[{ required: true }, { min: 30, message: "At least 30 characters" }]}>
              <Input.TextArea rows={6} maxLength={10000} showCount placeholder="Describe the project: master plan, approvals, facilities, nearby landmarks and what makes it a good investment." />
            </Form.Item>
            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item name="video_url" label="Project video URL" rules={[{ type: "url", message: "Enter a full address" }]}>
                  <Input placeholder="https://youtube.com/watch?v=…" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item name="virtual_tour_url" label="Virtual tour / 360° URL" rules={[{ type: "url", message: "Enter a full address" }]}>
                  <Input placeholder="https://" />
                </Form.Item>
              </Col>
            </Row>
          </Section>

          <Section title="Developer details">
            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item name="developer_website" label="Website" rules={[{ type: "url", message: "Enter a full address" }]}>
                  <Input placeholder="https://" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item name="developer_phone" label="Developer phone" rules={[{ max: 20 }]}>
                  <Input placeholder="03001234567" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item name="developer_email" label="Developer email" rules={[{ type: "email", message: "Enter a valid email" }]}>
                  <Input />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item name="architect" label="Architect" rules={[{ max: 255 }]}>
                  <Input />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item name="construction_company" label="Construction company" rules={[{ max: 255 }]}>
                  <Input />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="developer_description" label="About the developer" rules={[{ max: 5000 }]} style={{ marginBottom: 0 }}>
              <Input.TextArea rows={3} maxLength={5000} showCount />
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
                    onChange={() => form.setFieldsValue({ society_id: undefined, phase: undefined })}
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
                    onChange={() => form.setFieldsValue({ phase: undefined })}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={8}>
                <Form.Item name="phase" label="Phase" rules={[{ max: 50, message: "At most 50 characters" }]}>
                  <NameChoice names={societyId ? phases.data : []} loading={Boolean(societyId) && phases.isFetching} placeholder="e.g. Phase 1" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={8}>
                <Form.Item name="sector" label="Sector" rules={[{ max: 50 }]}>
                  <Input placeholder="e.g. Sector K" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={8}>
                <Form.Item name="block" label="Block" rules={[{ max: 50 }]}>
                  <Input placeholder="e.g. Block A" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={8}>
                <Form.Item name="street" label="Street" rules={[{ max: 100 }]}>
                  <Input />
                </Form.Item>
              </Col>
              <Col xs={24} sm={16}>
                <Form.Item name="address" label="Complete address" rules={[{ max: 255 }]}>
                  <Input placeholder="Main road, landmark" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={8}>
                <Form.Item name="landmark" label="Nearby landmark" rules={[{ max: 255 }]}>
                  <Input placeholder="e.g. Opposite Abdullah Chowk" />
                </Form.Item>
              </Col>
              <Col xs={24}>
                <Form.Item name="maps_url" label="Google Maps URL" rules={[{ type: "url", message: "Enter a full address" }]}>
                  <Input placeholder="https://maps.google.com/…" />
                </Form.Item>
              </Col>
              <Col xs={24}>
                <Form.Item name="location_description" label="Location description" rules={[{ max: 5000 }]} style={{ marginBottom: 0 }}>
                  <Input.TextArea rows={3} maxLength={5000} showCount placeholder="How the project sits in its surroundings…" />
                </Form.Item>
              </Col>
            </Row>
          </Section>

          <Section title="Project overview">
            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item name="total_land_area" label="Total land area" rules={[{ max: 100 }]}>
                  <Input placeholder="e.g. 42 Kanal" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item name="approval_number" label="Approval / registration no." rules={[{ max: 100 }]}>
                  <Input placeholder="e.g. DHA/GRW/2026/118" />
                </Form.Item>
              </Col>
              <Col xs={12} sm={6}>
                <Form.Item name="buildings_count" label="Buildings">
                  <InputNumber min={0} max={9999} style={{ width: "100%" }} />
                </Form.Item>
              </Col>
              <Col xs={12} sm={6}>
                <Form.Item name="towers_count" label="Towers">
                  <InputNumber min={0} max={9999} style={{ width: "100%" }} />
                </Form.Item>
              </Col>
              <Col xs={12} sm={6}>
                <Form.Item name="floors_count" label="Floors">
                  <InputNumber min={0} max={9999} style={{ width: "100%" }} />
                </Form.Item>
              </Col>
              <Col xs={12} sm={6}>
                <Form.Item name="units_count" label="Total units">
                  <InputNumber min={0} max={999999} style={{ width: "100%" }} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={8}>
                <Form.Item name="launch_date" label="Launch date">
                  <DatePicker style={{ width: "100%" }} format="DD MMM YYYY" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={8}>
                <Form.Item name="possession_date" label="Possession date">
                  <DatePicker style={{ width: "100%" }} format="DD MMM YYYY" />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col xs={24} sm={8}>
                <Form.Item name="price_from" label="Starting price (Rs)" extra="Leave empty to use the lowest unit price.">
                  <InputNumber<number> min={0} step={100000} style={{ width: "100%" }} formatter={withCommas} parser={withoutCommas} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={8}>
                <Form.Item name="price_to" label="Maximum price (Rs)">
                  <InputNumber<number> min={0} step={100000} style={{ width: "100%" }} formatter={withCommas} parser={withoutCommas} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={8}>
                <Form.Item name="price_disclaimer" label="Price disclaimer" rules={[{ max: 500 }]}>
                  <Input placeholder="e.g. Prices change with the market." />
                </Form.Item>
              </Col>
            </Row>
          </Section>

          <Form.List name="units">
            {(fields, { add, remove }) => (
              <Section
                title="Unit types"
                extra={
                  <Typography.Text type="secondary">
                    {fields.length} / {MAX_PROJECT_UNITS}
                  </Typography.Text>
                }
              >
                <Typography.Paragraph type="secondary">
                  Add each kind of plot, house or apartment you sell with its own price and payment plan. At least one unit type is needed to submit.
                </Typography.Paragraph>
                {fields.length === 0 && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No unit types yet" />}
                {fields.map((field) => (
                  <UnitCard key={field.key} index={field.name} onRemove={() => remove(field.name)} propertyTypes={propertyTypes.data ?? []} disabled={disabled} />
                ))}
                {!disabled && fields.length < MAX_PROJECT_UNITS && (
                  <Button type="dashed" block icon={<PlusOutlined />} onClick={() => add({ ...EMPTY_UNIT })}>
                    Add unit type
                  </Button>
                )}
              </Section>
            )}
          </Form.List>
        </Col>

        <Col xs={24} xl={10}>
          <Section title="Amenities">
            <Form.Item name="amenity_ids" noStyle>
              <Checkbox.Group style={{ width: "100%" }}>
                <Row gutter={[8, 8]}>
                  {(amenities.data ?? []).map((amenity) => (
                    <Col key={amenity.id} xs={12} sm={8} xl={12}>
                      <Checkbox value={amenity.id}>{amenity.name}</Checkbox>
                    </Col>
                  ))}
                </Row>
              </Checkbox.Group>
            </Form.Item>
          </Section>

          <Section title="Features">
            <Typography.Paragraph type="secondary" style={{ fontSize: 13 }}>
              Type each feature and press Enter. Leave a group empty if it does not apply.
            </Typography.Paragraph>
            {(Object.keys(PROJECT_FEATURE_GROUP_LABELS) as ProjectFeatureGroup[]).map((group) => (
              <Form.Item key={group} name={["features", group]} label={PROJECT_FEATURE_GROUP_LABELS[group]}>
                <Select mode="tags" open={false} suffixIcon={null} allowClear placeholder="Add a feature" />
              </Form.Item>
            ))}
          </Section>

          <Form.List name="nearby_places">
            {(fields, { add, remove }) => (
              <Section title="Location advantages" extra={<Typography.Text type="secondary">{fields.length}</Typography.Text>}>
                <Typography.Paragraph type="secondary" style={{ fontSize: 13 }}>
                  Landmarks and amenities near the project, with how far away each one is.
                </Typography.Paragraph>
                {fields.map((field) => (
                  <Row gutter={8} key={field.key} style={{ marginBottom: 8 }}>
                    <Col xs={24} sm={10}>
                      <Form.Item name={[field.name, "name"]} rules={[{ required: true, whitespace: true, message: "Name the place" }]} style={{ margin: 0 }}>
                        <Input placeholder="e.g. Green Line Metro Station" />
                      </Form.Item>
                    </Col>
                    <Col xs={10} sm={5}>
                      <Form.Item name={[field.name, "distance"]} style={{ margin: 0 }}>
                        <InputNumber min={0} style={{ width: "100%" }} placeholder="1.2" />
                      </Form.Item>
                    </Col>
                    <Col xs={10} sm={6}>
                      <Form.Item name={[field.name, "distance_unit"]} style={{ margin: 0 }}>
                        <Select allowClear placeholder="km" options={["km", "m", "min"].map((value) => ({ value, label: value }))} />
                      </Form.Item>
                    </Col>
                    <Col xs={4} sm={3}>
                      <Button type="text" danger icon={<DeleteOutlined />} aria-label="Remove place" onClick={() => remove(field.name)} disabled={disabled} />
                    </Col>
                  </Row>
                ))}
                {!disabled && (
                  <Button type="dashed" block icon={<PlusOutlined />} onClick={() => add({ distance_unit: "km" })}>
                    Add nearby place
                  </Button>
                )}
              </Section>
            )}
          </Form.List>

          <Form.List name="payment_plans">
            {(fields, { add, remove }) => (
              <Section title="Payment plans" extra={<Typography.Text type="secondary">{fields.length}</Typography.Text>}>
                {fields.map((field) => (
                  <Card
                    key={field.key}
                    size="small"
                    style={{ marginBottom: 12 }}
                    title={`Plan ${field.name + 1}`}
                    extra={!disabled && <Button size="small" type="text" danger icon={<DeleteOutlined />} aria-label="Remove plan" onClick={() => remove(field.name)} />}
                  >
                    <Row gutter={12}>
                      <Col xs={24} sm={12}>
                        <Form.Item name={[field.name, "name"]} label="Plan name" rules={[{ required: true, whitespace: true, message: "Name the plan" }]}>
                          <Input placeholder="e.g. 3 Year Plan" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12}>
                        <Form.Item name={[field.name, "unit_type"]} label="Unit type" rules={[{ max: 150 }]}>
                          <Input placeholder="e.g. 2 Bed" />
                        </Form.Item>
                      </Col>
                      {(
                        [
                          ["total_price", "Total price"],
                          ["booking_amount", "Booking"],
                          ["down_payment", "Down payment"],
                          ["monthly_installment", "Monthly"],
                          ["quarterly_installment", "Quarterly"],
                          ["half_yearly_installment", "Half-yearly"],
                          ["possession_payment", "On possession"],
                          ["development_charges", "Development"],
                          ["other_charges", "Other charges"],
                        ] as const
                      ).map(([money, label]) => (
                        <Col xs={12} sm={8} key={money}>
                          <Form.Item name={[field.name, money]} label={label}>
                            <InputNumber<number> min={0} step={100000} style={{ width: "100%" }} formatter={withCommas} parser={withoutCommas} />
                          </Form.Item>
                        </Col>
                      ))}
                      <Col xs={24}>
                        <Form.Item name={[field.name, "notes"]} label="Notes" rules={[{ max: 1000 }]} style={{ marginBottom: 0 }}>
                          <Input.TextArea rows={2} maxLength={1000} />
                        </Form.Item>
                      </Col>
                    </Row>
                  </Card>
                ))}
                {!disabled && (
                  <Button type="dashed" block icon={<PlusOutlined />} onClick={() => add({})}>
                    Add payment plan
                  </Button>
                )}
              </Section>
            )}
          </Form.List>

          <Form.List name="floor_plans">
            {(fields, { add, remove }) => (
              <Section title="Floor plans" extra={<Typography.Text type="secondary">{fields.length}</Typography.Text>}>
                {fields.map((field) => (
                  <Card
                    key={field.key}
                    size="small"
                    style={{ marginBottom: 12 }}
                    title={`Floor plan ${field.name + 1}`}
                    extra={!disabled && <Button size="small" type="text" danger icon={<DeleteOutlined />} aria-label="Remove floor plan" onClick={() => remove(field.name)} />}
                  >
                    <Row gutter={12}>
                      <Col xs={24} sm={12}>
                        <Form.Item name={[field.name, "name"]} label="Name" rules={[{ required: true, whitespace: true, message: "Name the floor plan" }]}>
                          <Input placeholder="e.g. Typical Floor" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12}>
                        <Form.Item name={[field.name, "unit_type"]} label="Unit type" rules={[{ max: 150 }]}>
                          <Input />
                        </Form.Item>
                      </Col>
                      <Col xs={12} sm={6}>
                        <Form.Item name={[field.name, "level"]} label="Floor" rules={[{ max: 50 }]}>
                          <Input placeholder="5-15" />
                        </Form.Item>
                      </Col>
                      <Col xs={12} sm={6}>
                        <Form.Item name={[field.name, "area_size"]} label="Area">
                          <InputNumber min={0} style={{ width: "100%" }} />
                        </Form.Item>
                      </Col>
                      <Col xs={12} sm={6}>
                        <Form.Item name={[field.name, "area_unit"]} label="Unit">
                          <Select allowClear options={toOptions(AREA_UNIT_LABELS)} />
                        </Form.Item>
                      </Col>
                      <Col xs={6} sm={3}>
                        <Form.Item name={[field.name, "bedrooms"]} label="Beds">
                          <InputNumber min={0} max={50} style={{ width: "100%" }} />
                        </Form.Item>
                      </Col>
                      <Col xs={6} sm={3}>
                        <Form.Item name={[field.name, "bathrooms"]} label="Baths">
                          <InputNumber min={0} max={50} style={{ width: "100%" }} />
                        </Form.Item>
                      </Col>
                      <Col xs={24}>
                        <Form.Item name={[field.name, "description"]} label="Description" rules={[{ max: 1000 }]} style={{ marginBottom: 0 }}>
                          <Input.TextArea rows={2} maxLength={1000} />
                        </Form.Item>
                      </Col>
                    </Row>
                  </Card>
                ))}
                {!disabled && (
                  <Button type="dashed" block icon={<PlusOutlined />} onClick={() => add({})}>
                    Add floor plan
                  </Button>
                )}
              </Section>
            )}
          </Form.List>

          <Section title="Contact for this project">
            <Form.Item name="sales_office_name" label="Sales office name" rules={[{ max: 255 }]}>
              <Input />
            </Form.Item>
            <Form.Item name="contact_name" label="Contact name">
              <Input placeholder="Leave empty to use your account name" />
            </Form.Item>
            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item name="contact_phone" label="Phone" rules={[{ max: 20 }]}>
                  <Input placeholder="03001234567" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item name="contact_whatsapp" label="WhatsApp" rules={[{ max: 20 }]}>
                  <Input placeholder="03001234567" />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="contact_email" label="Email" rules={[{ type: "email", message: "Enter a valid email" }]}>
              <Input placeholder="sales@example.com" />
            </Form.Item>
          </Section>
        </Col>
      </Row>
    </Form>
  );
}

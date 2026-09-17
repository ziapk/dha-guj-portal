"use client";

import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { Button, Card, Checkbox, Col, DatePicker, Empty, Flex, Form, Input, InputNumber, Row, Select, Typography, type FormInstance } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { NameChoice, Section, withCommas, withoutCommas } from "@/components/listing-form";
import { api } from "@/lib/api-client";
import { AREA_UNIT_LABELS, CONSTRUCTION_STATUS_LABELS, PROPERTY_CATEGORY_LABELS, formatPriceRange, toOptions } from "@/lib/labels";
import type { Amenity, AreaUnit, City, Collection, ConstructionStatus, Phase, Project, PropertyCategory, PropertyType, Society } from "@/types/api";

/** The API accepts at most this many unit types per project. */
export const MAX_PROJECT_UNITS = 30;

export type ProjectUnitFormValues = {
  name?: string;
  property_type_id?: number | null;
  area_size?: number | null;
  area_unit?: AreaUnit | null;
  bedrooms?: number | null;
  price_from?: number | null;
  price_to?: number | null;
  down_payment?: number | null;
  monthly_installment?: number | null;
  installments_count?: number | null;
  payment_plan?: string | null;
};

export type ProjectFormValues = {
  name: string;
  developer_name: string;
  description: string;
  construction_status: ConstructionStatus;
  completion_date?: Dayjs | null;
  city_id?: number;
  society_id?: number | null;
  phase?: string | null;
  address?: string | null;
  amenity_ids: number[];
  contact_name?: string | null;
  contact_phone?: string | null;
  contact_whatsapp?: string | null;
  contact_email?: string | null;
  units: ProjectUnitFormValues[];
};

const EMPTY_UNIT: ProjectUnitFormValues = { area_unit: "marla" };

export const EMPTY_PROJECT: Partial<ProjectFormValues> = {
  construction_status: "under_construction",
  amenity_ids: [],
  units: [EMPTY_UNIT],
};

const toNumber = (value: string | null) => (value === null ? null : Number(value));

export function projectToFormValues(project: Project): ProjectFormValues {
  return {
    name: project.name,
    developer_name: project.developer_name,
    description: project.description,
    construction_status: project.construction_status,
    completion_date: project.completion_date ? dayjs(project.completion_date) : null,
    city_id: project.city?.id ?? project.city_id,
    society_id: project.society?.id ?? project.society_id,
    phase: project.phase,
    address: project.address,
    amenity_ids: (project.amenities ?? []).map((amenity) => amenity.id),
    contact_name: project.contact_name,
    contact_phone: project.contact_phone,
    contact_whatsapp: project.contact_whatsapp,
    contact_email: project.contact_email,
    units: (project.units ?? []).map((unit) => ({
      name: unit.name,
      property_type_id: unit.property_type_id,
      area_size: toNumber(unit.area_size),
      area_unit: unit.area_unit,
      bedrooms: unit.bedrooms,
      price_from: toNumber(unit.price_from),
      price_to: toNumber(unit.price_to),
      down_payment: toNumber(unit.down_payment),
      monthly_installment: toNumber(unit.monthly_installment),
      installments_count: unit.installments_count,
      payment_plan: unit.payment_plan,
    })),
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

/** Form values → API body. Units and amenities are always sent in full, because the API replaces them. */
export function formValuesToPayload(values: ProjectFormValues): Record<string, unknown> {
  const payload = emptyToNull({ ...values, completion_date: values.completion_date ? values.completion_date.format("YYYY-MM-DD") : null });

  payload.amenity_ids = values.amenity_ids ?? [];
  payload.units = (values.units ?? []).map((unit) => {
    const body = emptyToNull({ ...unit });

    // The API only accepts an area unit together with an area size.
    if (body.area_size === null) {
      body.area_unit = null;
    }

    return body;
  });

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
          <Form.Item name={[index, "bedrooms"]} label="Bedrooms">
            <InputNumber min={0} max={50} style={{ width: "100%" }} />
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
            <Form.Item name="developer_name" label="Developer / builder" rules={[{ required: true }]}>
              <Input maxLength={150} placeholder="The company building the project" />
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
              <Col xs={24} sm={16}>
                <Form.Item name="address" label="Address" rules={[{ max: 255 }]}>
                  <Input placeholder="Main road, landmark" />
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

          <Section title="Contact for this project">
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

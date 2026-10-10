"use client";

import {
  AppstoreOutlined,
  BuildOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  CompassOutlined,
  DollarOutlined,
  EnvironmentOutlined,
  FileTextOutlined,
  FlagOutlined,
  FontSizeOutlined,
  HomeOutlined,
  IdcardOutlined,
  PictureOutlined,
  ProfileOutlined,
  ShopOutlined,
  TagOutlined,
} from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { Col, DatePicker, Form, Input, InputNumber, Row, Switch, Tag, type FormInstance } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { useEffect, type ReactNode } from "react";
import { ChipGroup, Field, FormBlock, NameChoice, StateRow, htmlText, withCommas } from "@/components/listing-form";
import { PriceInput } from "@/components/listing-inputs";
import { RichTextEditor } from "@/components/rich-text-editor";
import { useMe } from "@/hooks/use-me";
import { api } from "@/lib/api-client";
import { CONSTRUCTION_STATUS_LABELS, PROJECT_STATUS_COLORS, PROJECT_STATUS_LABELS, formatCompactPrice, formatDate } from "@/lib/labels";
import type { Block, Collection, ConstructionStatus, ListingLocation, Project, Sector } from "@/types/api";

export type PortfolioFormValues = {
  name: string;
  project_type?: string | null;
  construction_status: ConstructionStatus;
  /** HTML from the rich text editor. */
  description: string;
  developer_name?: string | null;
  phase?: string | null;
  sector?: string | null;
  block?: string | null;
  location?: string | null;
  unit_type?: string | null;
  units_count?: number | null;
  price_from?: number | null;
  price_to?: number | null;
  hide_price: boolean;
  completion_date?: Dayjs | null;
};

export const EMPTY_PORTFOLIO: Partial<PortfolioFormValues> = {
  construction_status: "ready",
  hide_price: false,
};

/** The project types a developer picks from; the website shows the choice as the card's subtitle. */
const PROJECT_TYPES: { value: string; icon: ReactNode }[] = [
  { value: "Residential Project", icon: <HomeOutlined /> },
  { value: "Commercial Project", icon: <ShopOutlined /> },
  { value: "Mixed-Use Project", icon: <BuildOutlined /> },
  { value: "Housing Society", icon: <AppstoreOutlined /> },
];

export function projectToPortfolioValues(project: Project): PortfolioFormValues {
  return {
    name: project.name,
    project_type: project.project_type,
    construction_status: project.construction_status,
    description: project.description,
    developer_name: project.developer_name,
    phase: project.phase,
    sector: project.sector,
    block: project.block,
    location: project.location,
    unit_type: project.unit_type,
    units_count: project.units_total,
    price_from: project.price_from,
    price_to: project.price_to,
    hide_price: project.hide_price,
    completion_date: project.completion_date ? dayjs(project.completion_date) : null,
  };
}

/** Form values → API body: empty fields are sent as null so a cleared field is cleared. */
export function portfolioValuesToPayload(values: PortfolioFormValues): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    ...values,
    completion_date: values.completion_date ? values.completion_date.startOf("month").format("YYYY-MM-DD") : null,
  };

  for (const [key, value] of Object.entries(payload)) {
    if (value === "" || value === undefined) {
      payload[key] = null;
    }
  }

  return payload;
}

/**
 * A portfolio project: the short showcase of a developer's work shown on its company page.
 * Laid out like the listing form: name and status, location, price range, photos.
 */
export function PortfolioProjectForm({
  form,
  onFinish,
  disabled = false,
  media,
  project,
}: {
  form: FormInstance<PortfolioFormValues>;
  onFinish: (values: PortfolioFormValues) => void;
  disabled?: boolean;
  /** Photos & video block content. */
  media?: ReactNode;
  /** The saved project, when editing: its review status is shown read-only. */
  project?: Project;
}) {
  const me = useMe();
  const phaseName = Form.useWatch("phase", form);
  const sectorName = Form.useWatch("sector", form);
  const priceFrom = Form.useWatch("price_from", form);
  const priceTo = Form.useWatch("price_to", form);

  const location = useQuery({
    queryKey: ["master", "listing-location"],
    queryFn: () => api<{ data: ListingLocation }>("public/listing-location").then((response) => response.data),
    staleTime: Infinity,
  });
  // Projects store the phase and sector names, so find their ids to load the next level.
  const phaseId = location.data?.phases.find((phase) => phase.name === phaseName)?.id;
  const sectors = useQuery({
    queryKey: ["master", "sectors", phaseId],
    queryFn: () => api<Collection<Sector>>("public/sectors", { query: { phase_id: phaseId } }).then((response) => response.data),
    enabled: Boolean(phaseId),
    staleTime: Infinity,
  });
  const sectorId = sectors.data?.find((sector) => sector.name === sectorName)?.id;
  const blocks = useQuery({
    queryKey: ["master", "blocks", sectorId],
    queryFn: () => api<Collection<Block>>("public/blocks", { query: { sector_id: sectorId } }).then((response) => response.data),
    enabled: Boolean(sectorId),
    staleTime: Infinity,
  });

  // A new project starts on the default phase (Phase 1).
  useEffect(() => {
    if (!project && location.data && !form.getFieldValue("phase")) {
      form.setFieldValue("phase", location.data.default_phase);
    }
  }, [project, location.data, form]);

  return (
    <Form form={form} layout="vertical" onFinish={onFinish} initialValues={EMPTY_PORTFOLIO} disabled={disabled} scrollToFirstError requiredMark={false} className="listing-form">
      <FormBlock icon={<FileTextOutlined />} title="Project Information">
        <Field icon={<FontSizeOutlined />} label="Project name">
          <Form.Item name="name" rules={[{ required: true, message: "Enter the project name" }, { min: 3, message: "At least 3 characters" }]}>
            <Input maxLength={150} showCount placeholder="e.g. Executive Villas" />
          </Form.Item>
        </Field>

        <Field icon={<AppstoreOutlined />} label="Project type" hint="Shown under the project name on your company page.">
          <Form.Item name="project_type">
            <ChipGroup disabled={disabled} clearable options={PROJECT_TYPES.map((type) => ({ value: type.value, label: type.value, icon: type.icon }))} />
          </Form.Item>
        </Field>

        <Field icon={<ClockCircleOutlined />} label="Project status">
          <Form.Item name="construction_status" rules={[{ required: true, message: "Choose the status" }]}>
            <ChipGroup disabled={disabled} options={(Object.entries(CONSTRUCTION_STATUS_LABELS) as [ConstructionStatus, string][]).map(([value, label]) => ({ value, label }))} />
          </Form.Item>
        </Field>

        <Field icon={<ProfileOutlined />} label="Project overview" hint="A few lines about the project: what was built, its standout features and when it was delivered.">
          <Form.Item
            name="description"
            rules={[
              {
                validator: (_, value: string | undefined) => {
                  const length = htmlText(value).length;

                  if (length === 0) return Promise.reject(new Error("Describe the project"));
                  if (length < 30) return Promise.reject(new Error("At least 30 characters"));
                  if (length > 5000) return Promise.reject(new Error("At most 5,000 characters"));
                  return Promise.resolve();
                },
              },
            ]}
          >
            <RichTextEditor disabled={disabled} placeholder="Describe the project, its features and the area it is in." />
          </Form.Item>
        </Field>
      </FormBlock>

      <FormBlock icon={<EnvironmentOutlined />} title="Location" hint={`${location.data?.society?.name ?? "DHA Gujranwala"}: choose the phase, sector and block.`}>
        <Field icon={<CompassOutlined />} label="Phase, sector and block">
          <Row gutter={12}>
            <Col xs={24} sm={8}>
              <Form.Item name="phase" label="Phase" rules={[{ max: 50, message: "At most 50 characters" }]}>
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
        <Field icon={<EnvironmentOutlined />} label="Location line" hint="Optional. Leave empty to show the phase and sector.">
          <Form.Item name="location" rules={[{ max: 150, message: "At most 150 characters" }]}>
            <Input placeholder="e.g. Main Boulevard, DHA Gujranwala" />
          </Form.Item>
        </Field>
      </FormBlock>

      <FormBlock icon={<DollarOutlined />} title="Units & Pricing" hint="Optional. Leave the price empty for a completed project you no longer sell.">
        <Field icon={<HomeOutlined />} label="Units">
          <Row gutter={12}>
            <Col xs={24} sm={16}>
              <Form.Item name="unit_type" label="What the project offers" rules={[{ max: 100, message: "At most 100 characters" }]}>
                <Input placeholder="e.g. Luxury Villas, Residential Plots, Shops & Offices" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="units_count" label="Number of units">
                <InputNumber min={0} max={999999} style={{ width: "100%" }} placeholder="e.g. 120" />
              </Form.Item>
            </Col>
          </Row>
        </Field>
        <Field icon={<TagOutlined />} label="Price range (PKR)" hint="Type the amount and pick Thousand, Lakh or Crore.">
          <Row gutter={12}>
            <Col xs={24} sm={12}>
              <Form.Item name="price_from" label="From" extra={priceFrom ? `= PKR ${withCommas(priceFrom)} (${formatCompactPrice(priceFrom)})` : undefined}>
                <PriceInput disabled={disabled} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="price_to"
                label="To"
                dependencies={["price_from"]}
                extra={priceTo ? `= PKR ${withCommas(priceTo)} (${formatCompactPrice(priceTo)})` : undefined}
                rules={[
                  ({ getFieldValue }) => ({
                    validator: (_, value: number | null | undefined) => {
                      const from = getFieldValue("price_from");

                      return value && from && value < from ? Promise.reject(new Error("Cannot be below the starting price")) : Promise.resolve();
                    },
                  }),
                ]}
              >
                <PriceInput disabled={disabled} />
              </Form.Item>
            </Col>
          </Row>
        </Field>
        <div className="lf-toggle">
          <div>
            <div className="lf-field-label">Hide price on the website</div>
            <div className="lf-field-hint">Buyers see “Price on request” and contact you for the price.</div>
          </div>
          <Form.Item name="hide_price" valuePropName="checked" noStyle>
            <Switch disabled={disabled} />
          </Form.Item>
        </div>
        <Field icon={<CalendarOutlined />} label="Completion" hint="When the project was (or will be) completed.">
          <Form.Item name="completion_date">
            <DatePicker picker="month" format="MMM YYYY" style={{ width: 220 }} />
          </Form.Item>
        </Field>
      </FormBlock>

      {media && (
        <FormBlock icon={<PictureOutlined />} title="Photos & Video">
          {media}
        </FormBlock>
      )}

      <FormBlock icon={<IdcardOutlined />} title="Developer" hint="The company name shown on the project card.">
        <Field icon={<BuildOutlined />} label="Developer name" hint="Optional. Leave empty to use your account name.">
          <Form.Item name="developer_name" rules={[{ max: 150, message: "At most 150 characters" }]}>
            <Input placeholder={me.data?.name ?? "Your company name"} />
          </Form.Item>
        </Field>
      </FormBlock>

      <FormBlock icon={<FlagOutlined />} title="Project Status" hint="Where the project is in review and publishing. It changes through the actions at the top of the page.">
        <StateRow
          label="Current status"
          value={project ? <Tag color={PROJECT_STATUS_COLORS[project.status]}>{PROJECT_STATUS_LABELS[project.status]}</Tag> : <Tag>Draft</Tag>}
          hint={
            !project
              ? "Saving creates a free draft. Submit it for review to show it in your portfolio."
              : project.status === "published" && project.expires_at
                ? `Shown in your portfolio until ${formatDate(project.expires_at)}.`
                : undefined
          }
        />
      </FormBlock>
    </Form>
  );
}

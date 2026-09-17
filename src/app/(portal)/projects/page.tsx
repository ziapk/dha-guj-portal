"use client";

import { ApartmentOutlined, CalendarOutlined, EnvironmentOutlined, PlusOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { Alert, Button, Card, Col, Empty, Flex, Input, Pagination, Row, Skeleton, Tabs, Tag, Typography } from "antd";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { DeveloperOnly } from "@/components/developer-only";
import { PageHeader } from "@/components/page-header";
import { ProjectActions } from "@/components/project-actions";
import { api } from "@/lib/api-client";
import { errorMessage } from "@/lib/form-errors";
import { CONSTRUCTION_STATUS_COLORS, CONSTRUCTION_STATUS_LABELS, PROJECT_STATUS_COLORS, PROJECT_STATUS_LABELS, formatDate, formatProjectPrice } from "@/lib/labels";
import type { Paginated, Project, ProjectStatus } from "@/types/api";

const TABS: { key: ProjectStatus | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "published", label: "Live" },
  { key: "pending", label: "Under review" },
  { key: "changes_requested", label: "Changes requested" },
  { key: "draft", label: "Drafts" },
  { key: "rejected", label: "Rejected" },
  { key: "expired", label: "Expired" },
];

function ProjectCard({ project }: { project: Project }) {
  const router = useRouter();
  const cover = project.cover_url ?? project.media?.find((item) => item.type === "image")?.thumbnail_url ?? null;
  const unitsCount = project.units_count ?? project.units?.length ?? 0;

  return (
    <Card
      hoverable
      className="listing-card"
      style={{ height: "100%" }}
      onClick={() => router.push(`/projects/${project.id}`)}
      cover={
        <div className="listing-cover" style={cover ? { backgroundImage: `url("${cover}")` } : undefined}>
          {!cover && <ApartmentOutlined />}
          <div className="listing-cover-badges">
            <Tag color={PROJECT_STATUS_COLORS[project.status]} variant="solid">
              {PROJECT_STATUS_LABELS[project.status]}
            </Tag>
            <Tag color={CONSTRUCTION_STATUS_COLORS[project.construction_status]} variant="solid">
              {CONSTRUCTION_STATUS_LABELS[project.construction_status]}
            </Tag>
          </div>
        </div>
      }
    >
      <span className="listing-price">{formatProjectPrice(project.price_from, project.price_to)}</span>
      <Typography.Paragraph strong ellipsis={{ rows: 1 }} style={{ margin: "4px 0" }}>
        {project.name}
      </Typography.Paragraph>
      <div className="listing-meta">
        <span>
          <EnvironmentOutlined /> {project.society ? `${project.society.name}, ` : ""}
          {project.city?.name}
        </span>
        <span>
          {unitsCount} unit type{unitsCount === 1 ? "" : "s"}
        </span>
        {project.completion_date && (
          <span>
            <CalendarOutlined /> {formatDate(project.completion_date)}
          </span>
        )}
        {(project.leads_count ?? 0) > 0 && <span>💬 {project.leads_count} lead{project.leads_count === 1 ? "" : "s"}</span>}
      </div>
      <Typography.Text type="secondary" style={{ display: "block", fontSize: 12, margin: "8px 0 12px" }}>
        {project.status === "published" && project.expires_at
          ? `Live until ${formatDate(project.expires_at)}`
          : project.status === "pending"
            ? `Submitted ${formatDate(project.submitted_at)}`
            : `Updated ${formatDate(project.updated_at)}`}
      </Typography.Text>
      {project.status === "rejected" && project.rejection_reason && (
        <Alert type="error" showIcon title={project.rejection_reason} style={{ marginBottom: 12 }} />
      )}
      {project.status === "changes_requested" && (
        <Alert
          type="warning"
          showIcon
          title="Changes requested"
          description={<Typography.Paragraph ellipsis={{ rows: 2 }} style={{ margin: 0 }}>{project.rejection_reason ?? "Open the project to see what to change."}</Typography.Paragraph>}
          style={{ marginBottom: 12 }}
        />
      )}
      <ProjectActions project={project} compact />
    </Card>
  );
}

function ProjectsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const status = (searchParams.get("status") ?? "all") as ProjectStatus | "all";
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const projects = useQuery({
    queryKey: ["projects", { status, search, page }],
    queryFn: () => api<Paginated<Project>>("portal/projects", { query: { status: status === "all" ? undefined : status, search, page, per_page: 12 } }),
  });

  function go(nextStatus: string) {
    setPage(1);
    router.replace(nextStatus !== "all" ? `/projects?status=${nextStatus}` : "/projects");
  }

  return (
    <>
      <PageHeader
        title="Projects"
        subtitle="Your housing projects with their unit types and payment plans, from drafts to live"
        extra={
          <Link href="/projects/new">
            <Button type="primary" icon={<PlusOutlined />}>
              Add project
            </Button>
          </Link>
        }
      />

      <Card styles={{ body: { paddingBottom: 0 } }} style={{ marginBottom: 16 }}>
        <Flex justify="space-between" align="center" gap={12} wrap>
          <Tabs
            activeKey={status}
            items={TABS.map((tab) => ({ key: tab.key, label: tab.label }))}
            onChange={go}
            style={{ marginBottom: 0, minWidth: 0, flex: 1 }}
          />
          <Input.Search
            placeholder="Search by name"
            allowClear
            style={{ maxWidth: 260, marginBottom: 12 }}
            onSearch={(value) => {
              setSearch(value);
              setPage(1);
            }}
          />
        </Flex>
      </Card>

      {projects.isLoading ? (
        <Skeleton active />
      ) : projects.isError ? (
        <Alert type="error" showIcon title="Could not load your projects" description={errorMessage(projects.error)} />
      ) : (projects.data?.data ?? []).length === 0 ? (
        <Card>
          <Empty description={status === "all" ? "You have not added a project yet" : "No projects in this tab"}>
            <Link href="/projects/new">
              <Button type="primary" icon={<PlusOutlined />}>
                Add a project
              </Button>
            </Link>
          </Empty>
        </Card>
      ) : (
        <>
          <Row gutter={[16, 16]}>
            {projects.data?.data.map((project) => (
              <Col key={project.id} xs={24} md={12} xl={8}>
                <ProjectCard project={project} />
              </Col>
            ))}
          </Row>
          <Flex justify="center" style={{ marginTop: 24 }}>
            <Pagination
              current={page}
              pageSize={projects.data?.meta.per_page ?? 12}
              total={projects.data?.meta.total ?? 0}
              onChange={setPage}
              hideOnSinglePage
            />
          </Flex>
        </>
      )}
    </>
  );
}

export default function ProjectsPage() {
  return (
    <Suspense>
      <DeveloperOnly>
        <ProjectsContent />
      </DeveloperOnly>
    </Suspense>
  );
}

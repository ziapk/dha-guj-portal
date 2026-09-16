"use client";

import { DeleteOutlined, FileImageOutlined, FilePdfOutlined, SafetyCertificateFilled, SafetyCertificateOutlined, UploadOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, App, Button, Card, Col, Empty, Flex, Form, Popconfirm, Row, Select, Skeleton, Tag, Typography, Upload, type UploadFile } from "antd";
import { api, apiUpload } from "@/lib/api-client";
import { applyFormErrors, errorMessage } from "@/lib/form-errors";
import { AGENCY_DOCUMENT_TYPE_LABELS, formatDate, toOptions } from "@/lib/labels";
import type { AgencyDocument, AgencyDocumentType, AgencyDocumentsResponse, MessageResponse } from "@/types/api";

const MAX_DOCUMENTS = 10;
const MAX_SIZE_MB = 5;
const ACCEPT = ".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp";

type UploadValues = { type: AgencyDocumentType; file: UploadFile[] };

function VerificationStatus({ verification }: { verification: AgencyDocumentsResponse["verification"] }) {
  if (verification.is_verified) {
    return (
      <Alert
        type="success"
        showIcon
        icon={<SafetyCertificateFilled />}
        title="Verified agency"
        description={`Your agency page shows the verified badge${verification.verified_at ? ` since ${formatDate(verification.verified_at)}` : ""}.`}
      />
    );
  }

  if (verification.requested_at) {
    return (
      <Alert
        type="warning"
        showIcon
        title={`Verification requested on ${formatDate(verification.requested_at)}`}
        description="Our team is reviewing your documents. You can add more documents while you wait."
      />
    );
  }

  return (
    <Alert
      type="info"
      showIcon
      icon={<SafetyCertificateOutlined />}
      title="Not requested yet"
      description="Upload documents that prove your agency is real, such as the owner's CNIC and your company registration or trade licence, then request verification."
    />
  );
}

/** Verification documents (private, seen only by our team) and the verification request. */
export function AgencyVerification({ hasProfile }: { hasProfile: boolean }) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm<UploadValues>();

  const documents = useQuery({
    queryKey: ["agency-documents"],
    queryFn: () => api<AgencyDocumentsResponse>("portal/agency/documents"),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["agency-documents"] });

  const upload = useMutation({
    mutationFn: (values: UploadValues) => {
      const formData = new FormData();
      formData.append("type", values.type);
      formData.append("file", values.file[0].originFileObj as Blob);

      return apiUpload<{ data: AgencyDocument }>("portal/agency/documents", formData);
    },
    onSuccess: () => {
      message.success("Document uploaded");
      form.resetFields();
      refresh();
    },
    onError: (error) => {
      if (!applyFormErrors(form, error)) {
        message.error(errorMessage(error));
      }
    },
  });

  const remove = useMutation({
    mutationFn: (document: AgencyDocument) => api(`portal/agency/documents/${document.id}`, { method: "DELETE" }),
    onSuccess: () => {
      message.success("Document deleted");
      refresh();
    },
    onError: (error) => message.error(errorMessage(error)),
  });

  const request = useMutation({
    mutationFn: () => api<MessageResponse & { requested_at: string }>("portal/agency/verification-request", { method: "POST" }),
    onSuccess: (response) => {
      message.success(response.message || "Verification requested");
      refresh();
      queryClient.invalidateQueries({ queryKey: ["agency"] });
    },
    // 422s here explain what is missing (no documents, no profile, already verified); show them as a toast.
    onError: (error) => message.error(Object.values((error as { errors?: Record<string, string[]> }).errors ?? {})[0]?.[0] ?? errorMessage(error)),
  });

  const list = documents.data?.data ?? [];
  const verification = documents.data?.verification;
  const isFull = list.length >= MAX_DOCUMENTS;

  return (
    <Card title="Verification" style={{ marginTop: 16 }}>
      {documents.isLoading ? (
        <Skeleton active />
      ) : documents.isError || !verification ? (
        <Alert type="error" showIcon title="Could not load your documents" description={errorMessage(documents.error)} />
      ) : (
        <Row gutter={[24, 24]}>
          <Col xs={24} lg={10}>
            <Flex vertical gap={16}>
              <VerificationStatus verification={verification} />

              {!verification.is_verified && (
                <div>
                  <Button
                    type="primary"
                    icon={<SafetyCertificateOutlined />}
                    disabled={!hasProfile || list.length === 0}
                    loading={request.isPending}
                    onClick={() => request.mutate()}
                  >
                    {verification.requested_at ? "Request again" : "Request verification"}
                  </Button>
                  <Typography.Paragraph type="secondary" style={{ margin: "8px 0 0", fontSize: 12 }}>
                    {!hasProfile ? "Save your agency details first." : list.length === 0 ? "Upload at least one document first." : "Our team reviews requests in the order they arrive."}
                  </Typography.Paragraph>
                </div>
              )}

              <Form<UploadValues> form={form} layout="vertical" requiredMark={false} onFinish={(values) => upload.mutate(values)} disabled={isFull}>
                <Form.Item name="type" label="Document type" rules={[{ required: true, message: "Choose what this document is" }]}>
                  <Select placeholder="Choose a type" options={toOptions(AGENCY_DOCUMENT_TYPE_LABELS)} />
                </Form.Item>
                <Form.Item
                  name="file"
                  label="File"
                  valuePropName="fileList"
                  getValueFromEvent={(event: { fileList: UploadFile[] }) => event.fileList.slice(-1)}
                  extra={`PDF, JPG, PNG or WebP, up to ${MAX_SIZE_MB} MB. ${isFull ? `You have ${MAX_DOCUMENTS} documents — delete one to add another.` : `Up to ${MAX_DOCUMENTS} documents.`}`}
                  rules={[
                    { required: true, message: "Choose a file" },
                    {
                      validator: (_, files?: UploadFile[]) =>
                        files?.[0]?.size && files[0].size > MAX_SIZE_MB * 1024 * 1024 ? Promise.reject(new Error(`The file is larger than ${MAX_SIZE_MB} MB`)) : Promise.resolve(),
                    },
                  ]}
                >
                  <Upload accept={ACCEPT} maxCount={1} beforeUpload={() => false}>
                    <Button icon={<UploadOutlined />}>Choose file</Button>
                  </Upload>
                </Form.Item>
                <Button htmlType="submit" icon={<UploadOutlined />} loading={upload.isPending}>
                  Upload document
                </Button>
              </Form>
            </Flex>
          </Col>

          <Col xs={24} lg={14}>
            <Typography.Text strong>
              Uploaded documents{" "}
              <Typography.Text type="secondary">
                ({list.length}/{MAX_DOCUMENTS})
              </Typography.Text>
            </Typography.Text>
            <Typography.Paragraph type="secondary" style={{ fontSize: 12, margin: "4px 0 8px" }}>
              Only our verification team can open these files. They are never shown on your public page.
            </Typography.Paragraph>
            {list.length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No documents yet" />
            ) : (
              list.map((document) => (
                <div key={document.id} className="activity-item" style={{ alignItems: "center" }}>
                  {document.original_name.toLowerCase().endsWith(".pdf") ? (
                    <FilePdfOutlined style={{ fontSize: 22, color: "#dc2626" }} />
                  ) : (
                    <FileImageOutlined style={{ fontSize: 22, color: "var(--accent)" }} />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Flex gap={8} align="center" wrap>
                      <Tag>{AGENCY_DOCUMENT_TYPE_LABELS[document.type] ?? document.type}</Tag>
                      <Typography.Text ellipsis style={{ maxWidth: 260 }}>
                        {document.original_name}
                      </Typography.Text>
                    </Flex>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      {document.size_kb.toLocaleString("en-PK")} KB · uploaded {formatDate(document.created_at)}
                    </Typography.Text>
                  </div>
                  <Popconfirm title="Delete this document?" okText="Delete" okButtonProps={{ danger: true }} onConfirm={() => remove.mutateAsync(document)}>
                    <Button
                      size="small"
                      danger
                      type="text"
                      icon={<DeleteOutlined />}
                      aria-label={`Delete ${document.original_name}`}
                      loading={remove.isPending && remove.variables?.id === document.id}
                    />
                  </Popconfirm>
                </div>
              ))
            )}
          </Col>
        </Row>
      )}
    </Card>
  );
}

import { Flex, Typography } from "antd";
import type { ReactNode } from "react";

export function PageHeader({ title, subtitle, extra }: { title: ReactNode; subtitle?: ReactNode; extra?: ReactNode }) {
  return (
    <Flex justify="space-between" align="flex-start" gap={16} wrap style={{ marginBottom: 16 }}>
      <div>
        <Typography.Title level={3} style={{ margin: 0 }}>
          {title}
        </Typography.Title>
        {subtitle && <Typography.Text type="secondary">{subtitle}</Typography.Text>}
      </div>
      {extra}
    </Flex>
  );
}

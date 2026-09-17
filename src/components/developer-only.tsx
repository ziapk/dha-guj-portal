"use client";

import { ApartmentOutlined } from "@ant-design/icons";
import { Card, Result, Skeleton } from "antd";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/page-header";
import { useMe } from "@/hooks/use-me";

/** Projects are only for developer accounts; other accounts see an explanation instead of a 403 from the API. */
export function DeveloperOnly({ children }: { children: ReactNode }) {
  const { data: me, isLoading } = useMe();

  if (isLoading) {
    return <Skeleton active />;
  }

  if (me?.account_type !== "developer") {
    return (
      <>
        <PageHeader title="Projects" />
        <Card>
          <Result
            icon={<ApartmentOutlined />}
            title="Projects are for builders and developers"
            subTitle="Housing projects with unit types and payment plans can only be posted from a developer account. Use My Listings to post a property."
          />
        </Card>
      </>
    );
  }

  return children;
}

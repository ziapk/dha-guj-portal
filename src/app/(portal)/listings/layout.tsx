"use client";

import { ApartmentOutlined } from "@ant-design/icons";
import { Button, Card, Result, Skeleton } from "antd";
import Link from "next/link";
import type { ReactNode } from "react";
import { useMe } from "@/hooks/use-me";

/** Developer accounts post projects, not property listings, so the listing pages are closed to them. */
export default function ListingsLayout({ children }: { children: ReactNode }) {
  const { data: me, isLoading } = useMe();

  if (isLoading) {
    return <Skeleton active />;
  }

  if (me?.account_type === "developer") {
    return (
      <Card>
        <Result
          icon={<ApartmentOutlined />}
          title="Listings are not part of developer accounts"
          subTitle="Developer accounts showcase their work as portfolio projects on the company page."
          extra={
            <Link href="/projects">
              <Button type="primary">Go to my projects</Button>
            </Link>
          }
        />
      </Card>
    );
  }

  return children;
}

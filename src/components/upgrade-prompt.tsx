"use client";

import { CrownOutlined } from "@ant-design/icons";
import { Button, Card, Result } from "antd";
import Link from "next/link";
import type { ReactNode } from "react";
import { useMe } from "@/hooks/use-me";
import { ApiError } from "@/lib/api-client";

/** True when the API refused because the plan does not include a feature (403 FEATURE_NOT_IN_PLAN). */
export function isFeatureMissing(error: unknown): error is ApiError {
  return error instanceof ApiError && error.code === "FEATURE_NOT_IN_PLAN";
}

/** Full-width "upgrade to use this" card for pages whose whole content needs a plan feature. */
export function UpgradePrompt({ title, description, children }: { title: string; description: ReactNode; children?: ReactNode }) {
  const { data: me } = useMe();
  const isAgent = me?.account_type === "agent";

  return (
    <Card>
      <Result
        icon={<CrownOutlined style={{ color: "var(--accent)" }} />}
        title={title}
        subTitle={
          <>
            {description}
            {isAgent && (
              <>
                <br />
                Your agency&apos;s plan decides what is included. Ask your agency to upgrade.
              </>
            )}
          </>
        }
        extra={
          <Link href="/plan">
            <Button type={isAgent ? "default" : "primary"} icon={<CrownOutlined />}>
              {isAgent ? "See what the plan includes" : "View plans"}
            </Button>
          </Link>
        }
      >
        {children}
      </Result>
    </Card>
  );
}

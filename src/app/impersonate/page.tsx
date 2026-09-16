"use client";

import { LoadingOutlined } from "@ant-design/icons";
import { useQueryClient } from "@tanstack/react-query";
import { Button, Result, Spin, Typography } from "antd";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { AuthLayout } from "@/components/auth-layout";

/** Validation errors arrive as { errors: { code: [...] } }; fall back to the message. */
function firstError(payload: { message?: string; errors?: Record<string, string[]> }, status: number): string {
  if (status === 429) {
    return "Too many attempts. Please wait a minute and try again.";
  }

  return payload.message ?? payload.errors?.code?.[0] ?? "This login link has expired. Start again from the Admin Portal.";
}

function ImpersonateContent() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const code = searchParams.get("code") ?? "";
  const [error, setError] = useState<string | null>(code ? null : "This login link is incomplete.");
  // The code works only once: never send it twice (React runs effects twice in development).
  const started = useRef(false);

  useEffect(() => {
    if (!code || started.current) {
      return;
    }

    started.current = true;

    fetch("/api/auth/impersonate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    })
      .then(async (response) => {
        if (response.ok) {
          // Drop anything cached from a previous session before opening the dashboard.
          queryClient.clear();
          router.replace("/");
          router.refresh();

          return;
        }

        setError(firstError(await response.json().catch(() => ({})), response.status));
      })
      .catch(() => setError("Cannot reach the server. Please try again in a moment."));
  }, [code, queryClient, router]);

  if (error) {
    return (
      <Result
        status="warning"
        style={{ padding: "8px 0" }}
        title="Could not log in as this user"
        subTitle={
          <>
            {error}
            <br />
            Login links work once and only for 60 seconds. Go back to the Admin Portal and use &quot;Login as user&quot; again.
          </>
        }
        extra={
          <Link href="/login">
            <Button>Go to log in</Button>
          </Link>
        }
      />
    );
  }

  return (
    <div style={{ textAlign: "center", padding: "32px 0" }}>
      <Spin indicator={<LoadingOutlined style={{ fontSize: 36 }} spin />} />
      <Typography.Paragraph type="secondary" style={{ marginTop: 16 }}>
        Starting a 30-minute admin session…
      </Typography.Paragraph>
    </div>
  );
}

export default function ImpersonatePage() {
  return (
    <AuthLayout title="Login as user" subtitle="Opening this account for support. The session ends automatically after 30 minutes.">
      <Suspense>
        <ImpersonateContent />
      </Suspense>
    </AuthLayout>
  );
}

import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import type { InferSelectModel } from "drizzle-orm";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { s3credentials } from "@/db/schema";

export const Route = createFileRoute("/_protected/")({
    component: DashboardLayout,
});

function DashboardLayout() {
    const [_errorMsg, setErrormsg] = useState<string | null>(null);
    const { user } = Route.useRouteContext();

    const { data, isLoading, error, isError } = useQuery({
        queryKey: ["s3-accounts"],
        queryFn: async () => {
            setErrormsg(null);
            const res = await fetch("/api/s3/accounts");

            if (!res.ok) {
                setErrormsg("Failed to fetch S3 accounts - Err 102");
                throw new Error("S3 account mgmt error 102");
            }

            const json = await res.json();

            if (!json.success) {
                setErrormsg("Failed to fetch S3 accounts - Err 103");
                throw new Error("S3 account mgmt error 103");
            }

            return json.data as InferSelectModel<typeof s3credentials>[];
        },
    });

    return (
        <>
            <Outlet />
            <nav>
                {isLoading && (
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
                )}
                {data?.map(account => (
                    <Link
                        to="/$providerId"
                        params={{ providerId: account.id }}
                        key={account.id}
                    >
                        <Button type="button" key={account.id}>
                            <h3>{account.name}</h3>
                        </Button>
                    </Link>
                ))}
                {data?.length === 0 && <p>No S3 accounts added yet.</p>}
            </nav>
        </>
    );
}

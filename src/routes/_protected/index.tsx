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
    const [errorMsg, setErrormsg] = useState<string | null>(null);

    const { data, isLoading, isRefetching } = useQuery({
        queryKey: ["s3-accounts"],
        queryFn: async () => {
            setErrormsg(null);
            const res = await fetch("/api/s3/accounts");

            if (!res.ok) {
                setErrormsg("S3 account mgmt error 102");
                return;
            }

            const json = await res.json();

            if (!json.success) {
                setErrormsg("S3 account mgmt error 103");
                return;
            }

            return json.data as InferSelectModel<typeof s3credentials>[];
        },
    });

    return (
        <>
            <Outlet />
            <nav>
                {(isLoading || isRefetching) && (
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
                {errorMsg && (
                    <p className="text-destructive">
                        {errorMsg || "Error fetching S3 accounts"}
                    </p>
                )}
            </nav>
        </>
    );
}

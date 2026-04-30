import {
    createFileRoute,
    Link,
    Outlet,
    redirect,
    useLocation,
} from "@tanstack/react-router";
import { getSession } from "@/lib/auth.functions";
import { Button } from "@/components/ui/button";
import type { s3credentials } from "@/db/schema";
import { useQuery } from "@tanstack/react-query";
import type { InferSelectModel } from "drizzle-orm";
import { useState } from "react";

export const Route = createFileRoute("/_protected")({
    beforeLoad: async ({ location }) => {
        const session = await getSession();

        if (!session) {
            throw redirect({
                to: "/signin",
                search: { redirect: location.href },
            });
        }

        return { user: session.user };
    },
    component: Component,
});

function Component() {
    const [errorMsg, setErrormsg] = useState<string | null>(null);
    const location = useLocation();

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
        <div className="flex w-screen min-h-full p-4">
            {!location.pathname.startsWith("/account") && (
                <nav className="flex flex-col justify-start items-center gap-2 max-w-40 m-4">
                    {(isLoading || isRefetching) && (
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
                    )}
                    {data?.map(account => (
                        <Link
                            to="/$providerId"
                            params={{ providerId: account.id }}
                            key={account.id}
                            className="w-full"
                            activeProps={{
                                className: "[&>button]:bg-primary/60",
                            }}
                        >
                            <Button
                                className="w-full"
                                type="button"
                                key={account.id}
                            >
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
            )}
            <div className="w-full">
                <Outlet />
            </div>
        </div>
    );
}

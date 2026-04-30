import { useQuery } from "@tanstack/react-query";
import {
    createFileRoute,
    Link,
    Outlet,
    redirect,
    useLocation,
} from "@tanstack/react-router";
import type { InferSelectModel } from "drizzle-orm";
import { useState } from "react";
import { Loader } from "@/components/loader";
import { Button } from "@/components/ui/button";
import type { s3credentials } from "@/db/schema";
import { getSession } from "@/lib/auth.functions";

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
                <nav className="flex flex-col justify-start items-center gap-2 max-w-40 m-4 pr-4 border-r-2">
                    <p className="text-xl font-medium mb-4">Providers</p>
                    {data?.length === 0 && (
                        <>
                            <p className="text-center mb-2">
                                No S3 accounts added yet.
                            </p>
                            <Link to="/account/manage-s3">
                                <Button type="button">Add S3 account</Button>
                            </Link>
                        </>
                    )}
                    {(isLoading || isRefetching) && <Loader />}
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

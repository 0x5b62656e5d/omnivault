import type { s3credentials } from "@/db/schema";
import { useLayout } from "@/lib/layoutContext";
import { useQuery } from "@tanstack/react-query";
import type { InferSelectModel } from "drizzle-orm";
import { Button } from "./ui/button";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Loader } from "./loader";

export const Sidebar = ({
    user,
}: {
    user: {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        email: string;
        emailVerified: boolean;
        name: string;
        image?: string | null | undefined;
    } | null;
}) => {
    const [errorMsg, setErrormsg] = useState<string | null>(null);
    const { sidebarOpen, setSidebarOpen } = useLayout();
    const location = useLocation();
    const navigate = useNavigate();

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
        enabled: !!user,
    });

    return (
        <nav
            className={`z-20 ${sidebarOpen ? "translate-x-0" : "-translate-x-64"} absolute min-h-full bg-popover lg:bg-[unset] lg:flex transition-transform lg:static lg:translate-x-0 flex-col justify-start items-center gap-2 mt-2 lg:m-4 pl-4 lg:pl-[unset] pr-4 border-t-2 lg:border-t-0 border-r-2`}
        >
            <div className="lg:hidden flex flex-col gap-2 items-center justify-center pb-4 pt-2 lg:pt-[unset] border-b-2">
                <p className="text-xl font-medium mb-4">Navigation</p>
                <p
                    onClick={() => {
                        setSidebarOpen(false);
                        navigate({
                            to: "/",
                        });
                    }}
                    className="hover:cursor-pointer"
                >
                    <u>Dashboard</u>
                </p>
                <p
                    onClick={() => {
                        setSidebarOpen(false);
                        navigate({
                            to: "/about",
                        });
                    }}
                    className="hover:cursor-pointer"
                >
                    <u>About</u>
                </p>
                <p
                    onClick={() => {
                        setSidebarOpen(false);
                        navigate({
                            to: "/account",
                        });
                    }}
                    className="hover:cursor-pointer"
                >
                    <u>Manage account</u>
                </p>
            </div>
            <div className="flex flex-col gap-2 items-center justify-center">
                {location.pathname.startsWith("/account") ? (
                    <>
                        <p className="text-xl font-medium mb-4">Menu</p>
                        <Button
                            className="w-full"
                            onClick={() => {
                                setSidebarOpen(false);
                                navigate({ to: "/account" });
                            }}
                        >
                            Manage account
                        </Button>
                        <Button
                            className="w-full"
                            onClick={() => {
                                setSidebarOpen(false);
                                navigate({ to: "/account/manage-s3" });
                            }}
                        >
                            Manage S3 accounts
                        </Button>
                    </>
                ) : (
                    <>
                        <p className="text-xl font-medium mb-4 pt-4 lg:pt-[unset]">Providers</p>
                        {data?.length === 0 && (
                            <>
                                <p className="text-center mb-2">
                                    No S3 accounts added yet.
                                </p>
                                <Link
                                    to="/account/manage-s3"
                                    onClick={() => {
                                        setSidebarOpen(false);
                                    }}
                                >
                                    <Button type="button">
                                        Add S3 account
                                    </Button>
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
                                onClick={() => {
                                    setSidebarOpen(false);
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
                    </>
                )}
            </div>
        </nav>
    );
};

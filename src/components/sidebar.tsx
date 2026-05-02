import { useQuery } from "@tanstack/react-query";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import type { InferSelectModel } from "drizzle-orm";
import { useEffect, useState } from "react";
import type { s3credentials } from "@/db/schema";
import { authClient } from "@/lib/auth-client";
import { useLayout } from "@/lib/layoutContext";
import { getProviderIcon } from "@/lib/s3/providerIcon";
import { Loader } from "./loader";
import { Button } from "./ui/button";

export const Sidebar = ({
    user,
    ref,
    invalidateRouter,
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
    ref: React.Ref<HTMLElement>;
    invalidateRouter: () => Promise<void>;
}) => {
    const [errorMsg, setErrormsg] = useState<string | null>(null);
    const { sidebarOpen, setSidebarOpen } = useLayout();
    const location = useLocation();
    const navigate = useNavigate();
    const [screenWidth, setScreenWidth] = useState<number>(0);

    useEffect(() => {
        setScreenWidth(window.innerWidth);
    }, []);

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

    const handleSignout = async () => {
        await authClient.signOut();
        await invalidateRouter();
        navigate({ to: "/signin" });
    };

    return (
        <nav
            className={`z-20 ${sidebarOpen ? "translate-x-0" : "-translate-x-64"} fixed lg:shrink-0 top-36 bottom-0 overflow-y-auto bg-popover lg:bg-[unset] lg:flex transition-transform lg:static lg:translate-x-0 flex-col justify-start items-center gap-2 lg:m-4 lg:mt-0 lg:pt-4 px-6 lg:px-2 lg:pr-4 border-t-2 lg:border-t-0 ${(user && screenWidth > 1024) || screenWidth <= 1024 ? "border-r-2" : ""}`}
            ref={ref}
        >
            <div
                className={`lg:hidden relative flex flex-col gap-4 items-start justify-center pb-4 pt-2 lg:pt-[unset] ${user ? "border-b-2" : ""}`}
            >
                <p className="self-center text-xl font-bold mb-4">Navigation</p>
                <Link
                    to="/"
                    onClick={() => {
                        setSidebarOpen(false);
                    }}
                    preload={false}
                    className="hover:cursor-pointer"
                >
                    <u>Dashboard</u>
                </Link>
                <Link
                    to="/about"
                    onClick={() => {
                        setSidebarOpen(false);
                    }}
                    preload={false}
                    className="hover:cursor-pointer"
                >
                    <u>About</u>
                </Link>
                <Link
                    to="/account"
                    onClick={() => {
                        setSidebarOpen(false);
                    }}
                    preload={false}
                    className="hover:cursor-pointer"
                >
                    <u>Manage account</u>
                </Link>
            </div>
            {user && (
                <>
                    <div className="flex flex-col gap-4 items-start justify-center">
                        {location.pathname.startsWith("/account") ? (
                            <>
                                <p className="self-center text-xl font-bold mb-2 pt-4 lg:pt-[unset]">
                                    Menu
                                </p>
                                <Link
                                    to="/account"
                                    onClick={() => {
                                        setSidebarOpen(false);
                                    }}
                                    preload={false}
                                >
                                    <u>Manage account</u>
                                </Link>
                                <Link
                                    to="/account/manage-s3"
                                    onClick={() => {
                                        setSidebarOpen(false);
                                    }}
                                    preload={false}
                                >
                                    <u>Manage S3 accounts</u>
                                </Link>
                            </>
                        ) : (
                            <>
                                <p className="self-center text-xl font-bold mb-4 pt-4 lg:pt-[unset]">
                                    Providers
                                </p>
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
                                            preload={false}
                                        >
                                            <u>Add S3 account</u>
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
                                            className:
                                                "[&>button]:bg-primary/60",
                                        }}
                                        onClick={() => {
                                            setSidebarOpen(false);
                                        }}
                                        preload={false}
                                    >
                                        <div className="flex gap-2 justify-start items-center">
                                            {getProviderIcon(
                                                account.endpointUrl || "",
                                                20,
                                            )}
                                            <u>{account.name}</u>
                                        </div>
                                    </Link>
                                ))}
                                {errorMsg && (
                                    <p className="text-destructive">
                                        {errorMsg ||
                                            "Error fetching S3 accounts"}
                                    </p>
                                )}
                            </>
                        )}
                    </div>

                    <div className="lg:hidden absolute left-4 bottom-4 flex flex-col justify-start items-center gap-1">
                        <p className="text-sm">Logged in as</p>
                        <div className="flex gap-1 items-center">
                            <img
                                src={user.image || ""}
                                alt={user.name}
                                className="rounded-full size-10"
                            />
                            <p className="text-xl">{user.name}</p>
                        </div>
                        <Button
                            type="button"
                            onClick={handleSignout}
                            variant="destructive"
                            className="mt-1"
                        >
                            Sign out
                        </Button>
                    </div>
                </>
            )}
        </nav>
    );
};

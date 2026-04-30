import { useForm } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { InferSelectModel } from "drizzle-orm";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { IoClose } from "react-icons/io5";
import { DeleteButton } from "@/components/deleteButton";
import { Button } from "@/components/ui/button";
import type { s3credentials } from "@/db/schema";
import { AWS_REGION_LIST } from "@/lib/s3/client";

type S3Credential = InferSelectModel<typeof s3credentials>;

export const Route = createFileRoute("/_protected/account/manage-s3/")({
    component: RouteComponent,
});

function RouteComponent() {
    const { queryClient } = Route.useRouteContext();
    const [showAddAccountForm, setShowAddAccountForm] = useState(false);
    const [deleteConfirmationId, setDeleteConfirmationId] = useState<
        string | null
    >(null);
    const [errorMsg, setErrormsg] = useState<string | null>(null);
    const [isManualRefetching, setIsManualRefetching] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const form = useForm({
        defaultValues: {
            name: "",
            accessKeyId: "",
            secretAccessKey: "",
            endpointUrl: "",
            region: "",
        },
        onSubmit: async ({ value }) => {
            setShowAddAccountForm(false);
            setErrormsg(null);

            const res = await fetch("/api/s3/accounts", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(value),
            });

            form.reset();

            if (!res.ok) {
                console.error("S3 account mgmt error 101");
                setErrormsg("Failed to add S3 account - Err 101");
                return;
            }

            queryClient.invalidateQueries({
                queryKey: ["s3-accounts"],
            });
        },
    });

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

            return json.data as S3Credential[];
        },
    });

    const handleRefetchBuckets = async () => {
        setErrormsg(null);
        setIsManualRefetching(true);

        const res = await fetch(`/api/s3/buckets/refetch`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
        });

        setIsManualRefetching(false);

        if (!res.ok) {
            setErrormsg("Failed to refetch S3 buckets - Err 105");
            console.error("S3 account mgmt error 105");
            return;
        }
    };

    const handleDeleteAccount = async (accountId: string) => {
        if (deleteConfirmationId !== accountId) {
            setDeleteConfirmationId(accountId);
            return;
        }

        setIsDeleting(true);

        setDeleteConfirmationId(null);

        const res = await fetch(`/api/s3/accounts`, {
            method: "DELETE",
            body: JSON.stringify({ id: accountId }),
            headers: {
                "Content-Type": "application/json",
            },
        });

        setIsDeleting(false);

        if (!res.ok) {
            setErrormsg("Failed to delete S3 account - Err 104");
            console.error("S3 account mgmt error 104");
            return;
        }

        queryClient.invalidateQueries({
            queryKey: ["s3-accounts"],
        });
    };

    const handleAddAccount = () => {
        setShowAddAccountForm(true);
    };

    const handleCloseAddAccountForm = () => {
        setShowAddAccountForm(false);
        form.reset();
    };

    return (
        <main>
            <h1>Manage S3 accounts</h1>
            <div className="flex flex-col justify-center items-center gap-2">
                {(isLoading || isRefetching) && (
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
                )}
                {data?.map(account => (
                    <div
                        key={account.id}
                        className="border p-4 rounded w-full max-w-md"
                    >
                        <p>
                            <strong>Name:</strong> {account.name}
                        </p>
                        <p>
                            <strong>Date created:</strong>{" "}
                            {account.createdAt
                                ? new Date(
                                      account.createdAt,
                                  ).toLocaleDateString()
                                : "Unknown"}
                        </p>
                        <DeleteButton
                            onClick={() => handleDeleteAccount(account.id)}
                            deleteConfirmationId={deleteConfirmationId}
                            idMatcher={account.id}
                            disabled={isDeleting}
                        />
                    </div>
                ))}
                {errorMsg && (
                    <p className="text-destructive">
                        {errorMsg || "Error fetching S3 accounts"}
                    </p>
                )}
                <Button onClick={handleAddAccount}>Add S3 Account</Button>
                {data && (
                    <Button
                        onClick={handleRefetchBuckets}
                        disabled={isManualRefetching}
                        className={`${isManualRefetching ? "cursor-not-allowed opacity-70 pointer-events-none" : ""}`}
                    >
                        {isManualRefetching
                            ? "Refetching..."
                            : "Refetch S3 buckets"}
                    </Button>
                )}

                <AnimatePresence>
                    {showAddAccountForm && (
                        <motion.div
                            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            <motion.div
                                className="relative w-full max-w-lg rounded-xl border bg-background p-6 shadow-2xl"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.2 }}
                            >
                                <button
                                    type="button"
                                    onClick={handleCloseAddAccountForm}
                                    className="absolute right-4 top-4 rounded-full p-1 transition hover:bg-muted"
                                    aria-label="Close add S3 account form"
                                >
                                    <IoClose className="h-6 w-6" />
                                </button>

                                <div className="mb-6">
                                    <h2 className="text-xl font-semibold">
                                        Add S3 Account
                                    </h2>
                                    <p className="text-sm text-muted-foreground">
                                        Add your S3-compatible credentials to
                                        connect a storage provider.
                                    </p>
                                </div>

                                <form
                                    className="flex flex-col gap-4"
                                    onSubmit={event => {
                                        event.preventDefault();
                                        event.stopPropagation();
                                        void form.handleSubmit();
                                    }}
                                >
                                    <form.Field
                                        name="name"
                                        validators={{
                                            onChange: ({ value }) => {
                                                if (!value.trim()) {
                                                    return "Name is required";
                                                }

                                                return undefined;
                                            },
                                        }}
                                    >
                                        {field => (
                                            <label className="flex flex-col gap-1">
                                                <span className="text-sm font-medium">
                                                    Name
                                                </span>
                                                <input
                                                    value={field.state.value}
                                                    onBlur={field.handleBlur}
                                                    onChange={event => {
                                                        field.handleChange(
                                                            event.target.value,
                                                        );
                                                    }}
                                                    placeholder="Personal AWS account"
                                                    className="rounded-md border bg-background px-3 py-2 outline-none transition focus:ring-2 focus:ring-ring"
                                                />
                                                {field.state.meta.errors
                                                    .length > 0 && (
                                                    <span className="text-sm text-destructive">
                                                        {field.state.meta.errors.join(
                                                            ", ",
                                                        )}
                                                    </span>
                                                )}
                                            </label>
                                        )}
                                    </form.Field>

                                    <form.Field
                                        name="accessKeyId"
                                        validators={{
                                            onChange: ({ value }) => {
                                                if (!value.trim()) {
                                                    return "Access key ID is required";
                                                }

                                                return undefined;
                                            },
                                        }}
                                    >
                                        {field => (
                                            <label className="flex flex-col gap-1">
                                                <span className="text-sm font-medium">
                                                    Access Key ID
                                                </span>
                                                <input
                                                    type="password"
                                                    value={field.state.value}
                                                    onBlur={field.handleBlur}
                                                    onChange={event => {
                                                        field.handleChange(
                                                            event.target.value,
                                                        );
                                                    }}
                                                    placeholder="••••••••••••••••"
                                                    className="rounded-md border bg-background px-3 py-2 outline-none transition focus:ring-2 focus:ring-ring"
                                                />
                                                {field.state.meta.errors
                                                    .length > 0 && (
                                                    <span className="text-sm text-destructive">
                                                        {field.state.meta.errors.join(
                                                            ", ",
                                                        )}
                                                    </span>
                                                )}
                                            </label>
                                        )}
                                    </form.Field>

                                    <form.Field
                                        name="secretAccessKey"
                                        validators={{
                                            onChange: ({ value }) => {
                                                if (!value.trim()) {
                                                    return "Secret access key is required";
                                                }

                                                return undefined;
                                            },
                                        }}
                                    >
                                        {field => (
                                            <label className="flex flex-col gap-1">
                                                <span className="text-sm font-medium">
                                                    Secret Access Key
                                                </span>
                                                <input
                                                    type="password"
                                                    value={field.state.value}
                                                    onBlur={field.handleBlur}
                                                    onChange={event => {
                                                        field.handleChange(
                                                            event.target.value,
                                                        );
                                                    }}
                                                    placeholder="••••••••••••••••"
                                                    className="rounded-md border bg-background px-3 py-2 outline-none transition focus:ring-2 focus:ring-ring"
                                                />
                                                {field.state.meta.errors
                                                    .length > 0 && (
                                                    <span className="text-sm text-destructive">
                                                        {field.state.meta.errors.join(
                                                            ", ",
                                                        )}
                                                    </span>
                                                )}
                                            </label>
                                        )}
                                    </form.Field>

                                    <form.Field
                                        name="endpointUrl"
                                        validators={{
                                            onChange: ({ value }) => {
                                                if (!value.trim()) {
                                                    return undefined;
                                                }

                                                try {
                                                    new URL(value);
                                                    return undefined;
                                                } catch {
                                                    return "Invalid URL";
                                                }
                                            },
                                        }}
                                    >
                                        {field => (
                                            <label className="flex flex-col gap-1">
                                                <span className="text-sm font-medium">
                                                    Endpoint URL
                                                    <span className="ml-1 text-muted-foreground">
                                                        (optional)
                                                    </span>
                                                </span>
                                                <input
                                                    value={field.state.value}
                                                    onBlur={field.handleBlur}
                                                    onChange={event => {
                                                        field.handleChange(
                                                            event.target.value,
                                                        );
                                                    }}
                                                    placeholder="https://s3.amazonaws.com"
                                                    className="rounded-md border bg-background px-3 py-2 outline-none transition focus:ring-2 focus:ring-ring"
                                                />
                                                {field.state.meta.errors
                                                    .length > 0 && (
                                                    <span className="text-sm text-destructive">
                                                        {field.state.meta.errors.join(
                                                            ", ",
                                                        )}
                                                    </span>
                                                )}
                                            </label>
                                        )}
                                    </form.Field>

                                    <form.Field
                                        name="region"
                                        validators={{
                                            onChange: ({ value, fieldApi }) => {
                                                const endpoint =
                                                    fieldApi.form.getFieldValue(
                                                        "endpointUrl",
                                                    );

                                                if (endpoint?.trim()) {
                                                    return undefined;
                                                }

                                                if (!value?.trim()) {
                                                    return "Region is required for AWS S3";
                                                }

                                                return undefined;
                                            },
                                        }}
                                    >
                                        {field => {
                                            const endpoint =
                                                form.getFieldValue(
                                                    "endpointUrl",
                                                );
                                            const shouldShow =
                                                !endpoint?.trim();

                                            if (!shouldShow) {
                                                return null;
                                            }

                                            return (
                                                <label className="flex flex-col gap-1">
                                                    <span className="text-sm font-medium">
                                                        AWS Region
                                                        <span className="ml-1 text-muted-foreground">
                                                            (Required for AWS)
                                                        </span>
                                                    </span>

                                                    <select
                                                        value={
                                                            field.state.value
                                                        }
                                                        onBlur={
                                                            field.handleBlur
                                                        }
                                                        onChange={event => {
                                                            field.handleChange(
                                                                event.target
                                                                    .value,
                                                            );
                                                        }}
                                                        className="rounded-md border bg-background px-3 py-2 outline-none transition focus:ring-2 focus:ring-ring"
                                                    >
                                                        <option value="">
                                                            Select a region
                                                        </option>
                                                        {AWS_REGION_LIST.map(
                                                            region => (
                                                                <option
                                                                    key={region}
                                                                    value={
                                                                        region
                                                                    }
                                                                >
                                                                    {region}
                                                                </option>
                                                            ),
                                                        )}
                                                    </select>

                                                    {field.state.meta.errors
                                                        .length > 0 && (
                                                        <span className="text-sm text-destructive">
                                                            {field.state.meta.errors.join(
                                                                ", ",
                                                            )}
                                                        </span>
                                                    )}
                                                </label>
                                            );
                                        }}
                                    </form.Field>

                                    <div className="mt-2 flex justify-end gap-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={handleCloseAddAccountForm}
                                        >
                                            Cancel
                                        </Button>
                                        <Button type="submit">
                                            Add account
                                        </Button>
                                    </div>
                                </form>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </main>
    );
}

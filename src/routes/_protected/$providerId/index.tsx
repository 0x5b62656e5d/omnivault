import { useForm } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import type { InferSelectModel } from "drizzle-orm";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { FiArrowUpRight } from "react-icons/fi";
import { IoClose } from "react-icons/io5";
import { DeleteButton } from "@/components/deleteButton";
import { Loader } from "@/components/loader";
import { Button } from "@/components/ui/button";
import type { s3buckets } from "@/db/schema";

export const Route = createFileRoute("/_protected/$providerId/")({
    component: RouteComponent,
});

function RouteComponent() {
    const { queryClient } = Route.useRouteContext();
    const [errorMsg, setErrormsg] = useState<string | null>(null);
    const [showAddBucketForm, setShowAddBucketForm] = useState(false);
    const { providerId } = Route.useParams();
    const [providerName, setProviderName] = useState<string | null>(null);
    const [isManualRefetching, setIsManualRefetching] = useState(false);
    const [deleteConfirmationId, setDeleteConfirmationId] = useState<
        string | null
    >(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const form = useForm({
        defaultValues: {
            bucketName: "",
        },
        onSubmit: async ({ value }) => {
            setShowAddBucketForm(false);
            setErrormsg(null);

            const res = await fetch("/api/s3/buckets", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    ...value,
                    providerId,
                }),
            });

            form.reset();

            if (!res.ok) {
                const json = await res.json();

                console.error(json.message || "S3 bucket mgmt error 101");
                setErrormsg(
                    json.message || "Failed to add S3 bucket - Err 101",
                );
                return;
            }

            queryClient.invalidateQueries({
                queryKey: ["s3-buckets", providerId],
            });
        },
    });

    useEffect(() => {
        (async () => {
            const res = await fetch(
                `/api/s3/credential/?providerId=${providerId}`,
            );

            if (!res.ok) {
                console.error("S3 bucket mgmt error 104");
                setErrormsg("Failed to load S3 credential - Err 104");
                return;
            }

            const json = await res.json();

            if (!json.success) {
                console.error("S3 bucket mgmt error 105");
                setErrormsg("Failed to load S3 credential - Err 105");
                return;
            }

            setProviderName(json.data);
        })();
    });

    const { data, isLoading, isRefetching } = useQuery({
        queryKey: ["s3-buckets", providerId],
        queryFn: async () => {
            setErrormsg(null);
            const res = await fetch(`/api/s3/buckets?providerId=${providerId}`);

            if (!res.ok) {
                setErrormsg("S3 bucket mgmt error 102");
                return;
            }

            const json = await res.json();

            if (!json.success) {
                setErrormsg("S3 bucket mgmt error 103");
                return;
            }

            return json.data as InferSelectModel<typeof s3buckets>[];
        },
    });

    const handleRefetchBuckets = async () => {
        setErrormsg(null);
        setIsManualRefetching(true);

        const res = await fetch(`/api/s3/buckets/refetch/${providerId}`, {
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

        queryClient.invalidateQueries({
            queryKey: ["s3-buckets", providerId],
        });
    };

    const handleCreateBucket = () => {
        setShowAddBucketForm(true);
    };

    const handleCloseAddAccountForm = () => {
        setShowAddBucketForm(false);
        form.reset();
    };

    const handleDeleteBucket = async (bucketId: string) => {
        if (deleteConfirmationId !== bucketId) {
            setDeleteConfirmationId(bucketId);

            setTimeout(() => {
                setDeleteConfirmationId(null);
            }, 3000);

            return;
        }

        setIsDeleting(true);

        setDeleteConfirmationId(null);

        const res = await fetch(`/api/s3/buckets`, {
            method: "DELETE",
            body: JSON.stringify({ providerId, bucketId }),
            headers: {
                "Content-Type": "application/json",
            },
        });

        setIsDeleting(false);

        if (!res.ok) {
            setErrormsg("Failed to delete S3 bucket - Err 104");
            console.error("S3 bucket mgmt error 104");
            return;
        }

        queryClient.invalidateQueries({
            queryKey: ["s3-buckets", providerId],
        });
    };

    return (
        <div className="flex flex-col">
            <div className="flex flex-col w-xl self-center gap-4">
                <div className="flex flex-col w-full gap-2">
                    {(isLoading || isRefetching || isManualRefetching) && (
                        <Loader />
                    )}
                    {data?.map(bucket => (
                        <div
                            key={bucket.id}
                            className="flex justify-between items-center border p-4 rounded"
                        >
                            <Link
                                to="/$providerId/$bucketId"
                                params={{
                                    providerId: providerId,
                                    bucketId: bucket.id,
                                }}
                                key={bucket.id}
                            >
                                <button
                                    type="button"
                                    key={bucket.id}
                                    disabled={
                                        isLoading ||
                                        isRefetching ||
                                        isManualRefetching
                                    }
                                    className={`hover:cursor-pointer  ${isLoading || isRefetching || isManualRefetching ? "cursor-not-allowed opacity-70 pointer-events-none" : ""}`}
                                >
                                    <p className="inline-flex justify-center items-center gap-2 transition-transform duration-250 ease-in-out hover:scale-[1.025]">
                                        <u>
                                            {bucket.name.length > 25
                                                ? `${bucket.name.substring(0, 23)}...`
                                                : bucket.name}
                                        </u>{" "}
                                        <FiArrowUpRight />
                                    </p>
                                </button>
                            </Link>
                            <DeleteButton
                                onClick={() => handleDeleteBucket(bucket.id)}
                                deleteConfirmationId={deleteConfirmationId}
                                idMatcher={bucket.id}
                                disabled={
                                    isLoading ||
                                    isRefetching ||
                                    isManualRefetching ||
                                    isDeleting
                                }
                            />
                        </div>
                    ))}
                    {data?.length === 0 && <p>No S3 buckets added yet.</p>}
                    {errorMsg && (
                        <p className="text-destructive">
                            {errorMsg || "Error fetching S3 buckets"}
                        </p>
                    )}
                </div>
                <Button
                    onClick={handleCreateBucket}
                    disabled={isLoading || isRefetching || isManualRefetching}
                    className={`${isLoading || isRefetching || isManualRefetching ? "cursor-not-allowed opacity-70 pointer-events-none" : ""}`}
                >
                    Create bucket
                </Button>
                <Button
                    onClick={handleRefetchBuckets}
                    disabled={isLoading || isRefetching || isManualRefetching}
                    className={`${isLoading || isRefetching || isManualRefetching ? "cursor-not-allowed opacity-70 pointer-events-none" : ""}`}
                >
                    {isManualRefetching
                        ? "Refetching..."
                        : "Refetch S3 buckets"}
                </Button>
            </div>
            <AnimatePresence>
                {showAddBucketForm && (
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
                                    Create S3 bucket in {providerName}
                                </h2>
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
                                    name="bucketName"
                                    validators={{
                                        onChange: ({ value }) => {
                                            if (!value.trim()) {
                                                return "Bucket name is required";
                                            }

                                            if (!/^[a-z0-9-]+$/.test(value)) {
                                                return "Bucket name can only contain lowercase letters (a-z), numbers (0-9), and hyphens (-)";
                                            }

                                            return undefined;
                                        },
                                    }}
                                >
                                    {field => (
                                        <label className="flex flex-col gap-1">
                                            <span className="text-sm font-medium">
                                                Bucket name
                                            </span>
                                            <input
                                                value={field.state.value}
                                                onBlur={field.handleBlur}
                                                onChange={event => {
                                                    field.handleChange(
                                                        event.target.value,
                                                    );
                                                }}
                                                placeholder="John"
                                                className="rounded-md border bg-background px-3 py-2 outline-none transition focus:ring-2 focus:ring-ring"
                                            />
                                            {field.state.meta.errors.length >
                                                0 && (
                                                <span className="text-sm text-destructive">
                                                    {field.state.meta.errors.join(
                                                        ", ",
                                                    )}
                                                </span>
                                            )}
                                        </label>
                                    )}
                                </form.Field>

                                <div className="mt-2 flex justify-end gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={handleCloseAddAccountForm}
                                    >
                                        Cancel
                                    </Button>
                                    <Button type="submit">Create bucket</Button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

import { useForm } from "@tanstack/react-form";
import type { QueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { IoClose } from "react-icons/io5";
import { Button } from "../ui/button";

export const MoveBucketForm = ({
    setShowMoveBucketForm,
    setErrormsg,
    providerId,
    bucketId,
    bucketList,
    oldFilename,
    setOldFilename,
    queryClient,
    disabled,
    isUploading,
}: {
    setShowMoveBucketForm: (show: boolean) => void;
    setErrormsg: (msg: string | null) => void;
    providerId: string;
    bucketId: string;
    bucketList: { id: string; name: string }[] | undefined;
    oldFilename: string;
    setOldFilename: (name: string) => void;
    queryClient: QueryClient;
    disabled: boolean;
    isUploading: boolean;
}) => {
    const form = useForm({
        defaultValues: {
            destBucketId: "",
        },
        onSubmit: async ({ value }) => {
            setShowMoveBucketForm(false);
            setErrormsg(null);

            const res = await fetch("/api/s3/files/move", {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    providerId,
                    destBucketId: value.destBucketId,
                    srcBucketName: bucketList?.find(
                        bucket => bucket.id === bucketId,
                    )?.name,
                    fileName: oldFilename,
                }),
            });

            form.reset();

            if (!res.ok) {
                console.error("S3 file mgmt error 101");
                setErrormsg("Failed to move S3 file - Err 101");
                return;
            }

            queryClient.invalidateQueries({
                queryKey: ["s3-files", providerId, bucketId],
            });
        },
    });

    const handleCloseMoveBucketForm = () => {
        setOldFilename("");
        setShowMoveBucketForm(false);
        form.reset();
    };

    return (
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
                    onClick={handleCloseMoveBucketForm}
                    className="absolute right-4 top-4 rounded-full p-1 transition hover:bg-muted"
                    aria-label="Close rename file form"
                >
                    <IoClose className="h-6 w-6" />
                </button>

                <div className="mb-6">
                    <h2 className="text-xl font-semibold">
                        Move {oldFilename || "File"}
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
                        name="destBucketId"
                        validators={{
                            onChange: ({ value }) => {
                                if (!value) {
                                    return "Please select a destination bucket";
                                }

                                return undefined;
                            },
                        }}
                    >
                        {field => (
                            <label className="flex flex-col gap-1">
                                <span className="text-sm font-medium">
                                    Destination bucket
                                </span>
                                <select
                                    value={field.state.value}
                                    onBlur={field.handleBlur}
                                    onChange={event => {
                                        field.handleChange(event.target.value);
                                    }}
                                    className="rounded-md border bg-background px-3 py-2 outline-none transition focus:ring-2 focus:ring-ring"
                                >
                                    <option value="">Select a bucket</option>
                                    {bucketList
                                        ?.filter(
                                            bucket => bucket.id !== bucketId,
                                        )
                                        .map(bucket => (
                                            <option
                                                key={bucket.id}
                                                value={bucket.id}
                                            >
                                                {bucket.name}
                                            </option>
                                        ))}
                                </select>
                                {field.state.meta.errors.length > 0 && (
                                    <span className="text-sm text-destructive">
                                        {field.state.meta.errors.join(", ")}
                                    </span>
                                )}
                            </label>
                        )}
                    </form.Field>

                    <div className="mt-2 flex justify-end gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleCloseMoveBucketForm}
                            disabled={disabled || isUploading}
                            className={`${isUploading ? "cursor-not-allowed opacity-70 pointer-events-none" : ""}`}
                        >
                            Cancel
                        </Button>
                        <Button type="submit">Move file</Button>
                    </div>
                </form>
            </motion.div>
        </motion.div>
    );
};

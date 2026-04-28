import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { InferSelectModel } from "drizzle-orm";
import { useState } from "react";
import type { s3buckets } from "@/db/schema";
import type { _Object, ListObjectsV2CommandOutput } from "@aws-sdk/client-s3";
import { Button } from "@/components/ui/button";
import { FaRegTrashAlt } from "react-icons/fa";
import { account } from "@/db/auth-schema";
import { AnimatePresence, motion } from "framer-motion";
import { getFileSizeUnits } from "@/lib/filesizeUnits";

export const Route = createFileRoute("/_protected/$providerId/$bucketId/")({
    component: RouteComponent,
});

function RouteComponent() {
    const { queryClient } = Route.useRouteContext();
    const [errorMsg, setErrormsg] = useState<string | null>(null);
    const { user } = Route.useRouteContext();
    const { providerId, bucketId } = Route.useParams();
    const [presignedUrl, setPresignedUrl] = useState<string | null>(null);
    const [deleteConfirmationId, setDeleteConfirmationId] = useState<
        string | null
    >(null);

    const { data, isLoading } = useQuery({
        queryKey: ["s3-files", providerId, bucketId],
        queryFn: async () => {
            setErrormsg(null);
            const res = await fetch(
                `/api/s3/files?providerId=${providerId}&bucketId=${bucketId}`,
            );

            if (!res.ok) {
                setErrormsg("Failed to fetch S3 files - Err 102");
                throw new Error("S3 file mgmt error 102");
            }

            const json = await res.json();

            if (!json.success) {
                setErrormsg("Failed to fetch S3 files - Err 103");
                throw new Error("S3 file mgmt error 103");
            }

            const data = json.data as _Object[];

            return data
                ? data.sort((a, b) => {
                      return (a.Key || "").localeCompare(b.Key || "");
                  })
                : [];
        },
    });

    const getPresignedUrl = async (fileKey: string) => {
        setErrormsg(null);
        if (!fileKey) {
            setErrormsg("Invalid file key");
            return;
        }

        const res = await fetch(
            `/api/s3/files/download?providerId=${providerId}&bucketId=${bucketId}&fileIdentifier=${fileKey}`,
        );

        if (!res.ok) {
            setErrormsg("Failed to get presigned URL - Err 202");
            throw new Error("S3 file mgmt error 202");
        }

        const json = await res.json();

        if (!json.success) {
            setErrormsg("Failed to get presigned URL - Err 203");
            throw new Error("S3 file mgmt error 203");
        }

        const a = document.createElement("a");
        a.href = json.data;
        a.download = fileKey;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    const deleteFile = async (fileKey: string) => {
        if (deleteConfirmationId !== fileKey) {
            setDeleteConfirmationId(fileKey);
            return;
        }

        setDeleteConfirmationId(null);

        setErrormsg(null);
        if (!fileKey) {
            setErrormsg("Invalid file key");
            return;
        }

        const res = await fetch(
            `/api/s3/files?providerId=${providerId}&bucketId=${bucketId}&fileId=${fileKey}`,
            {
                method: "DELETE",
            },
        );

        if (!res.ok) {
            setErrormsg("Failed to delete file - Err 302");
            throw new Error("S3 file mgmt error 302");
        }

        const json = await res.json();

        if (!json.success) {
            setErrormsg("Failed to delete file - Err 303");
            throw new Error("S3 file mgmt error 303");
        }

        // Optionally, you can refetch the file list here to update the UI
        queryClient.invalidateQueries({
            queryKey: ["s3-files", providerId, bucketId],
        });
    };

    return (
        <div className="flex flex-col gap-4">
            {isLoading && (
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
            )}
            {data?.map((file, idx) => (
                <div key={idx} className="flex border-2 p-4">
                    <div className="flex p-4 border-2 gap-2">
                        <p>{file.Key}</p>
                        <p>{getFileSizeUnits(file.Size || 0)}</p>
                    </div>
                    <Button
                        type="button"
                        key={`${idx}-Download`}
                        onClick={() => getPresignedUrl(file.Key || "")}
                    >
                        {/* <a
                        href="/$providerId/$bucketId"
                        params={{ providerId: providerId, bucketId: bucket.id }}
                        key={bucket.id}
                    > */}
                        Download
                        {/* </a> */}
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={() => deleteFile(file.Key || "")}
                        className="min-w-48 overflow-hidden"
                        key={`${idx}-Delete`}
                        type="button"
                    >
                        <AnimatePresence mode="wait" initial={false}>
                            <motion.span
                                key={
                                    deleteConfirmationId === file.Key
                                        ? "confirm"
                                        : "delete"
                                }
                                initial={{ rotateX: -90, opacity: 0 }}
                                animate={{ rotateX: 0, opacity: 1 }}
                                exit={{ rotateX: 90, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="inline-block"
                            >
                                {deleteConfirmationId === file.Key
                                    ? "Click again to confirm"
                                    : "Delete"}
                            </motion.span>
                        </AnimatePresence>
                    </Button>
                </div>
            ))}
            {data?.length === 0 && <p>No files found in this bucket.</p>}
        </div>
    );
}

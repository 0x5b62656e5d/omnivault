import type { _Object } from "@aws-sdk/client-s3";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { DeleteButton } from "@/components/deleteButton";
import { Button } from "@/components/ui/button";
import { getFileSizeUnits } from "@/lib/filesizeUnits";

export const Route = createFileRoute("/_protected/$providerId/$bucketId/")({
    component: RouteComponent,
});

function RouteComponent() {
    const { queryClient } = Route.useRouteContext();
    const [errorMsg, setErrormsg] = useState<string | null>(null);
    const { providerId, bucketId } = Route.useParams();
    const [deleteConfirmationId, setDeleteConfirmationId] = useState<
        string | null
    >(null);

    const { data, isLoading, isRefetching } = useQuery({
        queryKey: ["s3-files", providerId, bucketId],
        queryFn: async () => {
            setErrormsg(null);
            const res = await fetch(
                `/api/s3/files?providerId=${providerId}&bucketId=${bucketId}`,
            );

            if (!res.ok) {
                setErrormsg("S3 file mgmt error 102");
                return;
            }

            const json = await res.json();

            if (!json.success) {
                setErrormsg("S3 file mgmt error 103");
                return;
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
            setErrormsg("S3 file mgmt error 202");
            return;
        }

        const json = await res.json();

        if (!json.success) {
            setErrormsg("S3 file mgmt error 203");
            return;
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
            setErrormsg("S3 file mgmt error 302");
            return;
        }

        const json = await res.json();

        if (!json.success) {
            setErrormsg("S3 file mgmt error 303");
            return;
        }

        queryClient.invalidateQueries({
            queryKey: ["s3-files", providerId, bucketId],
        });
    };

    return (
        <div className="flex flex-col gap-4">
            {(isLoading || isRefetching) && (
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
                        Download
                    </Button>
                    <DeleteButton
                        onClick={() => deleteFile(file.Key || "")}
                        deleteConfirmationId={deleteConfirmationId}
                        idMatcher={file.Key || ""}
                    />
                </div>
            ))}
            {data?.length === 0 && <p>No files found in this bucket.</p>}
            {errorMsg && (
                <p className="text-destructive">
                    {errorMsg || "Error fetching S3 accounts"}
                </p>
            )}
        </div>
    );
}

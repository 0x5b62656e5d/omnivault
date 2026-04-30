import type { _Object } from "@aws-sdk/client-s3";
import { useForm } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { useRef, useState } from "react";
import { IoClose } from "react-icons/io5";
import { DeleteButton } from "@/components/deleteButton";
import { Button } from "@/components/ui/button";
import { getFileSizeUnits } from "@/lib/filesizeUnits";
import { FiArrowUpRight } from "react-icons/fi";

export const Route = createFileRoute("/_protected/$providerId/$bucketId/")({
    component: RouteComponent,
});

function RouteComponent() {
    const { queryClient } = Route.useRouteContext();
    const [showUploadFileForm, setShowUploadFileForm] = useState(false);
    const [errorMsg, setErrormsg] = useState<string | null>(null);
    const { providerId, bucketId } = Route.useParams();
    const [deleteConfirmationId, setDeleteConfirmationId] = useState<
        string | null
    >(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadedSize, setUploadedSize] = useState(0);
    const [isLargeFile, setIsLargeFile] = useState(false);
    const [fileSize, setFileSize] = useState(0);
    const [cancelMultipart, setCancelMultipart] = useState(false);
    const uploadAbortControllerRef = useRef<AbortController | null>(null);
    const multipartUploadRef = useRef<{
        uploadId: string;
        fileName: string;
    } | null>(null);
    const [isDeletingFile, setIsDeletingFile] = useState(false);

    const form = useForm({
        defaultValues: {
            file: null as File | null,
            fileName: "",
        },
        onSubmit: async ({ value }) => {
            setErrormsg(null);
            setIsUploading(true);

            if (!value.file) {
                setErrormsg("Please select a file to upload");
                setIsUploading(false);
                return;
            }

            const file = value.file;

            setFileSize(file.size);

            const originalName = file.name;
            const extension = originalName.includes(".")
                ? originalName.slice(originalName.lastIndexOf("."))
                : "";

            const fileName = value.fileName.trim()
                ? `${value.fileName.trim()}${extension}`
                : originalName;

            const createUploadRes = await fetch("/api/s3/files", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    fileName,
                    fileSize: file.size,
                    contentType: file.type || "application/octet-stream",
                    providerId,
                    bucketId,
                }),
            });

            if (!createUploadRes.ok) {
                console.error("S3 file upload error 101");
                setErrormsg("S3 file upload error 101");
                setShowUploadFileForm(false);
                setIsUploading(false);
                return;
            }

            const createUploadJson = await createUploadRes.json();

            if (!createUploadJson.success) {
                console.error(
                    "S3 file upload error 102",
                    createUploadJson.error,
                );
                setErrormsg("S3 file upload error 102");
                setShowUploadFileForm(false);
                setIsUploading(false);
                return;
            }

            if (value.file.size <= 50 * 1024 * 1024) {
                const uploadRes = await fetch(createUploadJson.data, {
                    method: "PUT",
                    headers: {
                        "Content-Type": file.type || "application/octet-stream",
                    },
                    body: file,
                });

                if (!uploadRes.ok) {
                    console.error("S3 file upload error 103");
                    setErrormsg("S3 file upload error 103");
                    setIsUploading(false);
                    return;
                }

                form.reset();
                queryClient.invalidateQueries({
                    queryKey: ["s3-files", providerId, bucketId],
                });

                setShowUploadFileForm(false);
                setIsUploading(false);

                return;
            }

            setIsLargeFile(true);

            const uploadData = createUploadJson.data;

            const abortController = new AbortController();

            uploadAbortControllerRef.current = abortController;
            multipartUploadRef.current = {
                uploadId: uploadData.uploadId,
                fileName,
            };

            try {
                const uploadedParts = await Promise.all(
                    uploadData.parts.map(
                        async (part: {
                            partNumber: number;
                            signedUrl: string;
                        }) => {
                            const start =
                                (part.partNumber - 1) * uploadData.partSize;
                            const end = Math.min(
                                start + uploadData.partSize,
                                file.size,
                            );

                            const chunk = file.slice(start, end);

                            const uploadPartRes = await fetch(part.signedUrl, {
                                method: "PUT",
                                body: chunk,
                                signal: abortController.signal,
                            });

                            setUploadedSize(prev => prev + chunk.size);

                            if (!uploadPartRes.ok) {
                                throw new Error(
                                    `Failed to upload part ${part.partNumber}`,
                                );
                            }

                            const eTag = uploadPartRes.headers.get("ETag");

                            if (!eTag) {
                                throw new Error(
                                    `Missing ETag for part ${part.partNumber}`,
                                );
                            }

                            return {
                                PartNumber: part.partNumber,
                                ETag: eTag,
                            };
                        },
                    ),
                );

                const completeRes = await fetch(
                    "/api/s3/files/multipart/complete",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            providerId,
                            bucketId,
                            fileName,
                            uploadId: uploadData.uploadId,
                            parts: uploadedParts,
                        }),
                    },
                );

                if (!completeRes.ok) {
                    setShowUploadFileForm(false);
                    setErrormsg("S3 file upload error 104");
                    setIsUploading(false);
                    setIsLargeFile(true);
                    return;
                }

                setShowUploadFileForm(false);
                setIsUploading(false);
                setIsLargeFile(true);

                form.reset();

                queryClient.invalidateQueries({
                    queryKey: ["s3-files", providerId, bucketId],
                });
            } catch (error) {
                console.error(error);
                if (cancelMultipart) {
                    setErrormsg("S3 multipart upload cancelled");
                } else if ((error as string).includes("CORS")) {
                    setErrormsg(
                        "S3 multipart upload failed: Bucket CORS error",
                    );
                } else {
                    setErrormsg("S3 multipart upload failed");
                }
                setShowUploadFileForm(false);
                setIsUploading(false);
                setIsLargeFile(true);
                form.reset();
            }
        },
    });

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

            setTimeout(() => {
                setDeleteConfirmationId(null);
            }, 3000);

            return;
        }

        setIsDeletingFile(true);

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

        setIsDeletingFile(false);

        if (!res.ok) {
            setErrormsg("S3 file mgmt error 302");
            return;
        }

        queryClient.invalidateQueries({
            queryKey: ["s3-files", providerId, bucketId],
        });
    };

    const handleUploadFile = () => {
        setShowUploadFileForm(true);
    };

    const handleCloseUploadFileForm = async () => {
        if (isUploading && isLargeFile && !cancelMultipart) {
            setCancelMultipart(true);
            return;
        } else if (isUploading && isLargeFile && cancelMultipart) {
            setIsDeletingFile(true);

            uploadAbortControllerRef.current?.abort();

            const multipartUpload = multipartUploadRef.current;

            if (multipartUpload) {
                await fetch("/api/s3/files/multipart/abort", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        providerId,
                        bucketId,
                        fileName: multipartUpload.fileName,
                        uploadId: multipartUpload.uploadId,
                    }),
                });
            }

            uploadAbortControllerRef.current = null;
            multipartUploadRef.current = null;
            setIsUploading(false);
            setIsLargeFile(false);
            setUploadedSize(0);
            setFileSize(0);
            setCancelMultipart(false);
        }

        setShowUploadFileForm(false);
        setIsDeletingFile(false);
        form.reset();
    };

    const handleGetFilePreview = async (fileKey: string) => {
        setErrormsg(null);
        if (!fileKey) {
            setErrormsg("Invalid file key");
            return;
        }

        const res = await fetch(
            `/api/s3/files/preview?providerId=${providerId}&bucketId=${bucketId}&fileIdentifier=${fileKey}`,
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

        window.open(json.data, "_blank", "noopener,noreferrer");
    };

    return (
        <div className="flex flex-col gap-4 w-[80%] mx-auto">
            {(isLoading || isRefetching) && (
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
            )}
            {data?.map((file, idx) => (
                <div
                    key={idx}
                    className="flex justify-between items-center border-2 p-4"
                >
                    <div className="flex p-4 gap-2">
                        <p
                            className="inline-flex hover:cursor-pointer justify-center items-center"
                            onClick={() => handleGetFilePreview(file.Key || "")}
                        >
                            <u>{file.Key}</u> <FiArrowUpRight />
                        </p>
                        <p>{getFileSizeUnits(file.Size || 0)}</p>
                    </div>
                    <div className="flex flex-col gap-2">
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
                            disabled={
                                isDeletingFile || isLoading || isRefetching
                            }
                        />
                    </div>
                </div>
            ))}
            {data?.length === 0 && <p>No files found in this bucket.</p>}
            {errorMsg && (
                <p className="text-destructive">
                    {errorMsg || "Error fetching S3 accounts"}
                </p>
            )}
            <Button
                onClick={handleUploadFile}
                disabled={isLoading || isRefetching}
                className={`${isLoading || isRefetching ? "cursor-not-allowed opacity-70 pointer-events-none" : ""}`}
            >
                Upload file
            </Button>
            <AnimatePresence>
                {showUploadFileForm && (
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
                                onClick={handleCloseUploadFileForm}
                                className="absolute right-4 top-4 rounded-full p-1 transition hover:bg-muted"
                                aria-label="Close add S3 account form"
                            >
                                <IoClose className="h-6 w-6" />
                            </button>

                            <div className="mb-6">
                                <h2 className="text-xl font-semibold">
                                    Upload File
                                </h2>
                                {/* <p className="text-sm text-muted-foreground">
                                    Add your S3-compatible credentials to
                                    connect a storage provider.
                                </p> */}
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
                                    name="file"
                                    validators={{
                                        onChange: ({ value }) => {
                                            if (!value) {
                                                return "File is required";
                                            }

                                            return undefined;
                                        },
                                    }}
                                >
                                    {field => (
                                        <label className="flex flex-col gap-1">
                                            <span className="text-sm font-medium">
                                                File
                                            </span>
                                            <input
                                                type="file"
                                                onBlur={field.handleBlur}
                                                onChange={event => {
                                                    const file =
                                                        event.target
                                                            .files?.[0] || null;

                                                    field.handleChange(file);
                                                }}
                                                placeholder="Personal AWS account"
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
                                <form.Field
                                    name="fileName"
                                    validators={{
                                        onChange: ({ value }) => {
                                            if (
                                                value.trim() &&
                                                (value.startsWith("/") ||
                                                    value.endsWith("/"))
                                            ) {
                                                return "File name cannot start or end with a slash";
                                            }

                                            if (
                                                value.trim() &&
                                                !value.match(
                                                    /^(?=.*[A-Za-z0-9])[A-Za-z0-9!\-_.*'()[\]/]+$/,
                                                )
                                            ) {
                                                return "Invalid characters in file name";
                                            }

                                            return undefined;
                                        },
                                    }}
                                >
                                    {field => (
                                        <label className="flex flex-col gap-1">
                                            <span className="text-sm font-medium">
                                                File name (without extension,
                                                optional)
                                            </span>
                                            <input
                                                value={field.state.value}
                                                onBlur={field.handleBlur}
                                                onChange={event => {
                                                    field.handleChange(
                                                        event.target.value,
                                                    );
                                                }}
                                                placeholder="Filename"
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

                                {isUploading && (
                                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
                                )}

                                {isLargeFile && (
                                    <p>
                                        {Math.round(
                                            (uploadedSize / fileSize) * 100,
                                        )}
                                        %
                                    </p>
                                )}

                                <div className="mt-2 flex justify-end gap-2">
                                    {isUploading && isLargeFile ? (
                                        <DeleteButton
                                            onClick={handleCloseUploadFileForm}
                                            deleteConfirmationId={
                                                cancelMultipart
                                                    ? "cancel"
                                                    : null
                                            }
                                            idMatcher={"cancel"}
                                            btnContent="Cancel upload"
                                            disabled={isDeletingFile}
                                        />
                                    ) : (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={handleCloseUploadFileForm}
                                            disabled={isUploading}
                                            className={`${isUploading ? "cursor-not-allowed opacity-70 pointer-events-none" : ""}`}
                                        >
                                            Cancel
                                        </Button>
                                    )}
                                    <Button
                                        type="submit"
                                        disabled={isUploading}
                                        className={`${isUploading ? "cursor-not-allowed opacity-70 pointer-events-none" : ""}`}
                                    >
                                        Upload file
                                    </Button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

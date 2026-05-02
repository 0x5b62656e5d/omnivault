import { useForm } from "@tanstack/react-form";
import type { QueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { FiUpload } from "react-icons/fi";
import { IoClose } from "react-icons/io5";
import { Loader } from "@/components/loader";
import { DeleteButton } from "../deleteButton";
import { Button } from "../ui/button";

export const useFileUploadForm = ({
    setErrormsg,
    setIsUploading,
    setShowUploadFileForm,
    providerId,
    bucketId,
    queryClient,
    setIsDeletingFile,
    isUploading,
    isDeletingFile,
}: {
    setErrormsg: (msg: string | null) => void;
    setIsUploading: (uploading: boolean) => void;
    setShowUploadFileForm: (show: boolean) => void;
    providerId: string;
    bucketId: string;
    queryClient: QueryClient;
    setIsDeletingFile: (deleting: boolean) => void;
    isUploading: boolean;
    isDeletingFile: boolean;
}) => {
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [uploadedSize, setUploadedSize] = useState(0);
    const [isLargeFile, setIsLargeFile] = useState(false);
    const [fileSize, setFileSize] = useState(0);
    const [cancelMultipart, setCancelMultipart] = useState(false);
    const uploadAbortControllerRef = useRef<AbortController | null>(null);
    const multipartUploadRef = useRef<{
        uploadId: string;
        fileName: string;
    } | null>(null);
    const menuRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                menuRef.current &&
                !menuRef.current.contains(event.target as Node)
            ) {
                setShowUploadFileForm(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [setShowUploadFileForm]);

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

    return {
        component: (
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
                    ref={menuRef}
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
                        <h2 className="text-xl font-semibold">Upload File</h2>
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
                            {field => {
                                return (
                                    <>
                                        <div className="flex flex-col gap-1">
                                            <span className="text-sm font-medium">
                                                File
                                            </span>
                                            <input
                                                ref={fileInputRef}
                                                type="file"
                                                onBlur={field.handleBlur}
                                                onChange={event => {
                                                    const file =
                                                        event.target
                                                            .files?.[0] || null;

                                                    field.handleChange(file);
                                                }}
                                                className="hidden"
                                            />
                                        </div>
                                        {field.state.value ? (
                                            <div className="flex items-center justify-between rounded-md border bg-background px-3 py-2">
                                                <div className="flex min-w-0 flex-col">
                                                    <span className="truncate text-sm font-medium">
                                                        {field.state.value.name}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">
                                                        {field.state.value.size}{" "}
                                                        bytes
                                                    </span>
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        field.handleChange(
                                                            null,
                                                        );
                                                        form.setFieldValue(
                                                            "fileName",
                                                            "",
                                                        );

                                                        if (
                                                            fileInputRef.current
                                                        ) {
                                                            fileInputRef.current.value =
                                                                "";
                                                        }
                                                    }}
                                                    className="rounded-full p-1 transition-transform hover:bg-muted"
                                                >
                                                    <IoClose className="h-5 w-5" />
                                                </button>
                                            </div>
                                        ) : (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() =>
                                                    fileInputRef.current?.click()
                                                }
                                                className="w-fit gap-2"
                                            >
                                                <FiUpload className="h-4 w-4" />
                                                Choose file
                                            </Button>
                                        )}

                                        {field.state.meta.errors.length > 0 && (
                                            <span className="text-sm text-destructive">
                                                {field.state.meta.errors.join(
                                                    ", ",
                                                )}
                                            </span>
                                        )}
                                    </>
                                );
                            }}
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
                                        Override file name (without extension,
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
                                    {field.state.meta.errors.length > 0 && (
                                        <span className="text-sm text-destructive">
                                            {field.state.meta.errors.join(", ")}
                                        </span>
                                    )}
                                </label>
                            )}
                        </form.Field>

                        {isUploading && <Loader />}

                        {isLargeFile && (
                            <p>
                                {Math.round((uploadedSize / fileSize) * 100)}%
                            </p>
                        )}

                        <div className="mt-2 flex justify-end gap-2">
                            {isUploading && isLargeFile ? (
                                <DeleteButton
                                    onClick={handleCloseUploadFileForm}
                                    deleteConfirmationId={
                                        cancelMultipart ? "cancel" : null
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
        ),
        form,
    };
};

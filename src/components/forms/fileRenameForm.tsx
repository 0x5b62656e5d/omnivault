import { useForm } from "@tanstack/react-form";
import type { QueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useEffect, useRef } from "react";
import { IoClose } from "react-icons/io5";
import { Button } from "@/components/ui/button";

export const useFileRenameForm = ({
    setShowRenameForm,
    setErrormsg,
    providerId,
    bucketId,
    oldFilename,
    queryClient,
    disabled,
    isUploading,
}: {
    setShowRenameForm: (show: boolean) => void;
    setErrormsg: (msg: string | null) => void;
    providerId: string;
    bucketId: string;
    oldFilename: string;
    queryClient: QueryClient;
    disabled: boolean;
    isUploading: boolean;
}) => {
    const menuRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                menuRef.current &&
                !menuRef.current.contains(event.target as Node)
            ) {
                setShowRenameForm(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [setShowRenameForm]);

    const form = useForm({
        defaultValues: {
            newFilename: "",
        },
        onSubmit: async ({ value }) => {
            setShowRenameForm(false);
            setErrormsg(null);

            const res = await fetch("/api/s3/files", {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    newFilename: value.newFilename,
                    providerId,
                    bucketId,
                    oldFilename,
                }),
            });

            form.reset();

            if (!res.ok) {
                console.error("S3 file mgmt error 101");
                setErrormsg("Failed to rename S3 file - Err 101");
                return;
            }

            queryClient.invalidateQueries({
                queryKey: ["s3-files", providerId, bucketId],
            });
        },
    });

    const handleCloseRenameForm = () => {
        setShowRenameForm(false);
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
                        onClick={handleCloseRenameForm}
                        className="absolute right-4 top-4 rounded-full p-1 transition hover:bg-muted"
                        aria-label="Close rename file form"
                    >
                        <IoClose className="h-6 w-6" />
                    </button>

                    <div className="mb-6">
                        <h2 className="text-xl font-semibold">Rename File</h2>
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
                            name="newFilename"
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

                                    if (value.trim() === oldFilename) {
                                        return "New file name cannot be the same as the old file name";
                                    }

                                    return undefined;
                                },
                            }}
                        >
                            {field => (
                                <label className="flex flex-col gap-1">
                                    <span className="text-sm font-medium">
                                        File name (without extension)
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

                        <div className="mt-2 flex justify-end gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleCloseRenameForm}
                                disabled={disabled || isUploading}
                                className={`${isUploading ? "cursor-not-allowed opacity-70 pointer-events-none" : ""}`}
                            >
                                Cancel
                            </Button>
                            <Button type="submit">Rename file</Button>
                        </div>
                    </form>
                </motion.div>
            </motion.div>
        ),
        form,
    };
};

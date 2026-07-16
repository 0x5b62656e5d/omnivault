import { useForm } from "@tanstack/react-form";
import { motion } from "framer-motion";
import { useEffect, useRef } from "react";
import { IoClose } from "react-icons/io5";
import { Button } from "../ui/button";

export const useFileShareForm = ({
    setShowFileShareForm,
    setErrormsg,
    providerId,
    bucketId,
    fileKey,
    disabled,
    isUploading,
    customBucketUrl,
}: {
    setShowFileShareForm: (show: boolean) => void;
    setErrormsg: (msg: string | null) => void;
    providerId: string;
    bucketId: string;
    fileKey: string;
    disabled: boolean;
    isUploading: boolean;
    customBucketUrl: string | null;
}) => {
    const menuRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                menuRef.current &&
                !menuRef.current.contains(event.target as Node)
            ) {
                setShowFileShareForm(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [setShowFileShareForm]);

    const form = useForm({
        defaultValues: {
            expirationDate: new Date(),
            preview: false,
        },
        onSubmit: async ({ value }) => {
            setShowFileShareForm(false);
            setErrormsg(null);

            const res = await fetch(
                `/api/s3/files/share?providerId=${providerId}&bucketId=${bucketId}&fileIdentifier=${fileKey}&expiryTime=${value.expirationDate.getTime()}&preview=${value.preview}`,
                {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                    },
                },
            );

            form.reset();

            if (!res.ok) {
                console.error("S3 file sharing error 101");
                setErrormsg("Failed to generate shared URL - Err 101");
                return;
            }

            const json = await res.json();

            if (!json.success) {
                setErrormsg("S3 file mgmt error 203");
                return;
            }

            navigator.clipboard.writeText(json.data);
            alert("Shareable URL copied to clipboard!");
        },
    });

    const handleCloseShareFileForm = () => {
        setShowFileShareForm(false);
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
                        onClick={handleCloseShareFileForm}
                        className="absolute right-4 top-4 rounded-full p-1 transition hover:bg-muted"
                        aria-label="Close rename file form"
                    >
                        <IoClose className="h-6 w-6" />
                    </button>

                    <div className="mb-6">
                        <h2 className="text-xl font-semibold">
                            Share {fileKey.split("/").pop() || "file"}
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
                            name="expirationDate"
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
                                        Expiry date
                                    </span>
                                    <input
                                        value={(() => {
                                            const d = field.state.value;
                                            const pad = (n: number) =>
                                                String(n).padStart(2, "0");
                                            return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
                                        })()}
                                        onBlur={field.handleBlur}
                                        onChange={event => {
                                            field.handleChange(
                                                new Date(event.target.value),
                                            );
                                        }}
                                        type="datetime-local"
                                        min={(() => {
                                            const d = new Date();
                                            const pad = (n: number) =>
                                                String(n).padStart(2, "0");
                                            return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
                                        })()}
                                        max={(() => {
                                            const d = new Date(
                                                Date.now() +
                                                    7 * 24 * 60 * 60 * 1000,
                                            );
                                            const pad = (n: number) =>
                                                String(n).padStart(2, "0");
                                            return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
                                        })()}
                                        className="w-max"
                                    />
                                    {field.state.meta.errors.length > 0 && (
                                        <span className="text-sm text-destructive">
                                            {field.state.meta.errors.join(", ")}
                                        </span>
                                    )}
                                </label>
                            )}
                        </form.Field>

                        {!customBucketUrl && (
                            <form.Field name="preview">
                                {field => (
                                    <label className="flex flex-col gap-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium">
                                                Preview (if the URL should
                                                download the file)
                                            </span>
                                            <input
                                                value={
                                                    field.state.value
                                                        ? "true"
                                                        : "false"
                                                }
                                                onBlur={field.handleBlur}
                                                onChange={event => {
                                                    field.handleChange(
                                                        event.target.checked,
                                                    );
                                                }}
                                                type="checkbox"
                                                className="w-4 h-4 border border-default-medium rounded-xs bg-neutral-secondary-medium focus:ring-2 focus:ring-brand-soft"
                                            />
                                        </div>
                                        {field.state.meta.errors.length > 0 && (
                                            <span className="text-sm text-destructive">
                                                {field.state.meta.errors.join(
                                                    ", ",
                                                )}
                                            </span>
                                        )}
                                    </label>
                                )}
                            </form.Field>
                        )}

                        <div className="mt-2 flex justify-end gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleCloseShareFileForm}
                                disabled={disabled || isUploading}
                                className={`${isUploading ? "cursor-not-allowed opacity-70 pointer-events-none" : ""}`}
                            >
                                Cancel
                            </Button>
                            <Button type="submit">Generate link</Button>
                        </div>
                    </form>
                </motion.div>
            </motion.div>
        ),
    };
};

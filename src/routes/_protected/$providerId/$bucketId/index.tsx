import type { _Object } from "@aws-sdk/client-s3";
import { useDebouncedValue } from "@tanstack/react-pacer";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { FiArrowUpRight, FiFolder } from "react-icons/fi";
import { HiDotsHorizontal } from "react-icons/hi";
import { RiArrowUpDownFill } from "react-icons/ri";
import { DeleteButton } from "@/components/deleteButton";
import { useFileRenameForm } from "@/components/forms/fileRenameForm";
import { useFileUploadForm } from "@/components/forms/fileUploadForm";
import { MoveBucketForm } from "@/components/forms/moveBucketForm";
import { Loader } from "@/components/loader";
import { Button } from "@/components/ui/button";
import { stripExtension } from "@/lib/fileExtension";
import { getFileSizeUnits } from "@/lib/filesizeUnits";

type DirectoryEntry =
    | {
          type: "folder";
          name: string;
          key: string;
          size: 0;
          isEmpty: boolean;
      }
    | {
          type: "file";
          name: string;
          key: string;
          size: number;
          file: _Object;
      };

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
    const [isDeletingFile, setIsDeletingFile] = useState(false);
    const [showRenameForm, setShowRenameForm] = useState(false);
    const [oldFilename, setOldFilename] = useState<string>("");
    const [isDragging, setIsDragging] = useState(false);
    const [showMoveBucketForm, setShowMoveBucketForm] = useState(false);
    const [bucketList, setBucketList] = useState<
        { id: string; name: string }[]
    >([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [currentPrefix, setCurrentPrefix] = useState("");
    const [openFileMenuKey, setOpenFileMenuKey] = useState<string | null>(null);
    const [filterBy, setFilterBy] = useState<"name" | "size">("name");
    const [filterOrder, setFilterOrder] = useState<"asc" | "desc">("asc");
    const [debouncedSearchQuery, _searchQueryDebouncer] = useDebouncedValue(
        searchQuery,
        {
            wait: 300,
        },
    );
    const [debouncedFilterBy, _filterByDebouncer] = useDebouncedValue(
        filterBy,
        {
            wait: 300,
        },
    );
    const [debouncedFilterOrder, _filterOrderDebouncer] = useDebouncedValue(
        filterOrder,
        {
            wait: 300,
        },
    );

    const fileUploadForm = useFileUploadForm({
        setErrormsg,
        setIsUploading,
        setShowUploadFileForm,
        providerId,
        bucketId,
        queryClient,
        setIsDeletingFile,
        isUploading,
        isDeletingFile,
    });

    useEffect(() => {
        const queryBucketList = queryClient.getQueryData<
            | {
                  id: string;
                  name: string;
              }[]
            | undefined
        >(["s3-buckets", providerId]);

        if (queryBucketList) {
            setBucketList(queryBucketList);
            return;
        }

        (async () => {
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

            setBucketList(json.data);
        })();
    }, [providerId, queryClient.getQueryData]);

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

    const fileRenameForm = useFileRenameForm({
        setShowRenameForm,
        setErrormsg,
        providerId,
        bucketId,
        oldFilename,
        queryClient,
        disabled: isUploading || isRefetching || isLoading,
        isUploading,
    });

    const directoryEntries = (data || []).reduce<DirectoryEntry[]>(
        (entries, file) => {
            const key = file.Key || "";

            if (!key.startsWith(currentPrefix)) {
                return entries;
            }

            const relativeKey = key.slice(currentPrefix.length);

            if (!relativeKey) {
                return entries;
            }

            const parts = relativeKey.split("/").filter(Boolean);

            if (parts.length === 0) {
                return entries;
            }

            if (parts.length > 1) {
                const folderName = parts[0];
                const folderKey = `${currentPrefix}${folderName}/`;
                const folderExists = entries.some(
                    entry => entry.type === "folder" && entry.key === folderKey,
                );

                if (!folderExists) {
                    const folderChildren = (data || []).filter(
                        child =>
                            child.Key?.startsWith(folderKey) &&
                            child.Key !== folderKey,
                    );

                    entries.push({
                        type: "folder",
                        name: folderName,
                        key: folderKey,
                        size: 0,
                        isEmpty: folderChildren.length === 0,
                    });
                }

                return entries;
            }

            if (key.endsWith("/") && (file.Size || 0) === 0) {
                const folderName = parts[0];
                const folderKey = `${currentPrefix}${folderName}/`;
                const folderExists = entries.some(
                    entry => entry.type === "folder" && entry.key === folderKey,
                );

                if (!folderExists) {
                    const folderChildren = (data || []).filter(
                        child =>
                            child.Key?.startsWith(folderKey) &&
                            child.Key !== folderKey,
                    );

                    entries.push({
                        type: "folder",
                        name: folderName,
                        key: folderKey,
                        size: 0,
                        isEmpty: folderChildren.length === 0,
                    });
                }

                return entries;
            }

            entries.push({
                type: "file",
                name: parts[0],
                key,
                size: file.Size || 0,
                file,
            });

            return entries;
        },
        [],
    );

    const filteredDirectoryEntries = directoryEntries
        .filter(entry =>
            entry.name
                .toLowerCase()
                .includes(debouncedSearchQuery.toLowerCase()),
        )
        .sort((a, b) => {
            if (a.type !== b.type) {
                return a.type === "folder" ? -1 : 1;
            }

            if (debouncedFilterBy === "name") {
                return (
                    a.name.localeCompare(b.name) *
                    (debouncedFilterOrder === "asc" ? 1 : -1)
                );
            }

            return (
                (a.size - b.size) * (debouncedFilterOrder === "asc" ? 1 : -1)
            );
        });

    const currentFolderParts = currentPrefix.split("/").filter(Boolean);
    const getPrefixForBreadcrumbIndex = (index: number) => {
        const prefix = currentFolderParts.slice(0, index + 1).join("/");
        return prefix ? `${prefix}/` : "";
    };

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

    const handleRenameFile = (filename: string) => {
        setOldFilename(filename);
        fileRenameForm.form.setFieldValue(
            "newFilename",
            stripExtension(filename),
        );
        setShowRenameForm(true);
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

    const handleMoveFile = (filename: string) => {
        setOldFilename(filename);
        setShowMoveBucketForm(true);
    };

    const handleDragEnter = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();

        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            setIsDragging(false);
        }
    };

    const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
    };

    const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        setIsDragging(false);
        const files = event.dataTransfer.files;

        if (files.length > 0) {
            const file = files[0];
            fileUploadForm.form.setFieldValue("file", file);
            setShowUploadFileForm(true);
        }
    };

    const handleFilterByChange = () => {
        setFilterBy(prev => (prev === "name" ? "size" : "name"));
    };

    const handleFilterOrderChange = () => {
        setFilterOrder(prev => (prev === "asc" ? "desc" : "asc"));
    };

    return (
        <div
            className={`relative flex flex-col gap-4 w-[95%] lg:w-[80%] mx-auto rounded p-4 ${isDragging ? "border-4 border-dashed border-primary/50" : ""}`}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            <p>
                Viewing files in:{" "}
                {bucketList.filter(b => b.id === bucketId)[0]?.name ||
                    "Unknown Bucket"}
            </p>
            <div className="flex gap-2 justify-center items-center">
                <label className="flex flex-col gap-1 w-full">
                    <input
                        value={searchQuery}
                        onChange={event => {
                            setSearchQuery(event.target.value);
                        }}
                        placeholder="Search files..."
                        className="rounded-md border bg-background px-3 py-2 outline-none transition focus:ring-2 focus:ring-ring"
                        disabled={
                            isDeletingFile ||
                            isLoading ||
                            isRefetching ||
                            isUploading
                        }
                    />
                </label>
                <Button
                    onClick={handleFilterByChange}
                    disabled={
                        isDeletingFile ||
                        isLoading ||
                        isRefetching ||
                        isUploading
                    }
                    className="max-w-20 text-wrap! h-fit"
                >
                    {filterBy === "name" ? "Filter: name" : "Filter: size"}
                </Button>
                <Button
                    onClick={handleFilterOrderChange}
                    disabled={
                        isDeletingFile ||
                        isLoading ||
                        isRefetching ||
                        isUploading
                    }
                >
                    <RiArrowUpDownFill />
                </Button>
            </div>
            <div className="text-sm text-muted-foreground">
                Current folder: {""}
                <button
                    type="button"
                    className="underline hover:cursor-pointer hover:text-foreground px-1"
                    onClick={() => {
                        setCurrentPrefix("");
                        setSearchQuery("");
                    }}
                    disabled={
                        isDeletingFile ||
                        isLoading ||
                        isRefetching ||
                        isUploading
                    }
                >
                    /
                </button>
                {currentFolderParts.map((part, index) => (
                    <span key={getPrefixForBreadcrumbIndex(index)}>
                        {index !== 0 && <span>/</span>}
                        <button
                            type="button"
                            className="underline hover:cursor-pointer hover:text-foreground px-1"
                            onClick={() => {
                                setCurrentPrefix(
                                    getPrefixForBreadcrumbIndex(index),
                                );
                                setSearchQuery("");
                            }}
                            disabled={
                                isDeletingFile ||
                                isLoading ||
                                isRefetching ||
                                isUploading
                            }
                        >
                            {part}
                        </button>
                    </span>
                ))}
            </div>
            {(isLoading || isRefetching) && <Loader />}
            <AnimatePresence>
                {isDragging && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="absolute inset-0 flex w-full h-full justify-center items-center bg-primary/20 backdrop-blur-xs"
                    >
                        <p className="text-2xl font-medium">Drop files here</p>
                    </motion.div>
                )}
            </AnimatePresence>
            {filteredDirectoryEntries.map((entry, idx) => (
                <div
                    key={entry.key}
                    className="rounded flex justify-between items-center border-2 p-4"
                >
                    <div className="flex p-4 gap-2">
                        {entry.type === "folder" ? (
                            <button
                                type="button"
                                className="inline-flex hover:cursor-pointer justify-center items-center gap-2"
                                onClick={() => {
                                    setCurrentPrefix(entry.key);
                                    setSearchQuery("");
                                }}
                            >
                                <FiFolder />
                                <u>{entry.name}</u>
                            </button>
                        ) : (
                            <div className="flex flex-col gap-1 lg:block">
                                <p
                                    className="inline-flex hover:cursor-pointer justify-center items-center"
                                    onClick={() =>
                                        handleGetFilePreview(entry.key)
                                    }
                                >
                                    <u>{entry.name}</u> <FiArrowUpRight />
                                </p>
                                <p>{getFileSizeUnits(entry.size)}</p>
                            </div>
                        )}
                    </div>
                    {entry.type === "folder" && entry.isEmpty && (
                        <DeleteButton
                            onClick={() => deleteFile(entry.key)}
                            deleteConfirmationId={deleteConfirmationId}
                            idMatcher={entry.key}
                            disabled={
                                isDeletingFile || isLoading || isRefetching
                            }
                        />
                    )}
                    {entry.type === "file" && (
                        <div className="relative flex gap-2 items-center">
                            <Button
                                type="button"
                                onClick={() => {
                                    setOpenFileMenuKey(prev =>
                                        prev === entry.key ? null : entry.key,
                                    );
                                }}
                                className="lg:hidden"
                                variant="secondary"
                                disabled={
                                    isDeletingFile || isLoading || isRefetching
                                }
                            >
                                <HiDotsHorizontal />
                            </Button>
                            {openFileMenuKey === entry.key && (
                                <div className="absolute right-0 top-full z-20 mt-2 flex min-w-36 flex-col gap-2 rounded-md border bg-background p-2 shadow-lg lg:hidden">
                                    <Button
                                        type="button"
                                        onClick={() => {
                                            handleRenameFile(entry.key);
                                            setOpenFileMenuKey(null);
                                        }}
                                        className={`${isLoading || isRefetching || isDeletingFile ? "cursor-not-allowed opacity-70 pointer-events-none" : ""}`}
                                        disabled={
                                            isDeletingFile ||
                                            isLoading ||
                                            isRefetching
                                        }
                                    >
                                        Rename
                                    </Button>
                                    <Button
                                        type="button"
                                        onClick={() => {
                                            handleMoveFile(entry.key);
                                            setOpenFileMenuKey(null);
                                        }}
                                        className={`${isLoading || isRefetching || isDeletingFile ? "cursor-not-allowed opacity-70 pointer-events-none" : ""}`}
                                        disabled={
                                            isDeletingFile ||
                                            isLoading ||
                                            isRefetching
                                        }
                                        variant="secondary"
                                    >
                                        Move
                                    </Button>
                                    <Button
                                        type="button"
                                        onClick={() => {
                                            getPresignedUrl(entry.key);
                                            setOpenFileMenuKey(null);
                                        }}
                                        className={`${isLoading || isRefetching || isDeletingFile ? "cursor-not-allowed opacity-70 pointer-events-none" : ""}`}
                                        disabled={
                                            isDeletingFile ||
                                            isLoading ||
                                            isRefetching
                                        }
                                    >
                                        Download
                                    </Button>
                                    <DeleteButton
                                        onClick={() => {
                                            deleteFile(entry.key);
                                            setOpenFileMenuKey(null);
                                        }}
                                        deleteConfirmationId={
                                            deleteConfirmationId
                                        }
                                        idMatcher={entry.key}
                                        disabled={
                                            isDeletingFile ||
                                            isLoading ||
                                            isRefetching
                                        }
                                    />
                                </div>
                            )}
                            <div className="hidden lg:flex flex-col gap-2">
                                <Button
                                    type="button"
                                    key={`${idx}-Rename`}
                                    onClick={() => handleRenameFile(entry.key)}
                                    className={`${isLoading || isRefetching || isDeletingFile ? "cursor-not-allowed opacity-70 pointer-events-none" : ""}`}
                                    disabled={
                                        isDeletingFile ||
                                        isLoading ||
                                        isRefetching
                                    }
                                >
                                    Rename
                                </Button>
                                <Button
                                    type="button"
                                    key={`${idx}-Move`}
                                    onClick={() => handleMoveFile(entry.key)}
                                    className={`${isLoading || isRefetching || isDeletingFile ? "cursor-not-allowed opacity-70 pointer-events-none" : ""}`}
                                    disabled={
                                        isDeletingFile ||
                                        isLoading ||
                                        isRefetching
                                    }
                                    variant="secondary"
                                >
                                    Move
                                </Button>
                            </div>
                            <div className="hidden lg:flex flex-col gap-2">
                                <Button
                                    type="button"
                                    key={`${idx}-Download`}
                                    onClick={() => getPresignedUrl(entry.key)}
                                    className={`${isLoading || isRefetching || isDeletingFile ? "cursor-not-allowed opacity-70 pointer-events-none" : ""}`}
                                    disabled={
                                        isDeletingFile ||
                                        isLoading ||
                                        isRefetching
                                    }
                                >
                                    Download
                                </Button>
                                <DeleteButton
                                    onClick={() => deleteFile(entry.key)}
                                    deleteConfirmationId={deleteConfirmationId}
                                    idMatcher={entry.key}
                                    disabled={
                                        isDeletingFile ||
                                        isLoading ||
                                        isRefetching
                                    }
                                />
                            </div>
                        </div>
                    )}
                </div>
            ))}
            {data?.length === 0 && <p>No files found in this bucket.</p>}
            {data &&
                data.length > 0 &&
                filteredDirectoryEntries.length === 0 && (
                    <p>No files found in this folder.</p>
                )}
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
                {showRenameForm && fileRenameForm.component}
                {showMoveBucketForm && (
                    <MoveBucketForm
                        setShowMoveBucketForm={setShowMoveBucketForm}
                        setErrormsg={setErrormsg}
                        providerId={providerId}
                        bucketId={bucketId}
                        bucketList={bucketList}
                        oldFilename={oldFilename}
                        setOldFilename={setOldFilename}
                        queryClient={queryClient}
                        disabled={isDeletingFile || isLoading || isRefetching}
                        isUploading={isUploading}
                    />
                )}
                {showUploadFileForm && fileUploadForm.component}
            </AnimatePresence>
        </div>
    );
}

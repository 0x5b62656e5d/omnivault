export const stripExtension = (filename: string) => {
    const lastDot = filename.lastIndexOf(".");

    if (lastDot === -1) {
        return filename;
    }

    return filename.slice(0, lastDot);
};

export const getExtension = (filename: string) => {
    const lastDot = filename.lastIndexOf(".");

    if (lastDot === -1) {
        return "";
    }

    return filename.slice(lastDot + 1);
};

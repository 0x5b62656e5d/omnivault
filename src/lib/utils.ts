import type { ClassValue } from "clsx";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type StandardResponse from "@/lib/types";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export const createStandardResponse = <T>(
    success: boolean,
    data: T | null,
    message: string | null,
    error: string | null,
): StandardResponse<T> => {
    return {
        success,
        data,
        message,
        error,
    };
};

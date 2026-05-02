import { S3Client } from "@aws-sdk/client-s3";
import type { S3Credential } from "@/lib/types";

export const createClient = (region: string, s3Credential: S3Credential) => {
    return new S3Client({
        region: region,
        endpoint: s3Credential.endpointUrl || undefined,
        credentials: {
            accessKeyId: s3Credential.accessKeyId,
            secretAccessKey: s3Credential.secretAccessKey,
        },
        forcePathStyle: true,
    });
};

export const getRegion = (endpointUrl: string): string | null => {
    try {
        const hostname = new URL(endpointUrl).hostname;

        const backblazeMatch = hostname.match(
            /^s3\.([^.]+)\.backblazeb2\.com$/,
        );
        if (backblazeMatch) {
            return backblazeMatch[1];
        }

        if (hostname.endsWith(".r2.cloudflarestorage.com")) {
            return "auto";
        }

        return null;
    } catch {
        return null;
    }
};

export type S3Provider = "aws" | "b2" | "r2" | "unknown";

export const getProviderFromUrl = (endpointUrl: string): S3Provider => {
    try {
        const hostname = new URL(endpointUrl).hostname;

        if (hostname.includes(".backblazeb2.com")) {
            return "b2";
        } else if (hostname.includes(".amazonaws.com")) {
            return "aws";
        } else if (hostname.includes(".r2.cloudflarestorage.com")) {
            return "r2";
        }

        return "unknown";
    } catch {
        return "unknown";
    }
};

export const AWS_REGION_LIST = [
    "af-south-1",
    "ap-east-1",
    "ap-east-2",
    "ap-south-1",
    "ap-south-2",
    "ap-northeast-1",
    "ap-northeast-2",
    "ap-northeast-3",
    "ap-southeast-1",
    "ap-southeast-2",
    "ap-southeast-3",
    "ap-southeast-4",
    "ap-southeast-5",
    "ap-southeast-6",
    "ap-southeast-7",
    "ca-central-1",
    "ca-west-1",
    "eu-central-1",
    "eu-central-2",
    "eu-south-1",
    "eu-south-2",
    "eu-north-1",
    "eu-west-1",
    "eu-west-2",
    "eu-west-3",
    "il-central-1",
    "me-central-1",
    "me-south-1",
    "mx-central-1",
    "sa-east-1",
    "us-east-1",
    "us-east-2",
    "us-west-1",
    "us-west-2",
];

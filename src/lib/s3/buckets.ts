import {
    GetBucketCorsCommand,
    HeadBucketCommand,
    ListBucketsCommand,
    type ListBucketsCommandOutput,
    NotFound,
    PutBucketCorsCommand,
    type S3Client,
    S3ServiceException,
} from "@aws-sdk/client-s3";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { s3buckets, s3credentials } from "@/db/schema";
import { env } from "@/env/server";
import { hmacHash } from "@/lib/encryption";
import type { S3Credential } from "@/lib/types";
import { createClient } from "./client";

const omnivaultRule = {
    ID: "omnivault-browser-access",
    AllowedOrigins:
        env.ENVIRONMENT === "production"
            ? [env.BASE_URL]
            : ["http://localhost:3000", env.BASE_URL],
    AllowedMethods: ["GET", "PUT", "DELETE", "HEAD"],
    ExposeHeaders: ["ETag"],
    AllowedHeaders: [
        "Content-Type",
        "x-amz-content-sha256",
        "x-amz-date",
        "authorization",
        "x-amz-checksum-crc32",
        "x-amz-sdk-checksum-algorithm",
    ],
    MaxAgeSeconds: 3000,
};

export const loadBuckets = async (
    region: string,
    s3Credential: S3Credential,
): Promise<ListBucketsCommandOutput> => {
    const client = createClient(region, s3Credential);

    return await client.send(new ListBucketsCommand({}));
};

export const loadBucketRegions = async (
    userId: string,
    s3credential: S3Credential,
    ...buckets: string[]
) => {
    const client = createClient(s3credential.region, s3credential);
    const credentialId = await db
        .select()
        .from(s3credentials)
        .where(
            eq(
                s3credentials.accessKeyIdHash,
                hmacHash(s3credential.accessKeyId),
            ),
        )
        .limit(1);

    if (credentialId.length === 0) {
        console.error("Credential not found in database");
        return;
    }

    try {
        await db
            .delete(s3buckets)
            .where(eq(s3buckets.parentCredential, credentialId[0].id));
    } catch (error) {
        console.error("Error deleting existing buckets for credential:", error);
    }

    for (const bucket of buckets) {
        try {
            const res = await client.send(
                new HeadBucketCommand({ Bucket: bucket }),
            );

            await db
                .insert(s3buckets)
                .values({
                    name: bucket,
                    region: res.BucketRegion || "auto",
                    parentCredential: credentialId[0].id,
                    ownedBy: userId,
                })
                .onConflictDoUpdate({
                    target: [s3buckets.name, s3buckets.parentCredential],
                    set: {
                        region: res.BucketRegion || "auto",
                    },
                });

            await configureBucketCors(client, bucket);
        } catch (error) {
            if (error instanceof NotFound) {
                console.warn(
                    `Bucket ${bucket} not found, skipping region check.`,
                );
            } else if (error instanceof S3ServiceException) {
                console.error(`Error checking bucket ${bucket} region:`, error);
            } else {
                console.error(`Error checking bucket ${bucket} region:`, error);
            }
        }
    }
};

export const configureBucketCors = async (client: S3Client, bucket: string) => {
    try {
        const existingCors = await client
            .send(new GetBucketCorsCommand({ Bucket: bucket }))
            .catch((error: S3ServiceException) => {
                if (error.name.toLowerCase() === "nosuchcorsconfiguration") {
                    return null;
                }

                throw error;
            });

        const existingRules = existingCors?.CORSRules ?? [];

        const rulesWithoutOldOmnivaultRule = existingRules.filter(
            rule => rule.ID !== "omnivault-browser-access",
        );

        await client.send(
            new PutBucketCorsCommand({
                Bucket: bucket,
                CORSConfiguration: {
                    CORSRules: [...rulesWithoutOldOmnivaultRule, omnivaultRule],
                },
            }),
        );
    } catch (error) {
        console.error(`Error configuring CORS for bucket ${bucket}:`, error);
        throw new Error(`Failed to configure CORS for bucket ${bucket}`);
    }
};

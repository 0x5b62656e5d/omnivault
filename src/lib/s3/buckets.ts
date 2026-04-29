import {
    HeadBucketCommand,
    ListBucketsCommand,
    type ListBucketsCommandOutput,
    NotFound,
    S3ServiceException,
} from "@aws-sdk/client-s3";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { s3buckets, s3credentials } from "@/db/schema";
import type { S3Credential } from "@/lib/types";
import { hmacHash } from "../encryption";
import { createClient } from "./client";

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

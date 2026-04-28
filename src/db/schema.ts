import { createId } from "@paralleldrive/cuid2";
import { relations } from "drizzle-orm";
import {
    boolean,
    index,
    jsonb,
    pgTable,
    text,
    timestamp,
    uniqueIndex,
} from "drizzle-orm/pg-core";
import { user } from "./auth-schema";

export const s3credentials = pgTable(
    "s3credentials",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => createId()),
        name: text().notNull(),
        accessKeyId: text().notNull(),
        secretAccessKey: text().notNull(),
        endpointUrl: text(),
        accessKeyIdHash: text("access_key_id_hash").notNull(),
        ownedBy: text("owned_by")
            .notNull()
            .references(() => user.id, { onDelete: "cascade" }),
        createdAt: timestamp("created_at").defaultNow(),
    },
    table => [
        uniqueIndex("unique_user_access_key").on(
            table.ownedBy,
            table.accessKeyIdHash,
        ),
    ],
);

export const s3buckets = pgTable(
    "s3buckets",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => createId()),
        name: text().notNull(),
        region: text().notNull(),
        parentCredential: text("parent_credential")
            .notNull()
            .references(() => s3credentials.id, { onDelete: "cascade" }),
        ownedBy: text("owned_by")
            .notNull()
            .references(() => user.id, { onDelete: "cascade" }),
        createdAt: timestamp("created_at").defaultNow(),
    },
    table => [
        uniqueIndex("unique_bucket_per_credential").on(
            table.name,
            table.parentCredential,
        ),
    ],
);

export const multipartUploads = pgTable(
    "multipart_uploads",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => createId()),
        userId: text("user_id")
            .notNull()
            .references(() => user.id, { onDelete: "cascade" }),
        uploadId: text().notNull(),
        bucketId: text("bucket_id")
            .notNull()
            .references(() => s3buckets.id, { onDelete: "cascade" }),
        completed: boolean().default(false),
        completedParts: jsonb("completed_parts"),
        key: text().notNull(),
        initiatedAt: timestamp("initiated_at").defaultNow(),
    },
    table => [index("upload_id_idx").on(table.uploadId)],
);

export const s3credentialsToUserRelations = relations(
    s3credentials,
    ({ one }) => ({
        user: one(user, {
            fields: [s3credentials.ownedBy],
            references: [user.id],
        }),
    }),
);

export const s3bucketsToCredentialsRelations = relations(
    s3buckets,
    ({ one }) => ({
        credentials: one(s3credentials, {
            fields: [s3buckets.parentCredential],
            references: [s3credentials.id],
        }),
    }),
);

export const multipartUploadsToBucketsRelations = relations(
    multipartUploads,
    ({ one }) => ({
        bucket: one(s3buckets, {
            fields: [multipartUploads.bucketId],
            references: [s3buckets.id],
        }),
    }),
);

import { pgTable, index, text, timestamp, unique, boolean, foreignKey, jsonb, uniqueIndex } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const verification = pgTable("verification", {
	id: text().primaryKey().notNull(),
	identifier: text().notNull(),
	value: text().notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("verification_identifier_idx").using("btree", table.identifier.asc().nullsLast().op("text_ops")),
]);

export const user = pgTable("user", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	email: text().notNull(),
	emailVerified: boolean("email_verified").default(false).notNull(),
	image: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("user_email_unique").on(table.email),
]);

export const multipartUploads = pgTable("multipart_uploads", {
	id: text().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	uploadId: text().notNull(),
	bucketId: text("bucket_id").notNull(),
	completed: boolean().default(false),
	completedParts: jsonb("completed_parts"),
	key: text().notNull(),
	initiatedAt: timestamp("initiated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("upload_id_idx").using("btree", table.uploadId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "multipart_uploads_user_id_user_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.bucketId],
			foreignColumns: [s3Buckets.id],
			name: "multipart_uploads_bucket_id_s3buckets_id_fk"
		}).onDelete("cascade"),
]);

export const account = pgTable("account", {
	id: text().primaryKey().notNull(),
	accountId: text("account_id").notNull(),
	providerId: text("provider_id").notNull(),
	userId: text("user_id").notNull(),
	accessToken: text("access_token"),
	refreshToken: text("refresh_token"),
	idToken: text("id_token"),
	accessTokenExpiresAt: timestamp("access_token_expires_at", { mode: 'string' }),
	refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { mode: 'string' }),
	scope: text(),
	password: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).notNull(),
}, (table) => [
	index("account_userId_idx").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "account_user_id_user_id_fk"
		}).onDelete("cascade"),
]);

export const session = pgTable("session", {
	id: text().primaryKey().notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	token: text().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).notNull(),
	ipAddress: text("ip_address"),
	userAgent: text("user_agent"),
	userId: text("user_id").notNull(),
}, (table) => [
	index("session_userId_idx").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "session_user_id_user_id_fk"
		}).onDelete("cascade"),
	unique("session_token_unique").on(table.token),
]);

export const s3Buckets = pgTable("s3buckets", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	region: text().notNull(),
	parentCredential: text("parent_credential").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	ownedBy: text("owned_by").notNull(),
}, (table) => [
	uniqueIndex("unique_bucket_per_credential").using("btree", table.name.asc().nullsLast().op("text_ops"), table.parentCredential.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.parentCredential],
			foreignColumns: [s3Credentials.id],
			name: "s3buckets_parent_credential_s3credentials_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.ownedBy],
			foreignColumns: [user.id],
			name: "s3buckets_owned_by_user_id_fk"
		}).onDelete("cascade"),
]);

export const s3Credentials = pgTable("s3credentials", {
	id: text().primaryKey().notNull(),
	accessKeyId: text().notNull(),
	secretAccessKey: text().notNull(),
	endpointUrl: text(),
	ownedBy: text("owned_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	name: text().notNull(),
	accessKeyIdHash: text("access_key_id_hash").notNull(),
	region: text().notNull(),
}, (table) => [
	uniqueIndex("unique_user_access_key").using("btree", table.ownedBy.asc().nullsLast().op("text_ops"), table.accessKeyIdHash.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.ownedBy],
			foreignColumns: [user.id],
			name: "s3credentials_owned_by_user_id_fk"
		}).onDelete("cascade"),
]);

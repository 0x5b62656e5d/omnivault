import { relations } from "drizzle-orm/relations";
import { user, multipartUploads, s3Buckets, account, session, s3Credentials } from "./schema";

export const multipartUploadsRelations = relations(multipartUploads, ({one}) => ({
	user: one(user, {
		fields: [multipartUploads.userId],
		references: [user.id]
	}),
	s3Bucket: one(s3Buckets, {
		fields: [multipartUploads.bucketId],
		references: [s3Buckets.id]
	}),
}));

export const userRelations = relations(user, ({many}) => ({
	multipartUploads: many(multipartUploads),
	accounts: many(account),
	sessions: many(session),
	s3Buckets: many(s3Buckets),
	s3Credentials: many(s3Credentials),
}));

export const s3BucketsRelations = relations(s3Buckets, ({one, many}) => ({
	multipartUploads: many(multipartUploads),
	s3Credential: one(s3Credentials, {
		fields: [s3Buckets.parentCredential],
		references: [s3Credentials.id]
	}),
	user: one(user, {
		fields: [s3Buckets.ownedBy],
		references: [user.id]
	}),
}));

export const accountRelations = relations(account, ({one}) => ({
	user: one(user, {
		fields: [account.userId],
		references: [user.id]
	}),
}));

export const sessionRelations = relations(session, ({one}) => ({
	user: one(user, {
		fields: [session.userId],
		references: [user.id]
	}),
}));

export const s3CredentialsRelations = relations(s3Credentials, ({one, many}) => ({
	s3Buckets: many(s3Buckets),
	user: one(user, {
		fields: [s3Credentials.ownedBy],
		references: [user.id]
	}),
}));
CREATE TABLE "file_urls" (
	"id" text PRIMARY KEY NOT NULL,
	"file_key" text NOT NULL,
	"url" text NOT NULL,
	"download" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"expires_at" timestamp NOT NULL
);

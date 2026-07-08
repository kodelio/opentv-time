CREATE TABLE `import_pending` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`kind` text NOT NULL,
	`dedupe_key` text NOT NULL,
	`raw_title` text NOT NULL,
	`release_year` integer,
	`runtime` integer,
	`source_rows` text DEFAULT '[]' NOT NULL,
	`candidates` text DEFAULT '[]' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`resolved_tmdb_id` integer,
	`resolved_at` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `import_pending_dedupe_key_unique` ON `import_pending` (`dedupe_key`);--> statement-breakpoint
CREATE INDEX `import_pending_status_idx` ON `import_pending` (`status`);--> statement-breakpoint
CREATE TABLE `movies` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tmdb_id` integer NOT NULL,
	`title` text NOT NULL,
	`original_title` text,
	`overview` text,
	`poster_path` text,
	`backdrop_path` text,
	`release_date` text,
	`runtime` integer,
	`genres` text DEFAULT '[]' NOT NULL,
	`last_synced_at` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `movies_tmdb_id_unique` ON `movies` (`tmdb_id`);--> statement-breakpoint
CREATE TABLE `episodes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`show_id` integer NOT NULL,
	`season_number` integer NOT NULL,
	`episode_number` integer NOT NULL,
	`tmdb_id` integer,
	`tvdb_id` integer,
	`name` text,
	`overview` text,
	`air_date` text,
	`runtime` integer,
	`still_path` text,
	FOREIGN KEY (`show_id`) REFERENCES `shows`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `episodes_show_season_episode_unique` ON `episodes` (`show_id`,`season_number`,`episode_number`);--> statement-breakpoint
CREATE UNIQUE INDEX `episodes_tmdb_id_unique` ON `episodes` (`tmdb_id`);--> statement-breakpoint
CREATE INDEX `episodes_air_date_idx` ON `episodes` (`air_date`);--> statement-breakpoint
CREATE INDEX `episodes_show_season_idx` ON `episodes` (`show_id`,`season_number`);--> statement-breakpoint
CREATE TABLE `seasons` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`show_id` integer NOT NULL,
	`tmdb_id` integer,
	`season_number` integer NOT NULL,
	`name` text,
	`poster_path` text,
	`episode_count` integer DEFAULT 0 NOT NULL,
	`air_date` text,
	FOREIGN KEY (`show_id`) REFERENCES `shows`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `seasons_show_season_unique` ON `seasons` (`show_id`,`season_number`);--> statement-breakpoint
CREATE TABLE `show_states` (
	`show_id` integer PRIMARY KEY NOT NULL,
	`is_followed` integer DEFAULT false NOT NULL,
	`is_archived` integer DEFAULT false NOT NULL,
	`is_favorite` integer DEFAULT false NOT NULL,
	`followed_at` text,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`show_id`) REFERENCES `shows`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `shows` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tmdb_id` integer NOT NULL,
	`tvdb_id` integer,
	`name` text NOT NULL,
	`original_name` text,
	`overview` text,
	`poster_path` text,
	`backdrop_path` text,
	`first_air_date` text,
	`status` text,
	`in_production` integer DEFAULT false NOT NULL,
	`genres` text DEFAULT '[]' NOT NULL,
	`number_of_seasons` integer DEFAULT 0 NOT NULL,
	`number_of_episodes` integer DEFAULT 0 NOT NULL,
	`episode_run_time` integer,
	`next_episode_air_date` text,
	`last_synced_at` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `shows_tmdb_id_unique` ON `shows` (`tmdb_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `shows_tvdb_id_unique` ON `shows` (`tvdb_id`);--> statement-breakpoint
CREATE TABLE `sync_runs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`kind` text NOT NULL,
	`started_at` text NOT NULL,
	`finished_at` text,
	`shows_refreshed` integer DEFAULT 0 NOT NULL,
	`errors` text DEFAULT '[]' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `episode_watches` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`episode_id` integer NOT NULL,
	`watched_at` text NOT NULL,
	`is_rewatch` integer DEFAULT false NOT NULL,
	`source` text DEFAULT 'app' NOT NULL,
	`source_uuid` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`episode_id`) REFERENCES `episodes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `episode_watches_source_uuid_unique` ON `episode_watches` (`source_uuid`);--> statement-breakpoint
CREATE INDEX `episode_watches_episode_idx` ON `episode_watches` (`episode_id`);--> statement-breakpoint
CREATE INDEX `episode_watches_watched_at_idx` ON `episode_watches` (`watched_at`);--> statement-breakpoint
CREATE TABLE `movie_watches` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`movie_id` integer NOT NULL,
	`watched_at` text NOT NULL,
	`is_rewatch` integer DEFAULT false NOT NULL,
	`source` text DEFAULT 'app' NOT NULL,
	`source_uuid` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`movie_id`) REFERENCES `movies`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `movie_watches_source_uuid_unique` ON `movie_watches` (`source_uuid`);--> statement-breakpoint
CREATE INDEX `movie_watches_movie_idx` ON `movie_watches` (`movie_id`);--> statement-breakpoint
CREATE INDEX `movie_watches_watched_at_idx` ON `movie_watches` (`watched_at`);--> statement-breakpoint
CREATE TABLE `watchlist_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`media_type` text NOT NULL,
	`movie_id` integer,
	`show_id` integer,
	`added_at` text NOT NULL,
	FOREIGN KEY (`movie_id`) REFERENCES `movies`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`show_id`) REFERENCES `shows`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "watchlist_exactly_one_target" CHECK(("watchlist_items"."movie_id" IS NOT NULL) + ("watchlist_items"."show_id" IS NOT NULL) = 1)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `watchlist_movie_unique` ON `watchlist_items` (`movie_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `watchlist_show_unique` ON `watchlist_items` (`show_id`);
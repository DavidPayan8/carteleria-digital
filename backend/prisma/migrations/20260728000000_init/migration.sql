BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[Organizations] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [Organizations_id_df] DEFAULT newid(),
    [name] NVARCHAR(200) NOT NULL,
    [slug] NVARCHAR(100) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Organizations_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Organizations_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Organizations_slug_key] UNIQUE NONCLUSTERED ([slug])
);

-- CreateTable
CREATE TABLE [dbo].[Locations] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [Locations_id_df] DEFAULT newid(),
    [organizationId] UNIQUEIDENTIFIER NOT NULL,
    [name] NVARCHAR(200) NOT NULL,
    [address] NVARCHAR(400),
    [timeZone] NVARCHAR(100) NOT NULL CONSTRAINT [Locations_timeZone_df] DEFAULT 'Europe/Madrid',
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Locations_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Locations_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Users] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [Users_id_df] DEFAULT newid(),
    [organizationId] UNIQUEIDENTIFIER,
    [email] NVARCHAR(256) NOT NULL,
    [passwordHash] NVARCHAR(256) NOT NULL,
    [fullName] NVARCHAR(200) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Users_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Users_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Users_email_key] UNIQUE NONCLUSTERED ([email])
);

-- CreateTable
CREATE TABLE [dbo].[Roles] (
    [id] TINYINT NOT NULL,
    [name] NVARCHAR(50) NOT NULL,
    CONSTRAINT [Roles_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Roles_name_key] UNIQUE NONCLUSTERED ([name])
);

-- CreateTable
CREATE TABLE [dbo].[UserRoles] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [UserRoles_id_df] DEFAULT newid(),
    [userId] UNIQUEIDENTIFIER NOT NULL,
    [roleId] TINYINT NOT NULL,
    [locationId] UNIQUEIDENTIFIER,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [UserRoles_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [UserRoles_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [UserRoles_userId_roleId_locationId_key] UNIQUE NONCLUSTERED ([userId],[roleId],[locationId])
);

-- CreateTable
CREATE TABLE [dbo].[ScreenGroups] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [ScreenGroups_id_df] DEFAULT newid(),
    [locationId] UNIQUEIDENTIFIER NOT NULL,
    [name] NVARCHAR(200) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [ScreenGroups_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [ScreenGroups_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Screens] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [Screens_id_df] DEFAULT newid(),
    [locationId] UNIQUEIDENTIFIER NOT NULL,
    [screenGroupId] UNIQUEIDENTIFIER,
    [name] NVARCHAR(200) NOT NULL,
    [orientation] TINYINT NOT NULL CONSTRAINT [Screens_orientation_df] DEFAULT 0,
    [resolutionWidth] INT,
    [resolutionHeight] INT,
    [pollingIntervalSeconds] INT NOT NULL CONSTRAINT [Screens_pollingIntervalSeconds_df] DEFAULT 20,
    [pairingCode] CHAR(6),
    [pairingCodeExpiresAt] DATETIME2,
    [authTokenHash] NVARCHAR(256),
    [pairedAt] DATETIME2,
    [lastSeenAt] DATETIME2,
    [lastSeenIp] VARCHAR(45),
    [playerVersion] NVARCHAR(50),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Screens_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Screens_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Screens_pairingCode_key] UNIQUE NONCLUSTERED ([pairingCode])
);

-- CreateTable
CREATE TABLE [dbo].[Media] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [Media_id_df] DEFAULT newid(),
    [organizationId] UNIQUEIDENTIFIER NOT NULL,
    [type] TINYINT NOT NULL,
    [fileName] NVARCHAR(300) NOT NULL,
    [mimeType] NVARCHAR(100) NOT NULL,
    [sizeBytes] BIGINT NOT NULL,
    [blobContainer] NVARCHAR(100) NOT NULL,
    [blobPath] NVARCHAR(500) NOT NULL,
    [thumbnailBlobPath] NVARCHAR(500),
    [durationSeconds] DECIMAL(10,2),
    [width] INT,
    [height] INT,
    [uploadedByUserId] UNIQUEIDENTIFIER,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Media_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [Media_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Playlists] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [Playlists_id_df] DEFAULT newid(),
    [organizationId] UNIQUEIDENTIFIER NOT NULL,
    [locationId] UNIQUEIDENTIFIER,
    [name] NVARCHAR(200) NOT NULL,
    [defaultItemDurationSeconds] INT NOT NULL CONSTRAINT [Playlists_defaultItemDurationSeconds_df] DEFAULT 10,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Playlists_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Playlists_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[PlaylistItems] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [PlaylistItems_id_df] DEFAULT newid(),
    [playlistId] UNIQUEIDENTIFIER NOT NULL,
    [mediaId] UNIQUEIDENTIFIER NOT NULL,
    [sortOrder] INT NOT NULL,
    [durationSecondsOverride] INT,
    [transitionType] NVARCHAR(30) NOT NULL CONSTRAINT [PlaylistItems_transitionType_df] DEFAULT 'fade',
    CONSTRAINT [PlaylistItems_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [PlaylistItems_playlistId_sortOrder_key] UNIQUE NONCLUSTERED ([playlistId],[sortOrder])
);

-- CreateTable
CREATE TABLE [dbo].[Schedules] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [Schedules_id_df] DEFAULT newid(),
    [playlistId] UNIQUEIDENTIFIER NOT NULL,
    [screenId] UNIQUEIDENTIFIER,
    [screenGroupId] UNIQUEIDENTIFIER,
    [locationId] UNIQUEIDENTIFIER,
    [name] NVARCHAR(200) NOT NULL,
    [priority] INT NOT NULL CONSTRAINT [Schedules_priority_df] DEFAULT 0,
    [startDate] DATE NOT NULL,
    [endDate] DATE,
    [daysOfWeek] TINYINT NOT NULL CONSTRAINT [Schedules_daysOfWeek_df] DEFAULT 127,
    [startTime] TIME NOT NULL CONSTRAINT [Schedules_startTime_df] DEFAULT '00:00:00',
    [endTime] TIME NOT NULL CONSTRAINT [Schedules_endTime_df] DEFAULT '23:59:59',
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Schedules_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Schedules_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[ScreenHeartbeats] (
    [id] BIGINT NOT NULL IDENTITY(1,1),
    [screenId] UNIQUEIDENTIFIER NOT NULL,
    [seenAt] DATETIME2 NOT NULL CONSTRAINT [ScreenHeartbeats_seenAt_df] DEFAULT CURRENT_TIMESTAMP,
    [ip] VARCHAR(45),
    [playerVersion] NVARCHAR(50),
    [activePlaylistId] UNIQUEIDENTIFIER,
    CONSTRAINT [ScreenHeartbeats_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[AuditLogs] (
    [id] BIGINT NOT NULL IDENTITY(1,1),
    [entityName] NVARCHAR(100) NOT NULL,
    [entityId] UNIQUEIDENTIFIER NOT NULL,
    [organizationId] UNIQUEIDENTIFIER,
    [performedByUserId] UNIQUEIDENTIFIER,
    [dataSnapshot] NVARCHAR(max) NOT NULL,
    [performedAt] DATETIME2 NOT NULL CONSTRAINT [AuditLogs_performedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [AuditLogs_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Locations_organizationId_idx] ON [dbo].[Locations]([organizationId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Users_organizationId_idx] ON [dbo].[Users]([organizationId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [UserRoles_userId_idx] ON [dbo].[UserRoles]([userId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ScreenGroups_locationId_idx] ON [dbo].[ScreenGroups]([locationId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Screens_locationId_idx] ON [dbo].[Screens]([locationId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Media_organizationId_idx] ON [dbo].[Media]([organizationId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Playlists_organizationId_idx] ON [dbo].[Playlists]([organizationId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Playlists_locationId_idx] ON [dbo].[Playlists]([locationId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [PlaylistItems_playlistId_idx] ON [dbo].[PlaylistItems]([playlistId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Schedules_screenId_idx] ON [dbo].[Schedules]([screenId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Schedules_screenGroupId_idx] ON [dbo].[Schedules]([screenGroupId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Schedules_locationId_idx] ON [dbo].[Schedules]([locationId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ScreenHeartbeats_screenId_seenAt_idx] ON [dbo].[ScreenHeartbeats]([screenId], [seenAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AuditLogs_entityName_entityId_idx] ON [dbo].[AuditLogs]([entityName], [entityId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AuditLogs_organizationId_idx] ON [dbo].[AuditLogs]([organizationId]);

-- AddForeignKey
ALTER TABLE [dbo].[Locations] ADD CONSTRAINT [Locations_organizationId_fkey] FOREIGN KEY ([organizationId]) REFERENCES [dbo].[Organizations]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Users] ADD CONSTRAINT [Users_organizationId_fkey] FOREIGN KEY ([organizationId]) REFERENCES [dbo].[Organizations]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[UserRoles] ADD CONSTRAINT [UserRoles_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[Users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[UserRoles] ADD CONSTRAINT [UserRoles_roleId_fkey] FOREIGN KEY ([roleId]) REFERENCES [dbo].[Roles]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[UserRoles] ADD CONSTRAINT [UserRoles_locationId_fkey] FOREIGN KEY ([locationId]) REFERENCES [dbo].[Locations]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ScreenGroups] ADD CONSTRAINT [ScreenGroups_locationId_fkey] FOREIGN KEY ([locationId]) REFERENCES [dbo].[Locations]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Screens] ADD CONSTRAINT [Screens_locationId_fkey] FOREIGN KEY ([locationId]) REFERENCES [dbo].[Locations]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Screens] ADD CONSTRAINT [Screens_screenGroupId_fkey] FOREIGN KEY ([screenGroupId]) REFERENCES [dbo].[ScreenGroups]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Media] ADD CONSTRAINT [Media_organizationId_fkey] FOREIGN KEY ([organizationId]) REFERENCES [dbo].[Organizations]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Media] ADD CONSTRAINT [Media_uploadedByUserId_fkey] FOREIGN KEY ([uploadedByUserId]) REFERENCES [dbo].[Users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Playlists] ADD CONSTRAINT [Playlists_organizationId_fkey] FOREIGN KEY ([organizationId]) REFERENCES [dbo].[Organizations]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Playlists] ADD CONSTRAINT [Playlists_locationId_fkey] FOREIGN KEY ([locationId]) REFERENCES [dbo].[Locations]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[PlaylistItems] ADD CONSTRAINT [PlaylistItems_playlistId_fkey] FOREIGN KEY ([playlistId]) REFERENCES [dbo].[Playlists]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[PlaylistItems] ADD CONSTRAINT [PlaylistItems_mediaId_fkey] FOREIGN KEY ([mediaId]) REFERENCES [dbo].[Media]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Schedules] ADD CONSTRAINT [Schedules_playlistId_fkey] FOREIGN KEY ([playlistId]) REFERENCES [dbo].[Playlists]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Schedules] ADD CONSTRAINT [Schedules_screenId_fkey] FOREIGN KEY ([screenId]) REFERENCES [dbo].[Screens]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Schedules] ADD CONSTRAINT [Schedules_screenGroupId_fkey] FOREIGN KEY ([screenGroupId]) REFERENCES [dbo].[ScreenGroups]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Schedules] ADD CONSTRAINT [Schedules_locationId_fkey] FOREIGN KEY ([locationId]) REFERENCES [dbo].[Locations]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ScreenHeartbeats] ADD CONSTRAINT [ScreenHeartbeats_screenId_fkey] FOREIGN KEY ([screenId]) REFERENCES [dbo].[Screens]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[AuditLogs] ADD CONSTRAINT [AuditLogs_performedByUserId_fkey] FOREIGN KEY ([performedByUserId]) REFERENCES [dbo].[Users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH

┌─────────────────────────────────────────────────────────┐
│  Update available 5.22.0 -> 7.9.1                       │
│                                                         │
│  This is a major update - please follow the guide at    │
│  https://pris.ly/d/major-version-upgrade                │
│                                                         │
│  Run the following to update                            │
│    npm i --save-dev prisma@latest                       │
│    npm i @prisma/client@latest                          │
└─────────────────────────────────────────────────────────┘

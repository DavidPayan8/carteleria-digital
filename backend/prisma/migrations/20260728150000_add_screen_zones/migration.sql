BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[ScreenZones] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [ScreenZones_id_df] DEFAULT newid(),
    [screenId] UNIQUEIDENTIFIER NOT NULL,
    [name] NVARCHAR(200) NOT NULL,
    [x] DECIMAL(5,2) NOT NULL,
    [y] DECIMAL(5,2) NOT NULL,
    [width] DECIMAL(5,2) NOT NULL,
    [height] DECIMAL(5,2) NOT NULL,
    [zIndex] INT NOT NULL CONSTRAINT [ScreenZones_zIndex_df] DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [ScreenZones_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [ScreenZones_pkey] PRIMARY KEY CLUSTERED ([id])
);

CREATE NONCLUSTERED INDEX [ScreenZones_screenId_idx] ON [dbo].[ScreenZones]([screenId]);

ALTER TABLE [dbo].[ScreenZones] ADD CONSTRAINT [ScreenZones_screenId_fkey]
    FOREIGN KEY ([screenId]) REFERENCES [dbo].[Screens]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AlterTable: Schedules gana un 4o destino posible (screenZoneId), nullable,
-- sin tocar ninguna otra columna ni tabla existente.
ALTER TABLE [dbo].[Schedules] ADD [screenZoneId] UNIQUEIDENTIFIER NULL;

CREATE NONCLUSTERED INDEX [Schedules_screenZoneId_idx] ON [dbo].[Schedules]([screenZoneId]);

ALTER TABLE [dbo].[Schedules] ADD CONSTRAINT [Schedules_screenZoneId_fkey]
    FOREIGN KEY ([screenZoneId]) REFERENCES [dbo].[ScreenZones]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH

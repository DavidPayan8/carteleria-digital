BEGIN TRY

BEGIN TRAN;

-- El CHECK original (CK_Schedules_OneTarget) no contemplaba el nuevo destino
-- ScreenZoneId añadido en la migración anterior; se sustituye por uno que
-- exige exactamente uno de los 4 destinos posibles.
ALTER TABLE [dbo].[Schedules] DROP CONSTRAINT [CK_Schedules_OneTarget];

ALTER TABLE [dbo].[Schedules] ADD CONSTRAINT [CK_Schedules_OneTarget] CHECK (
    (
        IIF([ScreenId] IS NOT NULL, 1, 0)
        + IIF([ScreenGroupId] IS NOT NULL, 1, 0)
        + IIF([LocationId] IS NOT NULL, 1, 0)
        + IIF([ScreenZoneId] IS NOT NULL, 1, 0)
    ) = 1
);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH

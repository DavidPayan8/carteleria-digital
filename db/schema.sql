-- ============================================================================
-- Carteleria Digital - Esquema de base de datos (SQL Server / T-SQL)
-- Multi-tenant: Organization (franquicia) -> Location (restaurante) -> Screen
-- ============================================================================

CREATE TABLE Organizations (
    Id              UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    Name            NVARCHAR(200)    NOT NULL,
    Slug            NVARCHAR(100)    NOT NULL UNIQUE,
    CreatedAt       DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt       DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME()
);

CREATE TABLE Locations (
    Id              UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    OrganizationId  UNIQUEIDENTIFIER NOT NULL REFERENCES Organizations(Id),
    Name            NVARCHAR(200)    NOT NULL,
    Address         NVARCHAR(400)    NULL,
    TimeZone        NVARCHAR(100)    NOT NULL DEFAULT 'Europe/Madrid', -- IANA tz, usado para evaluar Schedules
    CreatedAt       DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt       DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME()
);
CREATE INDEX IX_Locations_OrganizationId ON Locations(OrganizationId);

-- ----------------------------------------------------------------------------
-- Usuarios y roles (scope: global org, o restringido a una location)
-- OrganizationId es NULL únicamente para usuarios SuperAdmin (acceso global,
-- sin pertenecer a ninguna franquicia). Cualquier otro usuario pertenece a
-- una única Organization.
-- ----------------------------------------------------------------------------

CREATE TABLE Users (
    Id              UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    OrganizationId  UNIQUEIDENTIFIER NULL REFERENCES Organizations(Id),
    Email           NVARCHAR(256)    NOT NULL UNIQUE,
    PasswordHash    NVARCHAR(256)    NOT NULL,
    FullName        NVARCHAR(200)    NOT NULL,
    CreatedAt       DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt       DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME()
);
CREATE INDEX IX_Users_OrganizationId ON Users(OrganizationId);

CREATE TABLE Roles (
    Id      TINYINT       NOT NULL PRIMARY KEY,
    Name    NVARCHAR(50)  NOT NULL UNIQUE
    -- Seed: 1=SuperAdmin, 2=OrgAdmin, 3=LocationAdmin, 4=Viewer
);

CREATE TABLE UserRoles (
    Id              UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    UserId          UNIQUEIDENTIFIER NOT NULL REFERENCES Users(Id),
    RoleId          TINYINT          NOT NULL REFERENCES Roles(Id),
    LocationId      UNIQUEIDENTIFIER NULL REFERENCES Locations(Id), -- NULL = aplica a toda la organización
    CreatedAt       DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT UQ_UserRoles UNIQUE (UserId, RoleId, LocationId)
);
CREATE INDEX IX_UserRoles_UserId ON UserRoles(UserId);

-- ----------------------------------------------------------------------------
-- Pantallas
-- ----------------------------------------------------------------------------

CREATE TABLE ScreenGroups (
    Id              UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    LocationId      UNIQUEIDENTIFIER NOT NULL REFERENCES Locations(Id),
    Name            NVARCHAR(200)    NOT NULL, -- ej. "Sala", "Barra", "Terraza"
    CreatedAt       DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME()
);
CREATE INDEX IX_ScreenGroups_LocationId ON ScreenGroups(LocationId);

CREATE TABLE Screens (
    Id                      UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    LocationId              UNIQUEIDENTIFIER NOT NULL REFERENCES Locations(Id),
    ScreenGroupId           UNIQUEIDENTIFIER NULL REFERENCES ScreenGroups(Id),
    Name                    NVARCHAR(200)    NOT NULL,
    Orientation             TINYINT          NOT NULL DEFAULT 0, -- 0=landscape, 1=portrait
    ResolutionWidth         INT              NULL,
    ResolutionHeight        INT              NULL,
    PollingIntervalSeconds  INT              NOT NULL DEFAULT 20,

    -- Emparejamiento tipo Chromecast: se genera un código corto, el dispositivo lo
    -- introduce y el backend emite un AuthToken de larga duración para el player.
    PairingCode             CHAR(6)          NULL,
    PairingCodeExpiresAt    DATETIME2        NULL,
    AuthTokenHash           NVARCHAR(256)    NULL, -- hash del token que usa el player para autenticar el polling
    PairedAt                DATETIME2        NULL,

    -- Estado / monitorización (fase 5, pero columnas simples desde ya)
    LastSeenAt              DATETIME2        NULL,
    LastSeenIp              VARCHAR(45)      NULL,
    PlayerVersion           NVARCHAR(50)     NULL,

    CreatedAt               DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt               DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME()
);
CREATE INDEX IX_Screens_LocationId ON Screens(LocationId);
CREATE UNIQUE INDEX UX_Screens_PairingCode ON Screens(PairingCode) WHERE PairingCode IS NOT NULL;

-- ----------------------------------------------------------------------------
-- Media (fotos / videos en Azure Blob Storage)
-- ----------------------------------------------------------------------------

CREATE TABLE Media (
    Id                  UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    OrganizationId      UNIQUEIDENTIFIER NOT NULL REFERENCES Organizations(Id),
    Type                TINYINT          NOT NULL, -- 0=image, 1=video
    FileName            NVARCHAR(300)    NOT NULL,
    MimeType            NVARCHAR(100)    NOT NULL,
    SizeBytes           BIGINT           NOT NULL,
    BlobContainer       NVARCHAR(100)    NOT NULL,
    BlobPath            NVARCHAR(500)    NOT NULL, -- ruta dentro del contenedor, se firma con SAS al servir
    ThumbnailBlobPath    NVARCHAR(500)    NULL,
    DurationSeconds     DECIMAL(10,2)    NULL, -- solo video
    Width               INT              NULL,
    Height              INT              NULL,
    UploadedByUserId    UNIQUEIDENTIFIER NULL REFERENCES Users(Id),
    CreatedAt           DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME()
);
CREATE INDEX IX_Media_OrganizationId ON Media(OrganizationId);

-- ----------------------------------------------------------------------------
-- Playlists
-- ----------------------------------------------------------------------------

CREATE TABLE Playlists (
    Id                          UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    OrganizationId              UNIQUEIDENTIFIER NOT NULL REFERENCES Organizations(Id),
    LocationId                  UNIQUEIDENTIFIER NULL REFERENCES Locations(Id), -- NULL = plantilla reutilizable a nivel org
    Name                        NVARCHAR(200)    NOT NULL,
    DefaultItemDurationSeconds  INT              NOT NULL DEFAULT 10, -- usado si un item de imagen no tiene override
    CreatedAt                   DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt                   DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME()
);
CREATE INDEX IX_Playlists_OrganizationId ON Playlists(OrganizationId);
CREATE INDEX IX_Playlists_LocationId ON Playlists(LocationId);

CREATE TABLE PlaylistItems (
    Id                          UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    PlaylistId                  UNIQUEIDENTIFIER NOT NULL REFERENCES Playlists(Id) ON DELETE CASCADE,
    MediaId                     UNIQUEIDENTIFIER NOT NULL REFERENCES Media(Id),
    SortOrder                   INT              NOT NULL,
    DurationSecondsOverride     INT              NULL, -- para imágenes; el video usa su propia duración
    TransitionType              NVARCHAR(30)     NOT NULL DEFAULT 'fade',
    CONSTRAINT UQ_PlaylistItems_Order UNIQUE (PlaylistId, SortOrder)
);
CREATE INDEX IX_PlaylistItems_PlaylistId ON PlaylistItems(PlaylistId);

-- ----------------------------------------------------------------------------
-- Programación (Schedules)
-- Se aplica a UNA de: ScreenId, ScreenGroupId o LocationId (todas las pantallas).
-- Cuando varios Schedules solapan en el tiempo, gana el de mayor Priority.
-- ----------------------------------------------------------------------------

CREATE TABLE Schedules (
    Id              UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    PlaylistId      UNIQUEIDENTIFIER NOT NULL REFERENCES Playlists(Id),

    ScreenId        UNIQUEIDENTIFIER NULL REFERENCES Screens(Id),
    ScreenGroupId   UNIQUEIDENTIFIER NULL REFERENCES ScreenGroups(Id),
    LocationId      UNIQUEIDENTIFIER NULL REFERENCES Locations(Id),

    Name            NVARCHAR(200)    NOT NULL,
    Priority        INT              NOT NULL DEFAULT 0, -- mayor número = mayor prioridad
    StartDate       DATE             NOT NULL,
    EndDate         DATE             NULL, -- NULL = indefinido
    DaysOfWeek      TINYINT          NOT NULL DEFAULT 127, -- bitmask: 1=Lun,2=Mar,4=Mie,8=Jue,16=Vie,32=Sab,64=Dom
    StartTime       TIME             NOT NULL DEFAULT '00:00:00',
    EndTime         TIME             NOT NULL DEFAULT '23:59:59',

    CreatedAt       DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt       DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),

    CONSTRAINT CK_Schedules_OneTarget CHECK (
        (IIF(ScreenId IS NOT NULL,1,0) + IIF(ScreenGroupId IS NOT NULL,1,0) + IIF(LocationId IS NOT NULL,1,0)) = 1
    )
);
CREATE INDEX IX_Schedules_ScreenId ON Schedules(ScreenId);
CREATE INDEX IX_Schedules_ScreenGroupId ON Schedules(ScreenGroupId);
CREATE INDEX IX_Schedules_LocationId ON Schedules(LocationId);

-- ----------------------------------------------------------------------------
-- Historial de estado de pantallas (fase 5 - monitorización)
-- ----------------------------------------------------------------------------

CREATE TABLE ScreenHeartbeats (
    Id              BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    ScreenId        UNIQUEIDENTIFIER     NOT NULL REFERENCES Screens(Id),
    SeenAt          DATETIME2            NOT NULL DEFAULT SYSUTCDATETIME(),
    Ip              VARCHAR(45)          NULL,
    PlayerVersion   NVARCHAR(50)         NULL,
    ActivePlaylistId UNIQUEIDENTIFIER    NULL REFERENCES Playlists(Id)
);
CREATE INDEX IX_ScreenHeartbeats_ScreenId_SeenAt ON ScreenHeartbeats(ScreenId, SeenAt DESC);

-- ----------------------------------------------------------------------------
-- Auditoría de borrados
-- El borrado es físico (DELETE real) en todas las tablas de negocio; antes de
-- borrar, el backend inserta aquí una copia del registro para dejar rastro de
-- quién borró qué y cuándo. Se rellena desde el ORM (transacción: snapshot +
-- delete), no mediante triggers.
-- ----------------------------------------------------------------------------

CREATE TABLE AuditLogs (
    Id                  BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    EntityName          NVARCHAR(100)    NOT NULL, -- ej. 'Screen', 'Media', 'Playlist'
    EntityId            UNIQUEIDENTIFIER NOT NULL,
    OrganizationId      UNIQUEIDENTIFIER NULL,      -- para poder filtrar auditoría por franquicia
    PerformedByUserId   UNIQUEIDENTIFIER NULL REFERENCES Users(Id),
    DataSnapshot        NVARCHAR(MAX)    NOT NULL,  -- JSON del registro completo justo antes de borrarlo
    PerformedAt         DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME()
);
CREATE INDEX IX_AuditLogs_EntityName_EntityId ON AuditLogs(EntityName, EntityId);
CREATE INDEX IX_AuditLogs_OrganizationId ON AuditLogs(OrganizationId);

-- ----------------------------------------------------------------------------
-- Datos semilla
-- ----------------------------------------------------------------------------

INSERT INTO Roles (Id, Name) VALUES
    (1, 'SuperAdmin'),
    (2, 'OrgAdmin'),
    (3, 'LocationAdmin'),
    (4, 'Viewer');

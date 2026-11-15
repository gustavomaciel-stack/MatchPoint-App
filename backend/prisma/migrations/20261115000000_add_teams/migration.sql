CREATE TABLE "Team" (
    "id" TEXT PRIMARY KEY,
    "name" TEXT NOT NULL,
    "sport" TEXT NOT NULL,
    "memberCount" INTEGER NOT NULL,
    "ownerId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "Team_ownerId_sport_name_key" ON "Team"("ownerId", "sport", "name");

CREATE TABLE "TeamMatch" (
    "id" TEXT PRIMARY KEY,
    "hostId" TEXT NOT NULL REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "opponentId" TEXT REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "location" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "playersPerSide" INTEGER NOT NULL,
    "outdoor" BOOLEAN NOT NULL DEFAULT false,
    "cancelled" BOOLEAN NOT NULL DEFAULT false
);

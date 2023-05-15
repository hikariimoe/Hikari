-- CreateTable
CREATE TABLE "Memory" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "data" JSONB NOT NULL,

    CONSTRAINT "Memory_pkey" PRIMARY KEY ("id")
);

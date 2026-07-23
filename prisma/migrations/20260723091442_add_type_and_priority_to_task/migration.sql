-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "priority" TEXT NOT NULL DEFAULT 'mid',
ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'task';

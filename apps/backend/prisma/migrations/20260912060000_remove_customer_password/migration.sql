-- Move customer login credentials to the User account.
ALTER TABLE "users" ADD COLUMN "encrypted_password" TEXT;

UPDATE "users" AS u
SET "password" = c."password",
    "encrypted_password" = c."login_password_encrypted"
FROM "customers" AS c
WHERE u."customer_id" = c."id"
  AND c."password" IS NOT NULL;

ALTER TABLE "customers" DROP COLUMN "password";
ALTER TABLE "customers" DROP COLUMN "login_password_encrypted";

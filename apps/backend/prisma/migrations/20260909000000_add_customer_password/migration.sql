-- Customer authentication stores bcrypt hashes; existing customers remain unset.
ALTER TABLE "customers" ADD COLUMN "password" VARCHAR(255);

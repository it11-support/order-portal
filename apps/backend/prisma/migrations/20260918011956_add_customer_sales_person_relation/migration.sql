-- Create sales_persons table
CREATE TABLE "sales_persons" (
    "id" BIGSERIAL NOT NULL,
    "slp_code" SMALLINT NOT NULL,
    "slp_name" VARCHAR(155),
    "memo" VARCHAR(50),
    "commission" DECIMAL(19,6),
    "group_code" SMALLINT,
    "locked" CHAR(1),
    "data_source" CHAR(1),
    "user_sign" SMALLINT,
    "emp_id" INTEGER,
    "active" CHAR(1),
    "created_at" TIMESTAMP(0),
    "updated_at" TIMESTAMP(0),

    CONSTRAINT "sales_persons_pkey" PRIMARY KEY ("id")
);

-- slp_code must be unique because it is referenced by users.slp_code
CREATE UNIQUE INDEX "sales_persons_slp_code_key"
ON "sales_persons"("slp_code");

-- Link users to sales_persons
ALTER TABLE "users"
ADD CONSTRAINT "users_slp_code_fkey"
FOREIGN KEY ("slp_code")
REFERENCES "sales_persons"("slp_code")
ON DELETE SET NULL
ON UPDATE CASCADE;
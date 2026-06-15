-- CreateTable
CREATE TABLE "roles" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role_id" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "customer_id" BIGINT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" BIGSERIAL NOT NULL,
    "card_code" VARCHAR(15),
    "card_name" VARCHAR(100),
    "group_name" VARCHAR(20),
    "cntct_prsn" VARCHAR(90),
    "phone1" VARCHAR(20),
    "cellular" VARCHAR(50),
    "slp_code" SMALLINT,
    "sales_name" VARCHAR(155),
    "address" VARCHAR(100),
    "block" VARCHAR(100),
    "city" VARCHAR(100),
    "zip_code" VARCHAR(20),
    "country" VARCHAR(3),
    "payment_term" VARCHAR(100),
    "price_list" VARCHAR(32),
    "join_date" TIMESTAMP(0),
    "industry_c" INTEGER,
    "non_active" CHAR(1),
    "created_at" TIMESTAMP(0),
    "updated_at" TIMESTAMP(0),

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subgroups" (
    "ind_code" INTEGER NOT NULL,
    "ind_name" VARCHAR(255) NOT NULL,
    "ind_desc" VARCHAR(255) NOT NULL,

    CONSTRAINT "subgroups_pkey" PRIMARY KEY ("ind_code")
);

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_customer_id_key" ON "users"("customer_id");

-- CreateIndex
CREATE INDEX "users_username_idx" ON "users"("username");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_id_idx" ON "users"("role_id");

-- CreateIndex
CREATE UNIQUE INDEX "customers_cardcode_unique" ON "customers"("card_code");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_industry_c_fkey" FOREIGN KEY ("industry_c") REFERENCES "subgroups"("ind_code") ON DELETE SET NULL ON UPDATE CASCADE;

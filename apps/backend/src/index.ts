import cors from "cors";
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { OrderStatus, Product, LoginRequest, LoginResponse, Role } from "@repo/shared";
import { findUserByEmail } from "@/auth/user.repository";
import { prisma } from "@/utils/prisma";

const app = express();
const port = Number(process.env.PORT ?? 3001);
const JWT_SECRET = process.env.JWT_SECRET ?? "your-secret-key-change-in-production";

app.use(cors());
app.use(express.json());

const products: Product[] = [
  {
    id: "p1",
    name: "Fresh Full Cream Milk",
    category: "dairy",
    unit: "liter",
    minOrder: 10,
    step: 5,
    price: 18000,
  },
];

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/products", (_req, res) => {
  res.json({ data: products });
});

app.post("/api/orders", (req, res) => {
  const status: OrderStatus = "pending";

  res.status(201).json({
    data: {
      id: `ORD-${Date.now()}`,
      status,
      receivedAt: new Date().toISOString(),
    },
  });
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body as LoginRequest;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password required" });
  }

  const user = await findUserByEmail(email);
  if (!user) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const validPassword = await bcrypt.compare(password, user.passwordHash);
  if (!validPassword) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const token = jwt.sign(
    { userId: user.id, role: user.role.name },
    JWT_SECRET,
    { expiresIn: "7d" }
  );

  const response: LoginResponse = {
    user: {
      id: user.id.toString(),
      email: user.email,
      name: user.name,
      company: user.company ?? "",
      cardCode: user.cardCode ?? "",
      role: user.role.name as Role,
      isActive: user.isActive,
    },
    token,
  };

  res.json(response);
});

app.listen(port, () => {
  console.log(`Backend running on http://localhost:${port}`);
});

process.on("beforeExit", async () => {
  await prisma.$disconnect();
});
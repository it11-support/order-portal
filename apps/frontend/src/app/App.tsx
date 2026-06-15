import { useState, useMemo, useRef } from "react";
import type {
  AppUser,
  CartItem,
  Order,
  OrderStatus,
  Product,
  Role,
  View,
} from "@repo/shared";
import {
  Search,
  ShoppingCart,
  ClipboardList,
  LogOut,
  Plus,
  Minus,
  CheckCircle,
  Clock,
  XCircle,
  ArrowLeft,
  Home,
  Truck,
  Package,
  AlertCircle,
  X,
  User,
} from "lucide-react";

// ─── Data ─────────────────────────────────────────────────────────────────────

const MOCK_USERS: (AppUser & { password: string })[] = [
  {
    id: "u1",
    email: "mD6l3@example.com",
    isActive: true,
    name: "Budi Santoso",
    company: "Hotel Grand Nusantara",
    role: "customer",
    password: "user123",
  },
  {
    id: "u2",
    name: "Siti Rahma",
    isActive: true,
    email: "T8oNl@example.com",
    company: "Restoran Nusantara",
    role: "customer",
    password: "user123",
  },
  {
    id: "u3",
    email: "B2SbP@example.com",
    isActive: true,
    name: "Dedi Kurniawan",
    company: "Café Mentari",
    role: "customer",
    password: "user123",
  },
  {
    id: "a1",
    email: "Hv2l0@example.com",
    isActive: true,
    name: "Admin Procurement",
    company: "FreshSupply Co.",
    role: "admin",
    password: "admin123",
  },
];

const CATEGORIES = [
  { id: "dairy", name: "Dairy & Eggs", emoji: "🥛" },
  { id: "meat", name: "Meat & Poultry", emoji: "🥩" },
  { id: "seafood", name: "Seafood", emoji: "🦐" },
  { id: "produce", name: "Fresh Produce", emoji: "🥦" },
  { id: "dry", name: "Dry Goods", emoji: "🌾" },
  { id: "beverages", name: "Beverages", emoji: "🧃" },
  { id: "cleaning", name: "Cleaning", emoji: "🧹" },
  { id: "kitchen", name: "Kitchen Supplies", emoji: "🍳" },
];

const PRODUCTS: Product[] = [
  {
    id: "p1",
    name: "Fresh Full Cream Milk",
    category: "dairy",
    unit: "liter",
    minOrder: 10,
    step: 5,
  },
  {
    id: "p2",
    name: "Butter Unsalted",
    category: "dairy",
    unit: "kg",
    minOrder: 2,
    step: 1,
  },
  {
    id: "p3",
    name: "Cheddar Cheese Block",
    category: "dairy",
    unit: "kg",
    minOrder: 2,
    step: 1,
  },
  {
    id: "p4",
    name: "Heavy Cream 35%",
    category: "dairy",
    unit: "liter",
    minOrder: 5,
    step: 1,
  },
  {
    id: "p5",
    name: "Greek Yogurt Plain",
    category: "dairy",
    unit: "kg",
    minOrder: 5,
    step: 1,
  },
  {
    id: "p6",
    name: "Fresh Eggs Grade A",
    category: "dairy",
    unit: "tray (30 pcs)",
    minOrder: 5,
    step: 1,
  },
  {
    id: "p7",
    name: "Mozzarella Fresh",
    category: "dairy",
    unit: "kg",
    minOrder: 2,
    step: 1,
  },
  {
    id: "p8",
    name: "Chicken Breast Boneless",
    category: "meat",
    unit: "kg",
    minOrder: 5,
    step: 1,
  },
  {
    id: "p9",
    name: "Ground Beef 80/20",
    category: "meat",
    unit: "kg",
    minOrder: 5,
    step: 1,
  },
  {
    id: "p10",
    name: "Beef Tenderloin",
    category: "meat",
    unit: "kg",
    minOrder: 3,
    step: 1,
  },
  {
    id: "p11",
    name: "Pork Belly Slab",
    category: "meat",
    unit: "kg",
    minOrder: 3,
    step: 1,
  },
  {
    id: "p12",
    name: "Whole Chicken Cleaned",
    category: "meat",
    unit: "kg",
    minOrder: 10,
    step: 2,
  },
  {
    id: "p13",
    name: "Lamb Shoulder Bone-In",
    category: "meat",
    unit: "kg",
    minOrder: 5,
    step: 1,
  },
  {
    id: "p14",
    name: "Tiger Prawns 16/20",
    category: "seafood",
    unit: "kg",
    minOrder: 5,
    step: 1,
  },
  {
    id: "p15",
    name: "Salmon Fillet Skin-On",
    category: "seafood",
    unit: "kg",
    minOrder: 5,
    step: 1,
  },
  {
    id: "p16",
    name: "Squid Cleaned",
    category: "seafood",
    unit: "kg",
    minOrder: 5,
    step: 1,
  },
  {
    id: "p17",
    name: "Sea Bass Whole",
    category: "seafood",
    unit: "kg",
    minOrder: 5,
    step: 1,
  },
  {
    id: "p18",
    name: "Blue Crab Fresh",
    category: "seafood",
    unit: "kg",
    minOrder: 3,
    step: 1,
  },
  {
    id: "p19",
    name: "Romaine Lettuce",
    category: "produce",
    unit: "box (12 heads)",
    minOrder: 1,
    step: 1,
  },
  {
    id: "p20",
    name: "Cherry Tomatoes Mixed",
    category: "produce",
    unit: "kg",
    minOrder: 3,
    step: 1,
  },
  {
    id: "p21",
    name: "Broccoli Crown",
    category: "produce",
    unit: "kg",
    minOrder: 5,
    step: 1,
  },
  {
    id: "p22",
    name: "Red Bell Pepper",
    category: "produce",
    unit: "kg",
    minOrder: 3,
    step: 1,
  },
  {
    id: "p23",
    name: "Garlic Fresh",
    category: "produce",
    unit: "kg",
    minOrder: 2,
    step: 1,
  },
  {
    id: "p24",
    name: "Shiitake Mushroom",
    category: "produce",
    unit: "kg",
    minOrder: 2,
    step: 1,
  },
  {
    id: "p25",
    name: "Arborio Rice",
    category: "dry",
    unit: "sack (25 kg)",
    minOrder: 1,
    step: 1,
  },
  {
    id: "p26",
    name: "Pasta Penne Rigate",
    category: "dry",
    unit: "box (5 kg)",
    minOrder: 2,
    step: 1,
  },
  {
    id: "p27",
    name: "All-Purpose Flour",
    category: "dry",
    unit: "sack (25 kg)",
    minOrder: 1,
    step: 1,
  },
  {
    id: "p28",
    name: "Extra Virgin Olive Oil",
    category: "dry",
    unit: "tin (5 L)",
    minOrder: 2,
    step: 1,
  },
  {
    id: "p29",
    name: "Soy Sauce Premium",
    category: "dry",
    unit: "bottle (5 L)",
    minOrder: 3,
    step: 1,
  },
  {
    id: "p30",
    name: "Mineral Water 600ml",
    category: "beverages",
    unit: "carton (24 btl)",
    minOrder: 5,
    step: 1,
  },
  {
    id: "p31",
    name: "Orange Juice Fresh",
    category: "beverages",
    unit: "liter",
    minOrder: 10,
    step: 5,
  },
  {
    id: "p32",
    name: "Espresso Coffee Beans",
    category: "beverages",
    unit: "kg",
    minOrder: 2,
    step: 1,
  },
  {
    id: "p33",
    name: "Coconut Milk UHT",
    category: "beverages",
    unit: "carton (12×1L)",
    minOrder: 2,
    step: 1,
  },
  {
    id: "p34",
    name: "Dish Soap Commercial",
    category: "cleaning",
    unit: "gallon (4 L)",
    minOrder: 4,
    step: 1,
  },
  {
    id: "p35",
    name: "Floor Cleaner Concentrate",
    category: "cleaning",
    unit: "gallon (4 L)",
    minOrder: 4,
    step: 1,
  },
  {
    id: "p36",
    name: "Hand Sanitizer 5L",
    category: "cleaning",
    unit: "gallon (5 L)",
    minOrder: 2,
    step: 1,
  },
  {
    id: "p37",
    name: "Disposable Gloves M",
    category: "kitchen",
    unit: "box (100 pcs)",
    minOrder: 5,
    step: 1,
  },
  {
    id: "p38",
    name: "Plastic Wrap Roll",
    category: "kitchen",
    unit: "roll (45cm×300m)",
    minOrder: 3,
    step: 1,
  },
  {
    id: "p39",
    name: "Aluminum Foil Heavy",
    category: "kitchen",
    unit: "roll (45cm×100m)",
    minOrder: 3,
    step: 1,
  },
];

const SAMPLE_ORDERS: Order[] = [
  {
    id: "ORD-2026-0001",
    userId: "u1",
    userName: "Budi Santoso",
    company: "Hotel Grand Nusantara",
    items: [
      { product: PRODUCTS[0], qty: 50 },
      { product: PRODUCTS[5], qty: 10 },
      { product: PRODUCTS[7], qty: 20 },
    ],
    status: "confirmed",
    createdAt: new Date("2026-06-12T08:30:00"),
    notes: "Delivery sebelum jam 8 pagi",
  },
  {
    id: "ORD-2026-0002",
    userId: "u2",
    userName: "Siti Rahma",
    company: "Restoran Nusantara",
    items: [
      { product: PRODUCTS[13], qty: 15 },
      { product: PRODUCTS[15], qty: 10 },
    ],
    status: "pending",
    createdAt: new Date("2026-06-13T09:15:00"),
    notes: "",
  },
  {
    id: "ORD-2026-0003",
    userId: "u1",
    userName: "Budi Santoso",
    company: "Hotel Grand Nusantara",
    items: [
      { product: PRODUCTS[31], qty: 10 },
      { product: PRODUCTS[32], qty: 5 },
      { product: PRODUCTS[1], qty: 8 },
    ],
    status: "delivered",
    createdAt: new Date("2026-06-10T11:00:00"),
    notes: "Sertakan invoice",
  },
  {
    id: "ORD-2026-0004",
    userId: "u3",
    userName: "Dedi Kurniawan",
    company: "Café Mentari",
    items: [
      { product: PRODUCTS[32], qty: 10 },
      { product: PRODUCTS[29], qty: 5 },
    ],
    status: "processing",
    createdAt: new Date("2026-06-13T14:00:00"),
    notes: "",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(value: Date | string) {
  const d = typeof value === "string" ? new Date(value) : value;
  return (
    d.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }) +
    " · " +
    d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
  );
}

const STATUS_CFG: Record<
  OrderStatus,
  { label: string; bg: string; text: string }
> = {
  pending: { label: "Pending", bg: "bg-amber-100", text: "text-amber-700" },
  confirmed: { label: "Confirmed", bg: "bg-blue-100", text: "text-blue-700" },
  processing: {
    label: "Processing",
    bg: "bg-purple-100",
    text: "text-purple-700",
  },
  delivered: { label: "Delivered", bg: "bg-green-100", text: "text-green-700" },
  cancelled: { label: "Cancelled", bg: "bg-red-100", text: "text-red-700" },
};

function getCatEmoji(catId: string) {
  return CATEGORIES.find((c) => c.id === catId)?.emoji ?? "📦";
}

// ─── Micro-components ─────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: OrderStatus }) {
  const s = STATUS_CFG[status];
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap ${s.bg} ${s.text}`}
    >
      {s.label}
    </span>
  );
}

function QtyControl({
  product,
  qty,
  onIncrease,
  onDecrease,
}: {
  product: Product;
  qty: number;
  onIncrease: () => void;
  onDecrease: () => void;
}) {
  if (qty === 0) {
    return (
      <button
        onClick={onIncrease}
        className="flex items-center gap-1 bg-accent text-accent-foreground text-xs font-bold px-3 py-1.5 rounded-lg active:scale-95 transition-transform"
      >
        <Plus size={13} /> Tambah
      </button>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onDecrease}
        className="w-7 h-7 flex items-center justify-center bg-secondary rounded-full active:scale-95 transition-transform hover:bg-border"
      >
        <Minus size={13} />
      </button>
      <span className="text-sm font-bold w-8 text-center tabular-nums">
        {qty}
      </span>
      <button
        onClick={onIncrease}
        className="w-7 h-7 flex items-center justify-center bg-accent text-accent-foreground rounded-full active:scale-95 transition-transform hover:bg-accent/80"
      >
        <Plus size={13} />
      </button>
    </div>
  );
}

// Product row — used inside divide-y containers (mobile) and standalone cards (desktop)
function ProductRow({
  product,
  qty,
  onIncrease,
  onDecrease,
}: {
  product: Product;
  qty: number;
  onIncrease: () => void;
  onDecrease: () => void;
}) {
  return (
    <div
      className={`flex items-center gap-3 py-3 transition-colors ${qty > 0 ? "bg-accent/5 -mx-4 px-4" : ""}`}
    >
      <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-xl shrink-0">
        {getCatEmoji(product.category)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground leading-tight">
          {product.name}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {product.unit} · min. {product.minOrder}
        </p>
      </div>
      <QtyControl
        product={product}
        qty={qty}
        onIncrease={onIncrease}
        onDecrease={onDecrease}
      />
    </div>
  );
}

// Product list — single column on mobile, 2-col grid on desktop
function ProductList({
  products,
  getQty,
  increase,
  decrease,
}: {
  products: Product[];
  getQty: (id: string) => number;
  increase: (p: Product) => void;
  decrease: (p: Product) => void;
}) {
  return (
    <>
      {/* Mobile: list with dividers */}
      <div className="md:hidden bg-white rounded-2xl border border-border divide-y divide-border px-4">
        {products.map((p) => (
          <ProductRow
            key={p.id}
            product={p}
            qty={getQty(p.id)}
            onIncrease={() => increase(p)}
            onDecrease={() => decrease(p)}
          />
        ))}
      </div>
      {/* Desktop: 2-column grid of cards */}
      <div className="hidden md:grid md:grid-cols-2 xl:grid-cols-3 gap-3">
        {products.map((p) => (
          <div
            key={p.id}
            className="bg-white rounded-2xl border border-border px-4 hover:border-accent/40 transition-colors"
          >
            <ProductRow
              product={p}
              qty={getQty(p.id)}
              onIncrease={() => increase(p)}
              onDecrease={() => decrease(p)}
            />
          </div>
        ))}
      </div>
    </>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [view, setView] = useState<View>("login");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>(SAMPLE_ORDERS);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [orderNotes, setOrderNotes] = useState("");
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [loginError, setLoginError] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");
  const [orderPlaced, setOrderPlaced] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Cart
  const cartCount = cart.reduce((s, i) => s + i.qty, 0);
  function getQty(pid: string) {
    return cart.find((i) => i.product.id === pid)?.qty ?? 0;
  }
  function setQty(product: Product, qty: number) {
    if (qty <= 0) setCart((c) => c.filter((i) => i.product.id !== product.id));
    else
      setCart((c) => {
        const ex = c.find((i) => i.product.id === product.id);
        if (ex)
          return c.map((i) =>
            i.product.id === product.id ? { ...i, qty } : i,
          );
        return [...c, { product, qty }];
      });
  }
  function increase(product: Product) {
    const q = getQty(product.id);
    setQty(product, q === 0 ? product.minOrder : q + product.step);
  }
  function decrease(product: Product) {
    const q = getQty(product.id);
    if (q <= product.minOrder) setQty(product, 0);
    else setQty(product, q - product.step);
  }

  // Auth
  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    const found = MOCK_USERS.find(
      (u) =>
        (u.id === loginForm.username ||
          u.name.toLowerCase().startsWith(loginForm.username.toLowerCase())) &&
        u.password === loginForm.password,
    );
    if (found) {
      const { password: _pw, ...user } = found;
      setCurrentUser(user);
      setView(user.role === "admin" ? "admin-orders" : "catalog");
      setLoginError("");
    } else {
      setLoginError("Username atau password tidak valid.");
    }
  }

  function handleLogout() {
    setCurrentUser(null);
    setView("login");
    setCart([]);
    setLoginForm({ username: "", password: "" });
    setLoginError("");
  }

  // Orders
  function placeOrder() {
    if (!currentUser || cart.length === 0) return;
    const order: Order = {
      id: `ORD-2026-${String(orders.length + 1).padStart(4, "0")}`,
      userId: currentUser.id,
      userName: currentUser.name,
      company: currentUser.company,
      items: [...cart],
      status: "pending",
      createdAt: new Date(),
      notes: orderNotes,
    };
    setOrders((o) => [order, ...o]);
    setCart([]);
    setOrderNotes("");
    setOrderPlaced(true);
    setTimeout(() => {
      setOrderPlaced(false);
      setView("orders");
    }, 1800);
  }

  function updateStatus(orderId: string, status: OrderStatus) {
    setOrders((o) =>
      o.map((ord) => (ord.id === orderId ? { ...ord, status } : ord)),
    );
  }

  // Derived
  const selectedCategory = CATEGORIES.find((c) => c.id === selectedCategoryId);
  const categoryProducts = PRODUCTS.filter(
    (p) => p.category === selectedCategoryId,
  );
  const searchResults = useMemo(() => {
    if (!activeSearch.trim()) return [];
    const q = activeSearch.toLowerCase();
    return PRODUCTS.filter(
      (p) =>
        p.name.toLowerCase().includes(q) || p.unit.toLowerCase().includes(q),
    );
  }, [activeSearch]);
  const userOrders = useMemo(
    () => orders.filter((o) => o.userId === currentUser?.id),
    [orders, currentUser],
  );
  const filteredAdminOrders = useMemo(
    () =>
      statusFilter === "all"
        ? orders
        : orders.filter((o) => o.status === statusFilter),
    [orders, statusFilter],
  );
  const selectedOrder = orders.find((o) => o.id === selectedOrderId);
  const pendingCount = orders.filter((o) => o.status === "pending").length;

  // Nav
  function goBack() {
    if (view === "category" || view === "search" || view === "cart")
      setView("catalog");
    else if (view === "order-detail") setView("orders");
    else if (view === "admin-order-detail") setView("admin-orders");
    else setView("catalog");
  }
  function goSearch() {
    setView("search");
    setTimeout(() => searchInputRef.current?.focus(), 80);
  }

  // ─── Inner shared layout components ──────────────────────────────────────────

  // Sidebar — desktop only
  const Sidebar = () => {
    const isAdmin = currentUser?.role === "admin";
    const customerNav = [
      {
        id: "catalog" as View,
        label: "Home",
        icon: <Home size={18} />,
        action: () => setView("catalog"),
      },
      {
        id: "search" as View,
        label: "Cari",
        icon: <Search size={18} />,
        action: goSearch,
      },
      {
        id: "cart" as View,
        label: "Keranjang",
        icon: <ShoppingCart size={18} />,
        action: () => setView("cart"),
        badge: cartCount,
      },
      {
        id: "orders" as View,
        label: "My Orders",
        icon: <ClipboardList size={18} />,
        action: () => setView("orders"),
      },
    ];
    const adminNav = [
      {
        id: "admin-orders" as View,
        label: "Semua Order",
        icon: <ClipboardList size={18} />,
        action: () => setView("admin-orders"),
        badge: pendingCount,
      },
    ];
    const navItems = isAdmin ? adminNav : customerNav;
    const activeView = view;

    return (
      <aside className="hidden lg:flex lg:fixed lg:inset-y-0 lg:z-30 lg:w-64 flex-col bg-white border-r border-border">
        {/* Brand */}
        <div className="flex items-center gap-3 px-6 h-16 border-b border-border shrink-0">
          <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center shrink-0">
            <Package size={17} className="text-white" />
          </div>
          <div>
            <p className="font-bold text-[15px] text-foreground">TSM</p>
            <p className="text-[10px] text-muted-foreground font-medium">
              Order Portal
            </p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const active =
              activeView === item.id ||
              (item.id === "catalog" && activeView === "category");
            const badge = typeof item.badge === "number" ? item.badge : 0;
            return (
              <button
                key={item.id}
                onClick={item.action}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                  active
                    ? "bg-accent text-white"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                {item.icon}
                <span className="flex-1 text-left">{item.label}</span>
                {badge > 0 && (
                  <span
                    className={`w-5 h-5 text-[10px] font-bold rounded-full flex items-center justify-center ${
                      active ? "bg-white/25 text-white" : "bg-accent text-white"
                    }`}
                  >
                    {badge > 9 ? "9+" : badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* User */}
        <div className="px-3 pb-4 shrink-0 border-t border-border pt-3">
          <div className="flex items-center gap-3 px-3 py-2 mb-1">
            <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center shrink-0">
              <User size={14} className="text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">
                {currentUser?.name}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {currentUser?.company}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            <LogOut size={15} />
            Keluar
          </button>
        </div>
      </aside>
    );
  };

  // Bottom nav — mobile only
  const BottomNav = () => (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-20 bg-white border-t border-border">
      <div className="flex">
        {[
          {
            id: "catalog" as View,
            label: "Home",
            icon: <Home size={20} />,
            action: () => setView("catalog"),
          },
          {
            id: "search" as View,
            label: "Cari",
            icon: <Search size={20} />,
            action: goSearch,
          },
          {
            id: "cart" as View,
            label: "Keranjang",
            icon: <ShoppingCart size={20} />,
            action: () => setView("cart"),
            badge: cartCount,
          },
          {
            id: "orders" as View,
            label: "Order",
            icon: <ClipboardList size={20} />,
            action: () => setView("orders"),
          },
        ].map((tab) => {
          const active =
            view === tab.id || (tab.id === "catalog" && view === "category");
          const badge = typeof tab.badge === "number" ? tab.badge : 0;
          return (
            <button
              key={tab.id}
              onClick={tab.action}
              className={`flex-1 flex flex-col items-center py-2.5 gap-0.5 transition-colors ${
                active ? "text-accent" : "text-muted-foreground"
              }`}
            >
              <span className="relative">
                {tab.icon}
                {badge > 0 && (
                  <span className="absolute -top-1 -right-1.5 w-4 h-4 bg-accent text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {badge > 9 ? "9+" : badge}
                  </span>
                )}
              </span>
              <span className="text-[10px] font-semibold">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );

  // Top header — mobile prominent, desktop minimal
  const AppHeader = ({
    title,
    showBack = false,
  }: {
    title: string;
    showBack?: boolean;
  }) => (
    <header className="sticky top-0 z-20 bg-white border-b border-border flex items-center gap-3 px-4 h-14 lg:h-14">
      {showBack && (
        <button
          onClick={goBack}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-secondary transition-colors shrink-0"
        >
          <ArrowLeft size={18} />
        </button>
      )}
      {!showBack && (
        <div className="lg:hidden w-9 h-9 flex items-center justify-center rounded-xl bg-primary shrink-0">
          <Package size={17} className="text-white" />
        </div>
      )}
      <h1 className="flex-1 text-[15px] font-bold text-foreground truncate">
        {title}
      </h1>
      {/* Cart icon — mobile only, in sidebar on desktop */}
      {currentUser?.role === "customer" && !showBack && (
        <button
          onClick={() => setView("cart")}
          className="lg:hidden relative w-9 h-9 flex items-center justify-center rounded-full hover:bg-secondary transition-colors"
        >
          <ShoppingCart size={19} />
          {cartCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-accent text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {cartCount > 99 ? "99+" : cartCount}
            </span>
          )}
        </button>
      )}
      {/* Logout — mobile only, in sidebar on desktop */}
      <button
        onClick={handleLogout}
        className="lg:hidden w-9 h-9 flex items-center justify-center rounded-full hover:bg-secondary transition-colors text-muted-foreground"
      >
        <LogOut size={17} />
      </button>
    </header>
  );

  // Layout shell wrapper for all authenticated views
  const Shell = ({
    children,
    title,
    showBack = false,
    actionBar,
  }: {
    children: React.ReactNode;
    title: string;
    showBack?: boolean;
    actionBar?: React.ReactNode;
  }) => (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="lg:pl-64 flex flex-col min-h-screen">
        <AppHeader title={title} showBack={showBack} />
        <main
          className={`flex-1 overflow-y-auto ${actionBar ? "pb-32 lg:pb-24" : "pb-20 lg:pb-8"}`}
        >
          <div className="max-w-5xl mx-auto px-4 py-4 lg:py-6 lg:px-8">
            {children}
          </div>
        </main>
        {actionBar && (
          <div className="fixed bottom-16 lg:bottom-0 left-0 lg:left-64 right-0 z-10 bg-white border-t border-border px-4 py-3">
            {actionBar}
          </div>
        )}
        {currentUser?.role === "customer" && <BottomNav />}
      </div>
    </div>
  );

  // ─── LOGIN ───────────────────────────────────────────────────────────────────

  if (view === "login") {
    return (
      <div className="min-h-screen bg-primary flex flex-col lg:flex-row">
        {/* Left panel — branding (desktop only) */}
        <div className="hidden lg:flex lg:flex-1 flex-col items-center justify-center p-16 relative overflow-hidden">
          <div className="relative z-10 text-center">
            <div className="w-20 h-20 bg-accent rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl">
              <Package size={40} className="text-white" />
            </div>
            <h1 className="text-4xl font-bold text-white mb-3">TSM</h1>
            <p className="text-white/50 text-lg font-medium">Order Portal</p>
          </div>
        </div>

        {/* Right panel — form */}
        <div className="flex-1 lg:max-w-md flex flex-col items-center justify-center p-6 lg:p-12 lg:bg-white lg:shadow-2xl">
          {/* Mobile header */}
          <div className="text-center mb-8 lg:mb-10">
            <div className="w-16 h-16 bg-accent rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg lg:hidden">
              <Package size={30} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white lg:text-foreground">
              TSM
            </h1>
            <p className="text-white/50 lg:text-muted-foreground text-[11px] mt-1 font-semibold uppercase tracking-wider">
              Order Portal
            </p>
          </div>

          <form
            onSubmit={handleLogin}
            className="w-full bg-white rounded-2xl p-6 shadow-2xl lg:shadow-none lg:p-0 space-y-4"
          >
            <div>
              <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                Username
              </label>
              <input
                type="text"
                value={loginForm.username}
                onChange={(e) =>
                  setLoginForm((f) => ({ ...f, username: e.target.value }))
                }
                placeholder="Masukkan username"
                className="w-full bg-input-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={loginForm.password}
                onChange={(e) =>
                  setLoginForm((f) => ({ ...f, password: e.target.value }))
                }
                placeholder="••••••••"
                className="w-full bg-input-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            {loginError && (
              <p className="text-xs text-destructive font-semibold">
                {loginError}
              </p>
            )}
            <button
              type="submit"
              className="w-full bg-accent text-white font-bold py-3.5 rounded-xl hover:bg-accent/90 active:scale-[0.98] transition-all text-sm"
            >
              Masuk
            </button>

            {/* Demo creds */}
            <div className="pt-2 border-t border-border space-y-2">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Demo Akun
              </p>
              <div className="flex gap-2 flex-wrap">
                {[
                  { label: "Customer", user: "u1", pass: "user123" },
                  { label: "Admin", user: "a1", pass: "admin123" },
                ].map((d) => (
                  <button
                    key={d.user}
                    type="button"
                    onClick={() =>
                      setLoginForm({ username: d.user, password: d.pass })
                    }
                    className="text-xs bg-secondary hover:bg-border text-foreground px-3 py-1.5 rounded-lg transition-colors font-medium"
                  >
                    {d.label}: {d.user}
                  </button>
                ))}
              </div>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // ─── CATALOG ─────────────────────────────────────────────────────────────────

  if (view === "catalog") {
    return (
      <Shell title="TSM Order Portal">
        <div className="space-y-6">
          {/* Greeting banner */}
          <div className="bg-primary text-white rounded-2xl p-5 lg:p-7 relative overflow-hidden">
            <div className="absolute right-6 top-1/2 -translate-y-1/2 text-7xl opacity-10 select-none pointer-events-none">
              🏨
            </div>
            <p className="text-white/60 text-xs font-semibold uppercase tracking-wider">
              Selamat datang
            </p>
            <p className="font-bold text-xl lg:text-2xl mt-0.5">
              {currentUser?.name}
            </p>
            <p className="text-white/60 text-sm mt-1">{currentUser?.company}</p>
          </div>

          {/* Search bar */}
          <button
            onClick={goSearch}
            className="w-full flex items-center gap-3 bg-white border border-border rounded-xl px-4 py-3 text-muted-foreground text-sm hover:border-accent/40 transition-colors text-left"
          >
            <Search size={15} className="shrink-0" />
            <span>Cari produk...</span>
          </button>

          {/* Categories */}
          <section>
            <h2 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-3">
              Kategori
            </h2>
            <div className="grid grid-cols-4 sm:grid-cols-4 lg:grid-cols-8 gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => {
                    setSelectedCategoryId(cat.id);
                    setView("category");
                  }}
                  className="flex flex-col items-center gap-1.5 bg-white border border-border rounded-xl py-3 px-1 hover:border-accent hover:bg-accent/5 active:scale-95 transition-all"
                >
                  <span className="text-2xl">{cat.emoji}</span>
                  <span className="text-[10px] font-semibold text-center text-foreground leading-tight">
                    {cat.name}
                  </span>
                </button>
              ))}
            </div>
          </section>

          {/* Popular products */}
          <section>
            <h2 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-3">
              Produk Populer
            </h2>
            <ProductList
              products={PRODUCTS.slice(0, 12)}
              getQty={getQty}
              increase={increase}
              decrease={decrease}
            />
          </section>
        </div>
      </Shell>
    );
  }

  // ─── CATEGORY ────────────────────────────────────────────────────────────────

  if (view === "category") {
    return (
      <Shell
        title={`${selectedCategory?.emoji ?? ""} ${selectedCategory?.name ?? "Kategori"}`}
        showBack
      >
        <ProductList
          products={categoryProducts}
          getQty={getQty}
          increase={increase}
          decrease={decrease}
        />
      </Shell>
    );
  }

  // ─── SEARCH ──────────────────────────────────────────────────────────────────

  if (view === "search") {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar />
        <div className="lg:pl-64 flex flex-col min-h-screen">
          {/* Custom search header */}
          <header className="sticky top-0 z-20 bg-white border-b border-border flex items-center gap-2 px-4 h-14">
            <button
              onClick={goBack}
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-secondary transition-colors shrink-0"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="flex-1 flex items-center bg-input-background border border-border rounded-xl px-3 gap-2">
              <Search size={14} className="text-muted-foreground shrink-0" />
              <input
                ref={searchInputRef}
                autoFocus
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") setActiveSearch(searchQuery);
                }}
                placeholder="Cari produk..."
                className="flex-1 bg-transparent py-2.5 text-sm focus:outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setActiveSearch("");
                  }}
                >
                  <X size={14} className="text-muted-foreground" />
                </button>
              )}
            </div>
            <button
              onClick={() => setActiveSearch(searchQuery)}
              className="text-accent text-sm font-bold px-1"
            >
              Cari
            </button>
          </header>

          <main className="flex-1 overflow-y-auto pb-20 lg:pb-8">
            <div className="max-w-5xl mx-auto px-4 py-4 lg:py-6 lg:px-8">
              {!activeSearch ? (
                <div className="text-center py-20 text-muted-foreground">
                  <Search size={44} className="mx-auto mb-3 opacity-20" />
                  <p className="text-sm">Ketik nama produk untuk mencari</p>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="text-center py-20 text-muted-foreground">
                  <Package size={44} className="mx-auto mb-3 opacity-20" />
                  <p className="text-sm font-semibold">
                    Produk tidak ditemukan
                  </p>
                  <p className="text-xs mt-1">Coba kata kunci lain</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-xs text-muted-foreground font-semibold">
                    {searchResults.length} produk ditemukan
                  </p>
                  <ProductList
                    products={searchResults}
                    getQty={getQty}
                    increase={increase}
                    decrease={decrease}
                  />
                </div>
              )}
            </div>
          </main>
          <BottomNav />
        </div>
      </div>
    );
  }

  // ─── CART ────────────────────────────────────────────────────────────────────

  if (view === "cart") {
    const cartActionBar =
      cart.length > 0 ? (
        orderPlaced ? (
          <div className="flex items-center justify-center gap-2 bg-green-500 text-white py-3.5 rounded-xl font-bold text-sm">
            <CheckCircle size={17} /> Order berhasil dikirim!
          </div>
        ) : (
          <button
            onClick={placeOrder}
            className="w-full bg-accent text-white py-3.5 rounded-xl font-bold text-sm hover:bg-accent/90 active:scale-[0.98] transition-all"
          >
            Kirim Order — {cart.length} produk ({cartCount} qty)
          </button>
        )
      ) : undefined;

    return (
      <Shell title="Keranjang" showBack actionBar={cartActionBar}>
        {cart.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <ShoppingCart size={52} className="mx-auto mb-4 opacity-20" />
            <p className="font-semibold text-foreground">Keranjang kosong</p>
            <p className="text-sm mt-1">Tambahkan produk dari katalog</p>
            <button
              onClick={() => setView("catalog")}
              className="mt-5 bg-accent text-white px-6 py-2.5 rounded-xl text-sm font-bold active:scale-95 transition-transform"
            >
              Ke Katalog
            </button>
          </div>
        ) : (
          <div className="space-y-4 max-w-2xl">
            {/* Items */}
            <div className="bg-white rounded-2xl border border-border divide-y divide-border px-4">
              {cart.map((item) => (
                <div
                  key={item.product.id}
                  className="flex items-center gap-3 py-3"
                >
                  <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-xl shrink-0">
                    {getCatEmoji(item.product.category)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold leading-tight">
                      {item.product.name}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {item.product.unit}
                    </p>
                  </div>
                  <QtyControl
                    product={item.product}
                    qty={item.qty}
                    onIncrease={() => increase(item.product)}
                    onDecrease={() => decrease(item.product)}
                  />
                </div>
              ))}
            </div>
            {/* Notes */}
            <div className="bg-white rounded-2xl border border-border p-4">
              <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
                Catatan Pengiriman
              </label>
              <textarea
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                placeholder="Contoh: Delivery sebelum jam 8 pagi, sertakan invoice..."
                rows={3}
                className="w-full bg-input-background border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent resize-none"
              />
            </div>
            {/* Summary */}
            <div className="bg-white rounded-2xl border border-border p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  Total jenis produk
                </span>
                <span className="font-bold">{cart.length} item</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total qty</span>
                <span className="font-bold">{cartCount} unit</span>
              </div>
            </div>
          </div>
        )}
      </Shell>
    );
  }

  // ─── USER ORDERS ─────────────────────────────────────────────────────────────

  if (view === "orders") {
    return (
      <Shell title="Riwayat Order">
        {userOrders.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <ClipboardList size={48} className="mx-auto mb-4 opacity-20" />
            <p className="font-semibold text-foreground">Belum ada order</p>
            <p className="text-sm mt-1">Order Anda akan muncul di sini</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
            {userOrders.map((order) => (
              <button
                key={order.id}
                onClick={() => {
                  setSelectedOrderId(order.id);
                  setView("order-detail");
                }}
                className="bg-white rounded-2xl border border-border p-4 text-left hover:border-accent/50 active:scale-[0.99] transition-all"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono font-bold">
                    {order.id}
                  </span>
                  <StatusBadge status={order.status} />
                </div>
                <p className="text-xs text-muted-foreground mb-2">
                  {fmtDate(order.createdAt)}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {order.items.slice(0, 2).map((i) => (
                    <span
                      key={i.product.id}
                      className="text-xs bg-secondary text-foreground px-2 py-0.5 rounded-full"
                    >
                      {i.product.name} ×{i.qty}
                    </span>
                  ))}
                  {order.items.length > 2 && (
                    <span className="text-xs text-muted-foreground self-center">
                      +{order.items.length - 2} lainnya
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </Shell>
    );
  }

  // ─── USER ORDER DETAIL ───────────────────────────────────────────────────────

  if (view === "order-detail" && selectedOrder) {
    return (
      <Shell title={selectedOrder.id} showBack>
        <div className="max-w-2xl space-y-4">
          <div className="bg-white rounded-2xl border border-border p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Status
                </p>
                <div className="mt-1.5">
                  <StatusBadge status={selectedOrder.status} />
                </div>
              </div>
              <div className="text-right">
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Tanggal
                </p>
                <p className="text-xs font-semibold mt-1">
                  {fmtDate(selectedOrder.createdAt)}
                </p>
              </div>
            </div>
            {selectedOrder.notes && (
              <div className="pt-3 border-t border-border">
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                  Catatan
                </p>
                <p className="text-sm">{selectedOrder.notes}</p>
              </div>
            )}
          </div>
          <div className="bg-white rounded-2xl border border-border divide-y divide-border px-4">
            {selectedOrder.items.map((item) => (
              <div
                key={item.product.id}
                className="flex items-center gap-3 py-3"
              >
                <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-xl shrink-0">
                  {getCatEmoji(item.product.category)}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold">{item.product.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.product.unit}
                  </p>
                </div>
                <span className="text-sm font-bold tabular-nums">
                  ×{item.qty}
                </span>
              </div>
            ))}
          </div>
        </div>
      </Shell>
    );
  }

  // ─── ADMIN ORDERS ────────────────────────────────────────────────────────────

  if (view === "admin-orders") {
    const allStatuses: (OrderStatus | "all")[] = [
      "all",
      "pending",
      "confirmed",
      "processing",
      "delivered",
      "cancelled",
    ];
    return (
      <Shell title="Admin — Semua Order">
        <div className="space-y-4">
          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {(
              [
                "pending",
                "confirmed",
                "processing",
                "delivered",
                "cancelled",
              ] as OrderStatus[]
            ).map((s) => {
              const count = orders.filter((o) => o.status === s).length;
              const cfg = STATUS_CFG[s];
              return (
                <button
                  key={s}
                  onClick={() =>
                    setStatusFilter(s === statusFilter ? "all" : s)
                  }
                  className={`bg-white rounded-xl border p-3 text-left transition-all ${
                    statusFilter === s
                      ? "border-accent shadow-sm shadow-accent/10"
                      : "border-border hover:border-accent/40"
                  }`}
                >
                  <p className={`text-xs font-semibold ${cfg.text}`}>
                    {cfg.label}
                  </p>
                  <p className="text-2xl font-bold text-foreground mt-0.5">
                    {count}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Filter tabs */}
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
            {allStatuses.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                  statusFilter === s
                    ? "bg-accent text-white border-accent"
                    : "bg-white text-muted-foreground border-border hover:border-accent/40"
                }`}
              >
                {s === "all" ? "Semua" : STATUS_CFG[s].label}
                {s === "pending" && pendingCount > 0 && (
                  <span className="ml-1.5 bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                    {pendingCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Orders grid */}
          {filteredAdminOrders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ClipboardList size={40} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm">Tidak ada order</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
              {filteredAdminOrders.map((order) => (
                <button
                  key={order.id}
                  onClick={() => {
                    setSelectedOrderId(order.id);
                    setView("admin-order-detail");
                  }}
                  className="bg-white rounded-2xl border border-border p-4 text-left hover:border-accent/50 active:scale-[0.99] transition-all"
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div>
                      <p className="text-xs font-mono font-bold">{order.id}</p>
                      <p className="text-sm font-bold mt-0.5">
                        {order.company}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {order.userName}
                      </p>
                    </div>
                    <StatusBadge status={order.status} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {fmtDate(order.createdAt)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {order.items.length} produk ·{" "}
                    {order.items.reduce((s, i) => s + i.qty, 0)} qty
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      </Shell>
    );
  }

  // ─── ADMIN ORDER DETAIL ──────────────────────────────────────────────────────

  if (view === "admin-order-detail" && selectedOrder) {
    const nextMap: Record<OrderStatus, OrderStatus[]> = {
      pending: ["confirmed", "cancelled"],
      confirmed: ["processing", "cancelled"],
      processing: ["delivered", "cancelled"],
      delivered: [],
      cancelled: [],
    };
    const nextStatuses = nextMap[selectedOrder.status];

    const actionBar =
      nextStatuses.length > 0 ? (
        <div className="flex gap-3">
          {nextStatuses.map((s) => (
            <button
              key={s}
              onClick={() => {
                updateStatus(selectedOrder.id, s);
                setView("admin-orders");
              }}
              className={`flex-1 py-3 rounded-xl text-sm font-bold transition-colors active:scale-[0.98] ${
                s === "cancelled"
                  ? "bg-red-50 text-red-600 border border-red-200 hover:bg-red-100"
                  : "bg-accent text-white hover:bg-accent/90"
              }`}
            >
              {STATUS_CFG[s].label}
            </button>
          ))}
        </div>
      ) : undefined;

    return (
      <Shell title={selectedOrder.id} showBack actionBar={actionBar}>
        <div className="max-w-2xl space-y-4">
          {/* Customer info */}
          <div className="bg-white rounded-2xl border border-border p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Pelanggan
                </p>
                <p className="font-bold text-sm mt-1">
                  {selectedOrder.userName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {selectedOrder.company}
                </p>
              </div>
              <StatusBadge status={selectedOrder.status} />
            </div>
            <div className="pt-3 border-t border-border">
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Tanggal Order
              </p>
              <p className="text-sm font-medium mt-1">
                {fmtDate(selectedOrder.createdAt)}
              </p>
            </div>
            {selectedOrder.notes && (
              <div className="pt-3 border-t border-border">
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Catatan
                </p>
                <p className="text-sm mt-1">{selectedOrder.notes}</p>
              </div>
            )}
          </div>

          {/* Items */}
          <div>
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
              Item Order
            </p>
            <div className="bg-white rounded-2xl border border-border divide-y divide-border px-4">
              {selectedOrder.items.map((item) => (
                <div
                  key={item.product.id}
                  className="flex items-center gap-3 py-3"
                >
                  <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-xl shrink-0">
                    {getCatEmoji(item.product.category)}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{item.product.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.product.unit}
                    </p>
                  </div>
                  <span className="text-sm font-bold tabular-nums">
                    ×{item.qty}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* SAP note */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3">
            <AlertCircle size={15} className="text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 leading-relaxed">
              Order ini akan diinput ke <strong>SAP</strong> setelah
              dikonfirmasi. Pastikan data sudah benar sebelum mengubah status.
            </p>
          </div>
        </div>
      </Shell>
    );
  }

  return null;
}

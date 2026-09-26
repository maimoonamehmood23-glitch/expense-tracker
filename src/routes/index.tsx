import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  AlignLeft,
  CarFront,
  ChevronDown,
  CircleDollarSign,
  FileText,
  HeartPulse,
  Home,
  LayoutGrid,
  Menu,
  Pencil,
  Plus,
  ReceiptText,
  ShoppingBag,
  Trash2,
  Utensils,
  Wallet,
  X,
} from "lucide-react";
import walletImg from "@/assets/wallet.png";
import plantImg from "@/assets/plant.png";

/* ---------- data model ---------- */

const CATEGORIES = {
  Food: Utensils,
  Transport: CarFront,
  Shopping: ShoppingBag,
  Bills: ReceiptText,
  Health: HeartPulse,
} as const;

type Category = keyof typeof CATEGORIES;
const CATEGORY_NAMES = Object.keys(CATEGORIES) as Category[];

// static class maps so Tailwind can see them at build time
const CAT_TINT: Record<Category, string> = {
  Food: "bg-food/12 text-food",
  Transport: "bg-transport/12 text-transport",
  Shopping: "bg-shopping/15 text-shopping",
  Bills: "bg-bills/12 text-bills",
  Health: "bg-health/12 text-health",
};

const CAT_BADGE: Record<Category, string> = {
  Food: "bg-food/15 text-food",
  Transport: "bg-transport/15 text-transport",
  Shopping: "bg-shopping/20 text-shopping",
  Bills: "bg-bills/15 text-bills",
  Health: "bg-health/15 text-health",
};

type Expense = {
  id: string;
  title: string;
  amount: number;
  category: Category;
  date: string; // ISO date
};

const STORAGE_KEY = "expense-tracker.expenses";

function loadExpenses(): Expense[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Expense[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e) =>
        typeof e.id === "string" &&
        typeof e.title === "string" &&
        typeof e.amount === "number" &&
        CATEGORY_NAMES.includes(e.category) &&
        typeof e.date === "string"
    );
  } catch {
    return [];
  }
}

function formatAmount(n: number): string {
  return `$${n.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/* ---------- head ---------- */

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Expense Tracker — Track Your Spending" },
      {
        name: "description",
        content:
          "A clean, modern personal expense tracker. Add, edit and delete expenses, filter by category, and see your total spending update instantly. Saves right in your browser.",
      },
      { property: "og:title", content: "Expense Tracker — Track Your Spending" },
      {
        property: "og:description",
        content:
          "Add, edit and delete expenses, filter by category, and watch your total update instantly.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

/* ---------- page ---------- */

function Index() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [filter, setFilter] = useState<"All" | Category>("All");
  const [sort, setSort] = useState<"newest" | "oldest" | "highest">("newest");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [navActive, setNavActive] = useState<"home" | "expenses" | "categories">("home");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // form state
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<Category | "">("");
  const [errors, setErrors] = useState<{ title?: string; amount?: string; category?: string }>({});

  // load once from localStorage (browser only)
  useEffect(() => {
    setExpenses(loadExpenses());
    setHydrated(true);
  }, []);

  // persist on every change after hydration
  useEffect(() => {
    if (hydrated) localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
  }, [expenses, hydrated]);

  const total = useMemo(() => expenses.reduce((sum, e) => sum + e.amount, 0), [expenses]);

  const visible = useMemo(() => {
    const list = expenses.filter((e) => filter === "All" || e.category === filter);
    return [...list].sort((a, b) => {
      if (sort === "highest") return b.amount - a.amount;
      if (sort === "oldest") return a.date < b.date ? -1 : a.date > b.date ? 1 : 0;
      return a.date > b.date ? -1 : a.date < b.date ? 1 : 0;
    });
  }, [expenses, filter, sort]);

  const countFor = (c: "All" | Category) =>
    c === "All" ? expenses.length : expenses.filter((e) => e.category === c).length;

  function startEdit(e: Expense) {
    setEditingId(e.id);
    setTitle(e.title);
    setAmount(String(e.amount));
    setCategory(e.category);
    setErrors({});
    document.getElementById("add-expense")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function cancelEdit() {
    setEditingId(null);
    setTitle("");
    setAmount("");
    setCategory("");
    setErrors({});
  }

  function handleSubmit(ev: FormEvent) {
    ev.preventDefault();
    const next: typeof errors = {};
    if (!title.trim()) next.title = "Please enter a title.";
    const parsedAmount = Number(amount);
    if (amount.trim() === "" || Number.isNaN(parsedAmount)) {
      next.amount = "Please enter a valid amount.";
    } else if (parsedAmount <= 0) {
      next.amount = "Amount must be greater than zero.";
    }
    if (!category) next.category = "Please pick a category.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    if (editingId) {
      setExpenses((prev) =>
        prev.map((e) =>
          e.id === editingId
            ? { ...e, title: title.trim(), amount: parsedAmount, category: category as Category }
            : e
        )
      );
      cancelEdit();
    } else {
      setExpenses((prev) => [
        {
          id: crypto.randomUUID(),
          title: title.trim(),
          amount: parsedAmount,
          category: category as Category,
          date: today(),
        },
        ...prev,
      ]);
      setTitle("");
      setAmount("");
      setCategory("");
    }
  }

  function handleDelete(id: string) {
    if (editingId === id) cancelEdit();
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  }

  const scrollTo = (id: string, nav: "home" | "expenses" | "categories") => {
    setNavActive(nav);
    setSidebarOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* mobile top bar */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border/70 bg-card/90 px-4 py-3 backdrop-blur lg:hidden">
        <div className="flex items-center gap-2.5">
          <BrandMark className="h-8 w-8" />
          <span className="text-base font-bold tracking-tight">Expense Tracker</span>
        </div>
        <button
          type="button"
          aria-label={sidebarOpen ? "Close menu" : "Open menu"}
          onClick={() => setSidebarOpen((v) => !v)}
          className="rounded-xl border border-border bg-card p-2 text-foreground transition-colors hover:bg-accent"
        >
          {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>

      {/* mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-foreground/30 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <div className="mx-auto flex w-full max-w-[1440px]">
        <Sidebar open={sidebarOpen} active={navActive} onNavigate={scrollTo} onClose={() => setSidebarOpen(false)} />

        <main className="min-w-0 flex-1 px-4 pb-16 pt-6 sm:px-6 lg:px-10 lg:pt-8">
          {/* Total Expenses card */}
          <section
            id="home"
            className="hero-gradient shadow-card relative scroll-mt-24 overflow-hidden rounded-3xl border border-border/60"
          >
            <div className="flex flex-wrap items-center gap-6 p-6 sm:p-8">
              <div className="flex items-center gap-5">
                <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-card shadow-card sm:h-20 sm:w-20">
                  <CoinsIcon className="h-9 w-9 sm:h-11 sm:w-11" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-muted-foreground sm:text-base">
                    Total Expenses
                  </p>
                  <p
                    className="mt-1 text-4xl font-extrabold tracking-tight sm:text-5xl"
                    aria-live="polite"
                  >
                    $ {total.toLocaleString("en-US", { maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
              <div className="pointer-events-none ml-auto hidden items-end gap-3 md:flex">
                <span className="font-hand -rotate-6 pb-2 text-xl leading-tight text-primary/80">
                  Better money habits,
                  <br />
                  brighter future ♡
                </span>
                <img
                  src={walletImg}
                  alt=""
                  aria-hidden="true"
                  loading="lazy"
                  width={140}
                  height={140}
                  className="h-28 w-28 object-contain xl:h-36 xl:w-36"
                />
              </div>
            </div>
          </section>

          {/* Add / Edit form */}
          <section
            id="add-expense"
            className="shadow-card mt-6 scroll-mt-24 rounded-3xl border border-border/60 bg-card p-6 sm:p-8"
          >
            <div className="flex items-center gap-3">
              <span
                className={`flex h-10 w-10 items-center justify-center rounded-full text-white ${
                  editingId ? "bg-primary" : "bg-success"
                }`}
              >
                {editingId ? <Pencil className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
              </span>
              <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
                {editingId ? "Edit Expense" : "Add New Expense"}
              </h2>
            </div>

            <form onSubmit={handleSubmit} noValidate className="mt-6">
              <div className="grid gap-5 md:grid-cols-[1fr_1fr_1fr_auto] md:items-start md:gap-6">
                <Field label="Title" error={errors.title} htmlFor="expense-title">
                  <div className="relative">
                    <FileText className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      id="expense-title"
                      type="text"
                      value={title}
                      maxLength={80}
                      onChange={(ev) => setTitle(ev.target.value)}
                      placeholder="e.g. Groceries"
                      aria-invalid={!!errors.title}
                      className={`h-12 w-full rounded-2xl border bg-card pl-11 pr-4 text-sm font-medium outline-none transition-all placeholder:font-normal placeholder:text-muted-foreground/70 focus:border-primary focus:ring-4 focus:ring-primary/15 ${
                        errors.title ? "border-destructive" : "border-input"
                      }`}
                    />
                  </div>
                </Field>

                <Field label="Amount" error={errors.amount} htmlFor="expense-amount">
                  <div className="relative">
                    <CircleDollarSign className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      id="expense-amount"
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      min="0"
                      value={amount}
                      onChange={(ev) => setAmount(ev.target.value)}
                      placeholder="e.g. 500"
                      aria-invalid={!!errors.amount}
                      className={`h-12 w-full rounded-2xl border bg-card pl-11 pr-4 text-sm font-medium outline-none transition-all placeholder:font-normal placeholder:text-muted-foreground/70 focus:border-primary focus:ring-4 focus:ring-primary/15 ${
                        errors.amount ? "border-destructive" : "border-input"
                      }`}
                    />
                  </div>
                </Field>

                <Field label="Category" error={errors.category} htmlFor="expense-category">
                  <div className="relative">
                    {category ? (
                      (() => {
                        const Icon = CATEGORIES[category];
                        return (
                          <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/70" />
                        );
                      })()
                    ) : (
                      <Utensils className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    )}
                    <select
                      id="expense-category"
                      value={category}
                      onChange={(ev) => setCategory(ev.target.value as Category | "")}
                      aria-invalid={!!errors.category}
                      className={`h-12 w-full appearance-none rounded-2xl border bg-card pl-11 pr-10 text-sm font-medium outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/15 ${
                        errors.category ? "border-destructive" : "border-input"
                      } ${category ? "text-foreground" : "text-muted-foreground"}`}
                    >
                      <option value="" disabled>
                        Select category
                      </option>
                      {CATEGORY_NAMES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  </div>
                </Field>

                <div className="flex items-center gap-3 md:pt-[30px]">
                  <button
                    type="submit"
                    className={`inline-flex h-12 items-center justify-center gap-2 whitespace-nowrap rounded-2xl px-6 text-sm font-bold text-white shadow-card transition-all hover:-translate-y-0.5 hover:shadow-lift active:translate-y-0 ${
                      editingId ? "bg-primary hover:bg-primary/90" : "bg-success hover:bg-success/90"
                    }`}
                  >
                    {editingId ? (
                      <>
                        <Pencil className="h-4 w-4" /> Update Expense
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4" /> Add Expense
                      </>
                    )}
                  </button>
                  {editingId && (
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="inline-flex h-12 items-center justify-center rounded-2xl border border-input bg-card px-5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </form>
          </section>

          {/* Category filter chips */}
          <section id="categories" className="mt-6 scroll-mt-24">
            <div className="flex flex-wrap items-center gap-2.5">
              {(["All", ...CATEGORY_NAMES] as const).map((c) => {
                const active = filter === c;
                const Icon = c === "All" ? LayoutGrid : CATEGORIES[c];
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setFilter(c)}
                    aria-pressed={active}
                    className={`inline-flex h-11 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-all ${
                      active
                        ? "border-primary bg-primary text-primary-foreground shadow-card"
                        : "border-border bg-card text-foreground/80 hover:bg-accent hover:text-foreground"
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${!active && c !== "All" ? CAT_TINT[c].split(" ")[1] : ""}`} />
                    {c}
                    <span
                      className={`rounded-full px-1.5 text-xs font-bold ${
                        active ? "bg-primary-foreground/20" : "bg-muted"
                      }`}
                    >
                      {countFor(c)}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Expenses list */}
          <section
            id="expenses"
            className="shadow-card mt-6 scroll-mt-24 rounded-3xl border border-border/60 bg-card p-6 sm:p-8"
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
                {filter === "All" ? "Recent Expenses" : `${filter} Expenses`}
              </h2>
              <div className="relative">
                <Filter className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <select
                  value={sort}
                  onChange={(ev) => setSort(ev.target.value as typeof sort)}
                  aria-label="Sort expenses"
                  className="h-10 appearance-none rounded-xl border border-input bg-card pl-10 pr-9 text-sm font-semibold outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/15"
                >
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                  <option value="highest">Highest amount</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              </div>
            </div>

            {expenses.length === 0 ? (
              <EmptyState
                title="No expenses yet"
                text="Your list is empty. Add your very first expense above and start building better money habits today!"
              />
            ) : visible.length === 0 ? (
              <EmptyState
                title={`Nothing in ${filter}`}
                text="You have no expenses in this category yet. Pick another filter or add a new one."
              />
            ) : (
              <>
                {/* desktop table */}
                <div className="mt-5 hidden overflow-x-auto md:block">
                  <table className="w-full border-separate border-spacing-0 text-sm">
                    <thead>
                      <tr className="text-left text-muted-foreground">
                        <th className="border-b border-border pb-3 pr-4 font-semibold">#</th>
                        <th className="border-b border-border pb-3 pr-4 font-semibold">Title</th>
                        <th className="border-b border-border pb-3 pr-4 font-semibold">Amount</th>
                        <th className="border-b border-border pb-3 pr-4 font-semibold">Category</th>
                        <th className="border-b border-border pb-3 pr-4 font-semibold">Date</th>
                        <th className="border-b border-border pb-3 text-right font-semibold">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {visible.map((e, i) => {
                        const Icon = CATEGORIES[e.category];
                        return (
                          <tr key={e.id} className="transition-colors hover:bg-accent/40">
                            <td className="border-b border-border/60 py-4 pr-4 text-muted-foreground">
                              {i + 1}
                            </td>
                            <td className="border-b border-border/60 py-4 pr-4">
                              <span className="flex items-center gap-3">
                                <span
                                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${CAT_TINT[e.category]}`}
                                >
                                  <Icon className="h-4 w-4" />
                                </span>
                                <span className="font-semibold">{e.title}</span>
                              </span>
                            </td>
                            <td className="border-b border-border/60 py-4 pr-4 font-bold">
                              {formatAmount(e.amount)}
                            </td>
                            <td className="border-b border-border/60 py-4 pr-4">
                              <CategoryBadge category={e.category} />
                            </td>
                            <td className="border-b border-border/60 py-4 pr-4 text-muted-foreground">
                              {formatDate(e.date)}
                            </td>
                            <td className="border-b border-border/60 py-4 text-right">
                              <span className="inline-flex justify-end gap-2">
                                <IconAction
                                  label={`Edit ${e.title}`}
                                  onClick={() => startEdit(e)}
                                  tone="primary"
                                >
                                  <Pencil className="h-4 w-4" />
                                </IconAction>
                                <IconAction
                                  label={`Delete ${e.title}`}
                                  onClick={() => handleDelete(e.id)}
                                  tone="danger"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </IconAction>
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* mobile cards */}
                <ul className="mt-5 space-y-3 md:hidden">
                  {visible.map((e, i) => {
                    const Icon = CATEGORIES[e.category];
                    return (
                      <li
                        key={e.id}
                        className="rounded-2xl border border-border/70 bg-card p-4 shadow-card"
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${CAT_TINT[e.category]}`}
                          >
                            <Icon className="h-5 w-5" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-semibold">
                              <span className="mr-2 text-xs font-medium text-muted-foreground">
                                {i + 1}.
                              </span>
                              {e.title}
                            </p>
                            <p className="mt-0.5 text-xs text-muted-foreground">{formatDate(e.date)}</p>
                          </div>
                          <p className="font-bold">{formatAmount(e.amount)}</p>
                        </div>
                        <div className="mt-3 flex items-center justify-between">
                          <CategoryBadge category={e.category} />
                          <span className="flex gap-2">
                            <IconAction label={`Edit ${e.title}`} onClick={() => startEdit(e)} tone="primary">
                              <Pencil className="h-4 w-4" />
                            </IconAction>
                            <IconAction
                              label={`Delete ${e.title}`}
                              onClick={() => handleDelete(e.id)}
                              tone="danger"
                            >
                              <Trash2 className="h-4 w-4" />
                            </IconAction>
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}

/* ---------- pieces ---------- */

function BrandMark({ className }: { className?: string }) {
  // clearly visible custom SVG mark: a wallet in a rounded indigo tile
  return (
    <svg viewBox="0 0 48 48" className={className} role="img" aria-label="Expense Tracker logo">
      <rect width="48" height="48" rx="14" fill="oklch(0.53 0.19 285)" />
      <path
        d="M13 17.5c0-1.9 1.6-3.5 3.5-3.5h14c1.4 0 2.5 1.1 2.5 2.5v2h-14a1.5 1.5 0 0 0 0 3h15.5c1.4 0 2.5 1.1 2.5 2.5v8c0 1.9-1.6 3.5-3.5 3.5h-17c-1.9 0-3.5-1.6-3.5-3.5v-14.5Z"
        fill="oklch(0.99 0.005 300)"
      />
      <circle cx="31.5" cy="28" r="2.2" fill="oklch(0.62 0.17 152)" />
    </svg>
  );
}

function CoinsIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} role="img" aria-label="Coins">
      <ellipse cx="20" cy="14" rx="12" ry="6" fill="oklch(0.62 0.17 152)" />
      <ellipse cx="20" cy="14" rx="8.5" ry="4" fill="oklch(0.72 0.15 152)" />
      <path d="M8 14v8c0 3.3 5.4 6 12 6s12-2.7 12-6v-8" fill="oklch(0.62 0.17 152)" />
      <path d="M8 22v8c0 3.3 5.4 6 12 6s12-2.7 12-6v-8" fill="oklch(0.68 0.16 152)" />
      <ellipse cx="32" cy="30" rx="9" ry="4.5" fill="oklch(0.75 0.14 80)" />
      <ellipse cx="32" cy="30" rx="6" ry="2.8" fill="oklch(0.83 0.12 80)" />
      <path d="M23 30v6c0 2.5 4 4.5 9 4.5s9-2 9-4.5v-6" fill="oklch(0.75 0.14 80)" />
    </svg>
  );
}

function Field({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-2 block text-sm font-bold">
        {label}
      </label>
      {children}
      {error && <p className="mt-1.5 text-xs font-semibold text-destructive">{error}</p>}
    </div>
  );
}

function CategoryBadge({ category }: { category: Category }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${CAT_BADGE[category]}`}
    >
      {category}
    </span>
  );
}

function IconAction({
  label,
  onClick,
  tone,
  children,
}: {
  label: string;
  onClick: () => void;
  tone: "primary" | "danger";
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-xl text-white shadow-card transition-all hover:-translate-y-0.5 hover:shadow-lift active:translate-y-0 ${
        tone === "primary"
          ? "bg-primary hover:bg-primary/90"
          : "bg-destructive hover:bg-destructive/90"
      }`}
    >
      {children}
    </button>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <span className="flex h-20 w-20 items-center justify-center rounded-full bg-secondary">
        <Wallet className="h-9 w-9 text-primary" />
      </span>
      <h3 className="mt-5 text-lg font-bold">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

function Sidebar({
  open,
  active,
  onNavigate,
  onClose,
}: {
  open: boolean;
  active: "home" | "expenses" | "categories";
  onNavigate: (id: string, nav: "home" | "expenses" | "categories") => void;
  onClose: () => void;
}) {
  const items = [
    { id: "home", nav: "home" as const, label: "Home", Icon: Home },
    { id: "expenses", nav: "expenses" as const, label: "All Expenses", Icon: AlignLeft },
    { id: "categories", nav: "categories" as const, label: "Categories", Icon: LayoutGrid },
  ];

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col overflow-y-auto bg-card shadow-lift transition-transform duration-300 lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:w-72 lg:translate-x-0 lg:shadow-none ${
        open ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      <div className="px-6 pb-6 pt-8">
        <button
          type="button"
          onClick={() => onNavigate("home", "home")}
          className="mx-auto flex w-full flex-col items-center gap-3"
        >
          <BrandMark className="h-14 w-14" />
          <span className="text-2xl font-extrabold tracking-tight">Expense Tracker</span>
        </button>
        <p className="mt-1.5 text-center text-sm text-muted-foreground">
          Track Your Spending
          <br />
          Build a Better Tomorrow
        </p>
      </div>

      <nav className="flex flex-col gap-2 px-5" aria-label="Main navigation">
        {items.map(({ id, nav, label, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => onNavigate(id, nav)}
            aria-current={active === nav ? "page" : undefined}
            className={`flex h-12 items-center gap-3 rounded-2xl px-4 text-sm font-bold transition-all ${
              active === nav
                ? "bg-primary text-primary-foreground shadow-card"
                : "text-foreground/75 hover:bg-accent hover:text-foreground"
            }`}
          >
            <Icon className="h-5 w-5" />
            {label}
          </button>
        ))}
      </nav>

      <div className="mt-auto hidden px-6 pb-8 pt-10 lg:block">
        <p className="font-hand -rotate-3 text-center text-xl leading-snug text-primary/80">
          Small steps
          <br />
          make big
          <br />
          changes ♡
        </p>
        <img
          src={plantImg}
          alt=""
          aria-hidden="true"
          loading="lazy"
          width={180}
          height={180}
          className="mx-auto mt-4 h-36 w-36 object-contain"
        />
      </div>

      {/* close affordance on mobile */}
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 rounded-xl border border-border bg-card p-2 text-foreground lg:hidden"
        aria-label="Close menu"
      >
        <X className="h-5 w-5" />
      </button>
    </aside>
  );
}

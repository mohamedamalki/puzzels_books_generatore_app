import { currentUserId } from "../auth/session";
import { getDb } from "../../lib/db";

export interface DashboardData {
  user: { name: string; email: string } | null;
  connected: boolean;
  error: boolean;
  stats: { books: number; month: number; series: number; pages: number; uniqueness: number | null; failures: number; cost: string | null };
  books: { id: string; title: string; status: string; pages: number; type: string; createdAt: string }[];
  jobs: { id: string; type: string; status: string; progress: number; createdAt: string }[];
}
export async function loadDashboard(): Promise<DashboardData> {
  const empty: DashboardData = { user: null, connected: !!process.env.DATABASE_URL, error: false, stats: { books: 0, month: 0, series: 0, pages: 0, uniqueness: null, failures: 0, cost: null }, books: [], jobs: [] };
  try {
    const userId = await currentUserId();
    if (!userId) return empty;
    const db = getDb();
    const month = new Date(); month.setUTCDate(1); month.setUTCHours(0, 0, 0, 0);
    const [user, totals, recent, series, failures, books, jobs, cost] = await Promise.all([
      db.user.findUniqueOrThrow({ where: { id: userId }, select: { name: true, email: true } }),
      db.book.aggregate({ where: { userId }, _count: true, _sum: { pageCount: true }, _avg: { uniquenessScore: true } }),
      db.book.count({ where: { userId, createdAt: { gte: month } } }),
      db.bookSeries.count({ where: { userId } }),
      db.validationRun.count({ where: { userId, status: "FAILED" } }),
      db.book.findMany({ where: { userId }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 12, include: { bookType: { select: { name: true } } } }),
      db.generationJob.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 5, select: { id: true, type: true, status: true, progress: true, createdAt: true } }),
      db.aIUsage.aggregate({ where: { userId, createdAt: { gte: month } }, _sum: { estimatedCost: true } }),
    ]);
    return { user: { name: user.name ?? "Publisher", email: user.email }, connected: true, error: false,
      stats: { books: totals._count, month: recent, series, pages: totals._sum.pageCount ?? 0, uniqueness: totals._avg.uniquenessScore, failures, cost: cost._sum.estimatedCost?.toFixed(2) ?? null },
      books: books.map(book => ({ id: book.id, title: book.title, status: book.status, pages: book.pageCount, type: book.bookType.name, createdAt: book.createdAt.toISOString() })),
      jobs: jobs.map(job => ({ ...job, createdAt: job.createdAt.toISOString() })),
    };
  } catch { return { ...empty, error: true }; }
}

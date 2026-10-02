import { redirect, notFound } from "next/navigation";
import { z } from "zod";
import { currentUserId } from "../../../modules/auth/session";
import { getDb } from "../../../lib/db";
import { BookWorkspace } from "../../../components/books/workspace";

export const dynamic = "force-dynamic";
export default async function BookPage({ params }: { params: Promise<{ id: string }> }) {
  const userId = await currentUserId();
  if (!userId) redirect("/");
  const parsed = z.uuid().safeParse((await params).id);
  if (!parsed.success) notFound();
  if (!await getDb().book.findFirst({ where: { id: parsed.data, userId }, select: { id: true } })) notFound();
  return <BookWorkspace id={parsed.data} />;
}

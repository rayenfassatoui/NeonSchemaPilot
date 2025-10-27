import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type DatabasePageProps = {
  searchParams: Promise<{
    connection?: string;
  }>;
};

export default async function DatabaseIndex({ searchParams }: DatabasePageProps) {
  const { connection } = await searchParams;
  const target = connection
    ? `/database/visual?connection=${encodeURIComponent(connection)}`
    : "/database/visual";

  redirect(target);
}

import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";

export const Route = createFileRoute("/kpi-rm")({
  head: () => ({
    meta: [
      { title: "KPI RM — BO Teluk Betung" },
      { name: "description", content: "Key Performance Indicator Relationship Manager." },
    ],
  }),
  component: KpiRmPage,
});

function KpiRmPage() {
  return (
    <AppLayout>
      <PageHeader title="KPI RM" description="Key Performance Indicator Relationship Manager." />
      <div className="rounded-lg border border-dashed bg-card p-10 text-center text-sm text-muted-foreground">
        Halaman KPI RM — isi menyusul.
      </div>
    </AppLayout>
  );
}

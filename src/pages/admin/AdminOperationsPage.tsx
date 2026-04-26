import { lazy, Suspense } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { OpsMetricsTab } from "./operations/OpsMetricsTab";
import { OpsLogsTab } from "./operations/OpsLogsTab";

const AdminChannelsPage = lazy(() => import("./AdminChannelsPage"));
const AdminQueuesPage = lazy(() => import("./AdminQueuesPage"));

export default function AdminOperationsPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Operações</h1>
        <p className="text-sm text-muted-foreground">
          Hub unificado de canais, filas, métricas e logs do atendimento.
        </p>
      </div>

      <Tabs defaultValue="metrics" className="w-full">
        <TabsList>
          <TabsTrigger value="metrics">Métricas</TabsTrigger>
          <TabsTrigger value="channels">Canais</TabsTrigger>
          <TabsTrigger value="queues">Filas</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="metrics" className="mt-4">
          <OpsMetricsTab />
        </TabsContent>

        <TabsContent value="channels" className="mt-4">
          <Suspense fallback={<Skeleton className="h-96" />}>
            <AdminChannelsPage />
          </Suspense>
        </TabsContent>

        <TabsContent value="queues" className="mt-4">
          <Suspense fallback={<Skeleton className="h-96" />}>
            <AdminQueuesPage />
          </Suspense>
        </TabsContent>

        <TabsContent value="logs" className="mt-4">
          <OpsLogsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

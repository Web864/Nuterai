import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Camera, Leaf, Scan, Search } from "lucide-react";

import { Route as AuthedRoute } from "./route";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PhotoTab, BarcodeTab, SearchTab } from "@/features/scan/FoodScan";

export const Route = createFileRoute("/_authenticated/scan")({
  head: () => ({
    meta: [{ title: "Scan food — NutriAI" }, { name: "robots", content: "noindex" }],
  }),
  component: ScanPage,
});

function ScanPage() {
  const { userId } = AuthedRoute.useRouteContext();

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3 sm:px-6">
          <Link to="/dashboard">
            <Button variant="ghost" size="sm" className="rounded-full">
              <ArrowLeft className="h-4 w-4" />
              <span className="ml-1 hidden sm:inline">Dashboard</span>
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Leaf className="h-4 w-4" />
            </span>
            <span className="font-display text-lg">Scan food</span>
          </div>
          <div className="w-16" />
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
        <Tabs defaultValue="photo" className="w-full">
          <TabsList className="grid w-full grid-cols-3 rounded-2xl">
            <TabsTrigger value="photo" className="rounded-xl">
              <Camera className="mr-1.5 h-4 w-4" /> Photo
            </TabsTrigger>
            <TabsTrigger value="barcode" className="rounded-xl">
              <Scan className="mr-1.5 h-4 w-4" /> Barcode
            </TabsTrigger>
            <TabsTrigger value="search" className="rounded-xl">
              <Search className="mr-1.5 h-4 w-4" /> Search
            </TabsTrigger>
          </TabsList>

          <TabsContent value="photo" className="mt-6">
            <PhotoTab userId={userId} />
          </TabsContent>
          <TabsContent value="barcode" className="mt-6">
            <BarcodeTab userId={userId} />
          </TabsContent>
          <TabsContent value="search" className="mt-6">
            <SearchTab userId={userId} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

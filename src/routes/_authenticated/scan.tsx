import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState, useCallback } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  Camera,
  Image as ImageIcon,
  Loader2,
  Scan,
  Search,
  Sparkles,
  Trash2,
  Upload,
  X,
  Check,
  Leaf,
} from "lucide-react";
import { BrowserMultiFormatReader } from "@zxing/browser";

import { Route as AuthedRoute } from "./route";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert } from "@/integrations/supabase/types";
import {
  analyzeMealPhoto,
  lookupBarcode,
  searchFood,
  type AnalyzedMealPhoto,
  type BarcodeProduct,
  type SearchProduct,
} from "@/lib/ai-vision.functions";
import { todayISO } from "@/features/logging/queries";

export const Route = createFileRoute("/_authenticated/scan")({
  head: () => ({
    meta: [
      { title: "Scan food — NutriAI" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ScanPage,
});

type MealType = "breakfast" | "lunch" | "dinner" | "snack";

function currentMealType(): MealType {
  const h = new Date().getHours();
  if (h < 10) return "breakfast";
  if (h < 15) return "lunch";
  if (h < 21) return "dinner";
  return "snack";
}

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

// ============================================================
// PHOTO TAB
// ============================================================

type EditableItem = {
  name: string;
  serving_qty: number;
  serving_unit: string;
  calories_kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  sugar_g?: number;
  ingredients?: string[];
  quantity: number; // multiplier
  meal_type: MealType;
  selected: boolean;
};

function PhotoTab({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const analyze = useServerFn(analyzeMealPhoto);
  const [preview, setPreview] = useState<string | null>(null);
  const [hint, setHint] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<AnalyzedMealPhoto | null>(null);
  const [items, setItems] = useState<EditableItem[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);

  async function handleFile(f: File) {
    if (!f.type.startsWith("image/")) {
      toast.error("Please pick an image file.");
      return;
    }
    if (f.size > 8 * 1024 * 1024) {
      toast.error("Image is too large (max 8MB).");
      return;
    }
    const dataUrl = await downscaleImage(f, 1280);
    setPreview(dataUrl);
    setResult(null);
    setItems([]);
  }

  async function runAnalyze() {
    if (!preview) return;
    setBusy(true);
    try {
      const r = await analyze({ data: { image_data_url: preview, hint: hint || undefined } });
      if (!r.items.length) {
        toast.error(r.notes ?? "No food detected. Try another photo.");
      } else {
        toast.success(`Detected ${r.items.length} item${r.items.length > 1 ? "s" : ""}`);
      }
      setResult(r);
      const meal = currentMealType();
      setItems(
        r.items.map((it) => ({
          name: it.name,
          serving_qty: it.serving_qty,
          serving_unit: it.serving_unit,
          calories_kcal: it.calories_kcal,
          protein_g: it.protein_g,
          carbs_g: it.carbs_g,
          fat_g: it.fat_g,
          fiber_g: it.fiber_g,
          sugar_g: it.sugar_g,
          ingredients: it.ingredients,
          quantity: 1,
          meal_type: meal,
          selected: true,
        })),
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Analysis failed.");
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setPreview(null);
    setResult(null);
    setItems([]);
    setHint("");
  }

  async function saveAll() {
    const chosen = items.filter((i) => i.selected);
    if (!chosen.length) {
      toast.error("Select at least one item.");
      return;
    }
    setBusy(true);
    try {
      const rows: TablesInsert<"meal_entries">[] = chosen.map((i) => ({
        user_id: userId,
        name: i.name,
        serving_qty: i.serving_qty * i.quantity,
        serving_unit: i.serving_unit,
        calories_kcal: Math.round(i.calories_kcal * i.quantity),
        protein_g: Math.round(i.protein_g * i.quantity * 10) / 10,
        carbs_g: Math.round(i.carbs_g * i.quantity * 10) / 10,
        fat_g: Math.round(i.fat_g * i.quantity * 10) / 10,
        fiber_g: Math.round(i.fiber_g * i.quantity * 10) / 10,
        sugar_g: i.sugar_g != null ? Math.round(i.sugar_g * i.quantity * 10) / 10 : null,
        meal_type: i.meal_type,
        source: "ai_photo_scan",
        ai_model: result?.model ?? null,
        ai_confidence: result?.confidence ?? null,
        description: i.ingredients?.join(", ") ?? null,
        logged_date: todayISO(),
      }));
      const { error } = await supabase.from("meal_entries").insert(rows);
      if (error) throw error;
      toast.success(`Logged ${rows.length} item${rows.length > 1 ? "s" : ""}`);
      qc.invalidateQueries({ queryKey: ["meals", userId] });
      reset();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="rounded-3xl border-border/60 shadow-soft">
      <CardContent className="p-5 sm:p-6 space-y-4">
        {!preview ? (
          <div className="rounded-2xl border-2 border-dashed border-border/70 bg-card/50 p-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/15">
              <Camera className="h-6 w-6 text-accent" />
            </div>
            <h3 className="mt-4 font-display text-xl">Snap or upload your meal</h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              AI identifies each food and estimates portion & macros. Review before saving.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <Button className="rounded-full" onClick={() => camRef.current?.click()}>
                <Camera className="mr-2 h-4 w-4" /> Take photo
              </Button>
              <Button variant="outline" className="rounded-full" onClick={() => fileRef.current?.click()}>
                <Upload className="mr-2 h-4 w-4" /> Upload
              </Button>
            </div>
            <input
              ref={camRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative overflow-hidden rounded-2xl">
              <img src={preview} alt="Meal preview" className="max-h-96 w-full object-contain bg-secondary/40" />
              <Button
                size="icon"
                variant="secondary"
                className="absolute right-2 top-2 h-8 w-8 rounded-full"
                onClick={reset}
                aria-label="Remove image"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            {!result && (
              <div className="space-y-3">
                <div>
                  <Label htmlFor="hint" className="text-sm">
                    Optional hint <span className="text-muted-foreground">(e.g. "medium plate, ~200g pasta")</span>
                  </Label>
                  <Input
                    id="hint"
                    value={hint}
                    onChange={(e) => setHint(e.target.value)}
                    placeholder="Add context to improve accuracy"
                    className="mt-1 rounded-xl"
                    disabled={busy}
                  />
                </div>
                <Button onClick={runAnalyze} disabled={busy} className="w-full rounded-full">
                  {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                  {busy ? "Analyzing…" : "Analyze photo"}
                </Button>
              </div>
            )}

            {result && items.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-display text-lg">Detected items</p>
                    <p className="text-xs text-muted-foreground">
                      Confidence: {Math.round((result.confidence ?? 0) * 100)}% — edit anything before saving
                    </p>
                  </div>
                  <Badge variant="outline" className="rounded-full">{items.filter((i) => i.selected).length} selected</Badge>
                </div>
                <div className="space-y-3">
                  {items.map((it, idx) => (
                    <ItemEditor
                      key={idx}
                      item={it}
                      onChange={(patch) => setItems((prev) => prev.map((p, i) => (i === idx ? { ...p, ...patch } : p)))}
                      onRemove={() => setItems((prev) => prev.filter((_, i) => i !== idx))}
                    />
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 rounded-full" onClick={reset} disabled={busy}>
                    Discard
                  </Button>
                  <Button className="flex-1 rounded-full" onClick={saveAll} disabled={busy}>
                    {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                    Log {items.filter((i) => i.selected).length} item(s)
                  </Button>
                </div>
              </div>
            )}
            {result && items.length === 0 && (
              <p className="text-sm text-muted-foreground text-center">
                {result.notes ?? "No food detected."}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ItemEditor({
  item,
  onChange,
  onRemove,
}: {
  item: EditableItem;
  onChange: (p: Partial<EditableItem>) => void;
  onRemove: () => void;
}) {
  const cal = Math.round(item.calories_kcal * item.quantity);
  const p = Math.round(item.protein_g * item.quantity * 10) / 10;
  const c = Math.round(item.carbs_g * item.quantity * 10) / 10;
  const f = Math.round(item.fat_g * item.quantity * 10) / 10;
  return (
    <div className={`rounded-2xl border p-3 transition-organic ${item.selected ? "border-accent/40 bg-accent/5" : "border-border/60 bg-card/50 opacity-70"}`}>
      <div className="flex items-start gap-2">
        <input
          type="checkbox"
          checked={item.selected}
          onChange={(e) => onChange({ selected: e.target.checked })}
          className="mt-1 h-4 w-4 rounded"
          aria-label={`Include ${item.name}`}
        />
        <div className="flex-1 min-w-0">
          <Input
            value={item.name}
            onChange={(e) => onChange({ name: e.target.value })}
            className="h-8 rounded-lg text-sm font-medium"
          />
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <label className="text-xs">
              <span className="text-muted-foreground">Qty ×</span>
              <Input
                type="number"
                step="0.25"
                min="0.25"
                value={item.quantity}
                onChange={(e) => onChange({ quantity: Math.max(0.25, parseFloat(e.target.value) || 1) })}
                className="mt-0.5 h-8 rounded-lg"
              />
            </label>
            <label className="text-xs">
              <span className="text-muted-foreground">Meal</span>
              <Select value={item.meal_type} onValueChange={(v) => onChange({ meal_type: v as MealType })}>
                <SelectTrigger className="mt-0.5 h-8 rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="breakfast">Breakfast</SelectItem>
                  <SelectItem value="lunch">Lunch</SelectItem>
                  <SelectItem value="dinner">Dinner</SelectItem>
                  <SelectItem value="snack">Snack</SelectItem>
                </SelectContent>
              </Select>
            </label>
            <div className="text-xs col-span-2 sm:col-span-2 flex items-end">
              <p className="text-muted-foreground">
                {item.serving_qty * item.quantity} {item.serving_unit}
              </p>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
            <Badge variant="secondary" className="rounded-full">{cal} kcal</Badge>
            <Badge variant="outline" className="rounded-full">P {p}g</Badge>
            <Badge variant="outline" className="rounded-full">C {c}g</Badge>
            <Badge variant="outline" className="rounded-full">F {f}g</Badge>
          </div>
          {item.ingredients && item.ingredients.length > 0 && (
            <p className="mt-2 text-xs text-muted-foreground truncate">
              {item.ingredients.join(", ")}
            </p>
          )}
        </div>
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onRemove} aria-label="Remove item">
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

// ============================================================
// BARCODE TAB
// ============================================================

function BarcodeTab({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const lookup = useServerFn(lookupBarcode);
  const [scanning, setScanning] = useState(false);
  const [manual, setManual] = useState("");
  const [busy, setBusy] = useState(false);
  const [product, setProduct] = useState<BarcodeProduct | null>(null);
  const [notFound, setNotFound] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);

  const stopScan = useCallback(() => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    setScanning(false);
  }, []);

  useEffect(() => {
    return () => {
      controlsRef.current?.stop();
    };
  }, []);

  async function handleBarcode(code: string) {
    stopScan();
    setBusy(true);
    setNotFound(null);
    setProduct(null);
    try {
      const p = await lookup({ data: { barcode: code } });
      if (!p) {
        setNotFound(code);
        toast.error("Product not found. Add it manually below.");
      } else {
        setProduct(p);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lookup failed.");
    } finally {
      setBusy(false);
    }
  }

  async function startScan() {
    setScanning(true);
    setProduct(null);
    setNotFound(null);
    try {
      const reader = new BrowserMultiFormatReader();
      readerRef.current = reader;
      const controls = await reader.decodeFromVideoDevice(undefined, videoRef.current!, (result, err, ctrl) => {
        if (result) {
          controlsRef.current = ctrl;
          ctrl.stop();
          void handleBarcode(result.getText());
        }
      });
      controlsRef.current = controls;
    } catch (e) {
      console.error(e);
      toast.error("Couldn't start the camera. Grant permission or use manual entry.");
      setScanning(false);
    }
  }

  function submitManual(e: React.FormEvent) {
    e.preventDefault();
    const code = manual.trim();
    if (!/^\d{6,14}$/.test(code)) {
      toast.error("Enter a valid 6-14 digit barcode.");
      return;
    }
    void handleBarcode(code);
  }

  return (
    <Card className="rounded-3xl border-border/60 shadow-soft">
      <CardContent className="p-5 sm:p-6 space-y-4">
        {scanning ? (
          <div className="space-y-3">
            <div className="relative overflow-hidden rounded-2xl bg-black aspect-video">
              <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="h-1/2 w-3/4 rounded-xl border-2 border-white/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
              </div>
            </div>
            <p className="text-center text-sm text-muted-foreground">Point at a barcode…</p>
            <Button variant="outline" className="w-full rounded-full" onClick={stopScan}>
              Cancel
            </Button>
          </div>
        ) : product ? (
          <ProductCard
            product={product}
            userId={userId}
            onSaved={() => {
              setProduct(null);
              qc.invalidateQueries({ queryKey: ["meals", userId] });
            }}
            onCancel={() => setProduct(null)}
          />
        ) : (
          <>
            <div className="rounded-2xl border-2 border-dashed border-border/70 bg-card/50 p-6 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/15">
                <Scan className="h-6 w-6 text-accent" />
              </div>
              <h3 className="mt-3 font-display text-xl">Scan a barcode</h3>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                Use your camera or enter the number manually. We look products up via Open Food Facts.
              </p>
              <Button className="mt-4 rounded-full" onClick={startScan} disabled={busy}>
                <Camera className="mr-2 h-4 w-4" /> Start camera
              </Button>
            </div>

            <form onSubmit={submitManual} className="space-y-2">
              <Label htmlFor="barcode-manual">Or enter barcode manually</Label>
              <div className="flex gap-2">
                <Input
                  id="barcode-manual"
                  inputMode="numeric"
                  value={manual}
                  onChange={(e) => setManual(e.target.value.replace(/\D/g, ""))}
                  placeholder="e.g. 3017624010701"
                  className="rounded-xl"
                  disabled={busy}
                />
                <Button type="submit" className="rounded-full" disabled={busy}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Look up"}
                </Button>
              </div>
            </form>

            {notFound && (
              <div className="rounded-2xl border border-border/60 bg-secondary/40 p-4 space-y-2">
                <p className="text-sm">
                  <b>{notFound}</b> isn't in the database yet.
                </p>
                <p className="text-xs text-muted-foreground">
                  Add it as a custom food and save to your log.
                </p>
                <CustomFoodForm
                  userId={userId}
                  barcode={notFound}
                  onSaved={() => {
                    setNotFound(null);
                    qc.invalidateQueries({ queryKey: ["meals", userId] });
                  }}
                />
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function ProductCard({
  product,
  userId,
  onSaved,
  onCancel,
}: {
  product: BarcodeProduct;
  userId: string;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [qty, setQty] = useState(1);
  const [meal, setMeal] = useState<MealType>(currentMealType());
  const [busy, setBusy] = useState(false);

  const cal = Math.round(product.calories_kcal * qty);
  const p = Math.round(product.protein_g * qty * 10) / 10;
  const c = Math.round(product.carbs_g * qty * 10) / 10;
  const f = Math.round(product.fat_g * qty * 10) / 10;

  async function save() {
    setBusy(true);
    try {
      const row: TablesInsert<"meal_entries"> = {
        user_id: userId,
        name: product.name,
        brand: product.brand,
        barcode: product.barcode,
        image_url: product.image_url,
        serving_qty: product.serving_qty * qty,
        serving_unit: product.serving_unit,
        calories_kcal: cal,
        protein_g: p,
        carbs_g: c,
        fat_g: f,
        fiber_g: Math.round(product.fiber_g * qty * 10) / 10,
        sugar_g: product.sugar_g != null ? Math.round(product.sugar_g * qty * 10) / 10 : null,
        sodium_mg: product.sodium_mg != null ? Math.round(product.sodium_mg * qty) : null,
        meal_type: meal,
        source: "barcode",
        description: product.ingredients,
        logged_date: todayISO(),
      };
      const { error } = await supabase.from("meal_entries").insert(row);
      if (error) throw error;
      toast.success(`Logged ${product.name}`);
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        {product.image_url ? (
          <img src={product.image_url} alt={product.name} className="h-24 w-24 rounded-2xl object-cover bg-secondary" />
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-secondary">
            <ImageIcon className="h-8 w-8 text-muted-foreground" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg leading-tight">{product.name}</p>
          {product.brand && <p className="text-sm text-muted-foreground">{product.brand}</p>}
          <p className="mt-1 text-xs text-muted-foreground">Barcode {product.barcode}</p>
          <p className="text-xs text-muted-foreground">
            Per {product.serving_qty} {product.serving_unit}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <label className="text-xs">
          <span className="text-muted-foreground">Servings</span>
          <Input
            type="number"
            step="0.25"
            min="0.25"
            value={qty}
            onChange={(e) => setQty(Math.max(0.25, parseFloat(e.target.value) || 1))}
            className="mt-0.5 h-9 rounded-lg"
          />
        </label>
        <label className="text-xs">
          <span className="text-muted-foreground">Meal</span>
          <Select value={meal} onValueChange={(v) => setMeal(v as MealType)}>
            <SelectTrigger className="mt-0.5 h-9 rounded-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="breakfast">Breakfast</SelectItem>
              <SelectItem value="lunch">Lunch</SelectItem>
              <SelectItem value="dinner">Dinner</SelectItem>
              <SelectItem value="snack">Snack</SelectItem>
            </SelectContent>
          </Select>
        </label>
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        <Badge variant="secondary" className="rounded-full">{cal} kcal</Badge>
        <Badge variant="outline" className="rounded-full">P {p}g</Badge>
        <Badge variant="outline" className="rounded-full">C {c}g</Badge>
        <Badge variant="outline" className="rounded-full">F {f}g</Badge>
        {product.sugar_g != null && (
          <Badge variant="outline" className="rounded-full">Sugar {Math.round(product.sugar_g * qty * 10) / 10}g</Badge>
        )}
      </div>

      {product.ingredients && (
        <p className="text-xs text-muted-foreground line-clamp-3">
          <span className="font-medium">Ingredients:</span> {product.ingredients}
        </p>
      )}

      <div className="flex gap-2">
        <Button variant="outline" className="flex-1 rounded-full" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button className="flex-1 rounded-full" onClick={save} disabled={busy}>
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
          Add to log
        </Button>
      </div>
    </div>
  );
}

function CustomFoodForm({ userId, barcode, onSaved }: { userId: string; barcode: string | null; onSaved: () => void }) {
  const [name, setName] = useState("");
  const [cal, setCal] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [meal, setMeal] = useState<MealType>(currentMealType());
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !cal) {
      toast.error("Name and calories are required.");
      return;
    }
    setBusy(true);
    try {
      const row: TablesInsert<"meal_entries"> = {
        user_id: userId,
        name: name.trim(),
        barcode,
        calories_kcal: Math.round(parseFloat(cal) || 0),
        protein_g: parseFloat(protein) || 0,
        carbs_g: parseFloat(carbs) || 0,
        fat_g: parseFloat(fat) || 0,
        fiber_g: 0,
        meal_type: meal,
        source: barcode ? "barcode" : "manual",
        logged_date: todayISO(),
      };
      const { error } = await supabase.from("meal_entries").insert(row);
      if (error) throw error;
      toast.success("Saved to log");
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-2">
      <Input placeholder="Product name" value={name} onChange={(e) => setName(e.target.value)} className="rounded-xl" />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Input placeholder="kcal" inputMode="decimal" value={cal} onChange={(e) => setCal(e.target.value)} className="rounded-xl" />
        <Input placeholder="P (g)" inputMode="decimal" value={protein} onChange={(e) => setProtein(e.target.value)} className="rounded-xl" />
        <Input placeholder="C (g)" inputMode="decimal" value={carbs} onChange={(e) => setCarbs(e.target.value)} className="rounded-xl" />
        <Input placeholder="F (g)" inputMode="decimal" value={fat} onChange={(e) => setFat(e.target.value)} className="rounded-xl" />
      </div>
      <div className="flex gap-2">
        <Select value={meal} onValueChange={(v) => setMeal(v as MealType)}>
          <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="breakfast">Breakfast</SelectItem>
            <SelectItem value="lunch">Lunch</SelectItem>
            <SelectItem value="dinner">Dinner</SelectItem>
            <SelectItem value="snack">Snack</SelectItem>
          </SelectContent>
        </Select>
        <Button type="submit" className="rounded-full" disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
        </Button>
      </div>
    </form>
  );
}

// ============================================================
// SEARCH TAB
// ============================================================

function SearchTab({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const search = useServerFn(searchFood);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<SearchProduct[] | null>(null);
  const [picked, setPicked] = useState<SearchProduct | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (q.trim().length < 2) return;
    setBusy(true);
    try {
      const r = await search({ data: { query: q.trim() } });
      setResults(r);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Search failed.");
    } finally {
      setBusy(false);
    }
  }

  if (picked) {
    const asProduct: BarcodeProduct = {
      barcode: picked.barcode ?? "",
      name: picked.name,
      brand: picked.brand,
      image_url: picked.image_url,
      serving_size: null,
      serving_qty: picked.serving_qty,
      serving_unit: picked.serving_unit,
      calories_kcal: picked.calories_kcal,
      protein_g: picked.protein_g,
      carbs_g: picked.carbs_g,
      fat_g: picked.fat_g,
      fiber_g: picked.fiber_g,
      sugar_g: null,
      sodium_mg: null,
      ingredients: null,
      source: "openfoodfacts",
    };
    return (
      <Card className="rounded-3xl border-border/60 shadow-soft">
        <CardContent className="p-5 sm:p-6">
          <ProductCard
            product={asProduct}
            userId={userId}
            onSaved={() => {
              setPicked(null);
              qc.invalidateQueries({ queryKey: ["meals", userId] });
            }}
            onCancel={() => setPicked(null)}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-3xl border-border/60 shadow-soft">
      <CardContent className="p-5 sm:p-6 space-y-4">
        <form onSubmit={submit} className="flex gap-2">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search food (e.g. greek yogurt)"
            className="rounded-xl"
            disabled={busy}
          />
          <Button type="submit" className="rounded-full" disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
        </form>

        {results === null && (
          <p className="text-sm text-muted-foreground text-center py-8">
            Search a food or product to see nutrition options.
          </p>
        )}
        {results && results.length === 0 && (
          <div className="rounded-2xl border border-border/60 bg-secondary/40 p-4 text-sm">
            No results. You can still log it as a custom food:
            <div className="mt-2">
              <CustomFoodForm userId={userId} barcode={null} onSaved={() => qc.invalidateQueries({ queryKey: ["meals", userId] })} />
            </div>
          </div>
        )}
        {results && results.length > 0 && (
          <div className="space-y-2">
            {results.map((r, i) => (
              <button
                key={`${r.barcode ?? "x"}-${i}`}
                onClick={() => setPicked(r)}
                className="flex w-full gap-3 rounded-2xl border border-border/60 bg-card/50 p-3 text-left transition-organic hover:border-accent/40 hover:bg-secondary/50"
              >
                {r.image_url ? (
                  <img src={r.image_url} alt="" className="h-14 w-14 rounded-xl object-cover" />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-secondary">
                    <ImageIcon className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-sm">{r.name}</p>
                  {r.brand && <p className="truncate text-xs text-muted-foreground">{r.brand}</p>}
                  <div className="mt-1 flex flex-wrap gap-1">
                    <Badge variant="secondary" className="rounded-full text-[10px]">{r.calories_kcal} kcal</Badge>
                    <Badge variant="outline" className="rounded-full text-[10px]">P {r.protein_g}g</Badge>
                    <Badge variant="outline" className="rounded-full text-[10px]">C {r.carbs_g}g</Badge>
                    <Badge variant="outline" className="rounded-full text-[10px]">F {r.fat_g}g</Badge>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================
// UTILS
// ============================================================

async function downscaleImage(file: File, maxDim: number): Promise<string> {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) {
    // Fallback: read as data URL directly
    return await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = () => reject(new Error("Read failed"));
      r.readAsDataURL(file);
    });
  }
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");
  ctx.drawImage(bitmap, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", 0.85);
}

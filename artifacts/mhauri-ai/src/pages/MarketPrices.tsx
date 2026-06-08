import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListMarketPrices,
  getListMarketPricesQueryKey,
  useCreateMarketPrice,
  useUpdateMarketPrice,
  useDeleteMarketPrice,
} from "@workspace/api-client-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit2, Trash2, TrendingUp, Info } from "lucide-react";
import { format } from "date-fns";

const MARKETS = ["GMB", "Mbare Musika", "Grain Millers", "Farmer Market", "Other"];
const COMMODITIES = [
  "Maize", "Wheat", "Soybean", "Groundnuts", "Tobacco", "Sorghum", 
  "Millet", "Cattle", "Goats", "Chickens", "Milk", "Tomatoes", "Potatoes"
];

const priceSchema = z.object({
  commodity: z.string().min(1, "Commodity is required"),
  unit: z.string().default("kg"),
  priceUsd: z.string().or(z.number()).transform(v => String(v)),
  market: z.string().default("GMB"),
  priceDate: z.string().min(1, "Date is required"),
  notes: z.string().optional().default(""),
});

type PriceFormValues = z.infer<typeof priceSchema>;

export default function MarketPrices() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPrice, setEditingPrice] = useState<any>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { data: prices, isLoading } = useListMarketPrices();
  const createMutation = useCreateMarketPrice();
  const updateMutation = useUpdateMarketPrice();
  const deleteMutation = useDeleteMarketPrice();

  const handleEdit = (price: any) => {
    setEditingPrice(price);
    setIsFormOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await deleteMutation.mutateAsync({ id: deletingId });
      queryClient.invalidateQueries({ queryKey: getListMarketPricesQueryKey() });
      toast({ title: "Price record deleted" });
    } catch (err) {
      toast({ variant: "destructive", title: "Error", description: "Failed to delete price." });
    } finally {
      setDeletingId(null);
    }
  };

  const sortedPrices = [...(prices || [])].sort((a, b) => 
    new Date(b.priceDate).getTime() - new Date(a.priceDate).getTime()
  );

  return (
    <div className="flex flex-col h-full bg-muted/20">
      <div className="flex items-center justify-between px-6 py-4 border-b bg-background">
        <div>
          <h1 className="text-2xl font-semibold text-primary">Market Prices</h1>
          <p className="text-sm text-muted-foreground">Manage commodity prices across Zimbabwe</p>
        </div>
        <Button onClick={() => { setEditingPrice(null); setIsFormOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Add Price
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-6xl mx-auto bg-background rounded-xl border shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : prices?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <TrendingUp className="h-12 w-12 text-primary/20 mb-4" />
              <h3 className="text-lg font-medium">No prices recorded yet</h3>
              <p className="text-muted-foreground">Start by adding the latest market rates.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead>Commodity</TableHead>
                  <TableHead>Market</TableHead>
                  <TableHead>Price (USD)</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedPrices.map((price) => (
                  <TableRow key={price.id}>
                    <TableCell className="font-medium">{price.commodity}</TableCell>
                    <TableCell>{price.market}</TableCell>
                    <TableCell className="text-primary font-semibold">${Number(price.priceUsd).toFixed(2)}</TableCell>
                    <TableCell className="text-muted-foreground">{price.unit}</TableCell>
                    <TableCell>{format(new Date(price.priceDate), "MMM dd, yyyy")}</TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {price.notes ? (
                        <span className="flex items-center text-xs text-muted-foreground">
                          <Info className="h-3 w-3 mr-1" /> {price.notes}
                        </span>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(price)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => setDeletingId(price.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingPrice ? "Edit Market Price" : "Add New Market Price"}</DialogTitle>
          </DialogHeader>
          <PriceForm
            price={editingPrice}
            onSuccess={() => {
              setIsFormOpen(false);
              queryClient.invalidateQueries({ queryKey: getListMarketPricesQueryKey() });
            }}
            onCancel={() => setIsFormOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Price Record</AlertDialogTitle>
            <AlertDialogDescription>Are you sure? This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function PriceForm({ price, onSuccess, onCancel }: { price?: any, onSuccess: () => void, onCancel: () => void }) {
  const createMutation = useCreateMarketPrice();
  const updateMutation = useUpdateMarketPrice();
  const { toast } = useToast();

  const form = useForm<PriceFormValues>({
    resolver: zodResolver(priceSchema),
    defaultValues: {
      commodity: price?.commodity || "",
      unit: price?.unit || "kg",
      priceUsd: price?.priceUsd || "",
      market: price?.market || "GMB",
      priceDate: price?.priceDate ? format(new Date(price.priceDate), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
      notes: price?.notes || "",
    },
  });

  const onSubmit = async (values: PriceFormValues) => {
    try {
      if (price) {
        await updateMutation.mutateAsync({ id: price.id, data: values as any });
        toast({ title: "Price updated" });
      } else {
        await createMutation.mutateAsync({ data: values as any });
        toast({ title: "Price added" });
      }
      onSuccess();
    } catch (err) {
      toast({ variant: "destructive", title: "Error", description: "Failed to save price." });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="commodity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Commodity</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input list="commodities-list" {...field} />
                    <datalist id="commodities-list">
                      {COMMODITIES.map(c => <option key={c} value={c} />)}
                    </datalist>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="market"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Market</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    {MARKETS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="priceUsd"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Price (USD)</FormLabel>
                <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="unit"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Unit</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="kg">Per kg</SelectItem>
                    <SelectItem value="tonne">Per tonne</SelectItem>
                    <SelectItem value="head">Per head</SelectItem>
                    <SelectItem value="litre">Per litre</SelectItem>
                    <SelectItem value="bucket">Per bucket</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="priceDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Date</FormLabel>
              <FormControl><Input type="date" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl><Textarea {...field} rows={3} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
          <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
            {price ? "Update" : "Add Price"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

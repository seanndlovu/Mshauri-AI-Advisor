import { useState, useMemo, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListFarmers,
  getListFarmersQueryKey,
  useGetFarmer,
  getGetFarmerQueryKey,
  useUpdateFarmer,
  useDeleteFarmer,
} from "@workspace/api-client-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Form,
  FormControl,
  FormDescription,
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Search, Edit2, Trash2, User, MapPin, Calendar, X } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

const LANGUAGE_MAP: Record<string, string> = {
  en: "English",
  sn: "Shona",
  nd: "Ndebele",
};

const farmerFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  location: z.string().optional().default(""),
  cropsString: z.string().optional().default(""),
  livestockString: z.string().optional().default(""),
  languagePref: z.enum(["en", "sn", "nd"]),
  isActive: z.boolean().default(true),
});

type FarmerFormValues = z.infer<typeof farmerFormSchema>;

export default function Farmers() {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("all");
  const [editingPhone, setEditingPhone] = useState<string | null>(null);
  const [deletingPhone, setDeletingPhone] = useState<string | null>(null);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: farmers, isLoading } = useListFarmers({
    search: search || undefined,
    isActive: activeFilter === "all" ? undefined : activeFilter === "active",
  });

  const deleteFarmer = useDeleteFarmer();

  const handleDelete = async () => {
    if (!deletingPhone) return;
    try {
      await deleteFarmer.mutateAsync({ phone: deletingPhone });
      queryClient.invalidateQueries({ queryKey: getListFarmersQueryKey() });
      toast({ title: "Farmer profile deleted" });
    } catch (err) {
      toast({ variant: "destructive", title: "Error", description: "Failed to delete farmer." });
    } finally {
      setDeletingPhone(null);
    }
  };

  return (
    <div className="flex flex-col h-full bg-muted/20">
      <div className="flex items-center justify-between px-6 py-4 border-b bg-background">
        <div>
          <h1 className="text-2xl font-semibold text-primary">Farmers</h1>
          <p className="text-sm text-muted-foreground">
            {farmers?.length || 0} farmers registered
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="flex flex-col gap-6 max-w-6xl mx-auto">
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 p-4 bg-background border rounded-xl shadow-sm">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search name, phone, or location..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={activeFilter} onValueChange={(v: any) => setActiveFilter(v)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* List */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="h-48">
                  <CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader>
                  <CardContent><Skeleton className="h-20 w-full" /></CardContent>
                </Card>
              ))}
            </div>
          ) : farmers?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed rounded-xl bg-background">
              <User className="h-12 w-12 text-primary/20 mb-4" />
              <h3 className="text-lg font-medium">No farmers found</h3>
              <p className="text-muted-foreground">Try adjusting your search or filters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {farmers?.map((farmer) => (
                <Card key={farmer.phone} className={`flex flex-col ${!farmer.isActive ? 'opacity-60 bg-muted/30' : 'bg-background hover:border-primary/50'}`}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <CardTitle className="text-lg">{farmer.name || "Unknown"}</CardTitle>
                        <p className="text-sm text-muted-foreground font-mono">{farmer.phone}</p>
                      </div>
                      <Badge variant={farmer.isActive ? "outline" : "secondary"}>
                        {farmer.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 pb-2">
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5 mr-2" />
                        {farmer.location || "No location set"}
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <Badge variant="outline" className="text-[10px] h-5">
                          {LANGUAGE_MAP[farmer.languagePref] || farmer.languagePref}
                        </Badge>
                        {farmer.crops && farmer.crops.length > 0 && (
                          <Badge variant="secondary" className="text-[10px] h-5 bg-green-100 text-green-800 border-none">
                            {farmer.crops.length} Crops
                          </Badge>
                        )}
                        {farmer.livestock && farmer.livestock.length > 0 && (
                          <Badge variant="secondary" className="text-[10px] h-5 bg-orange-100 text-orange-800 border-none">
                            {farmer.livestock.length} Livestock
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="pt-2 flex items-center justify-between border-t mt-auto text-xs text-muted-foreground">
                    <div>
                      {farmer.lastSeen ? `Seen ${formatDistanceToNow(new Date(farmer.lastSeen), { addSuffix: true })}` : "Never seen"}
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingPhone(farmer.phone)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => setDeletingPhone(farmer.phone)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      <FarmerEditSheet
        phone={editingPhone}
        open={!!editingPhone}
        onOpenChange={(open) => !open && setEditingPhone(null)}
      />

      <AlertDialog open={!!deletingPhone} onOpenChange={(open) => !open && setDeletingPhone(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Farmer Profile</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure? This will remove all profile information for this farmer. Conversations will be kept but the profile will be reset if they message again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function FarmerEditSheet({ phone, open, onOpenChange }: { phone: string | null, open: boolean, onOpenChange: (open: boolean) => void }) {
  const { data: farmer, isLoading } = useGetFarmer(phone as string, {
    query: { enabled: !!phone && open, queryKey: getGetFarmerQueryKey(phone as string) }
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const updateFarmer = useUpdateFarmer();

  const form = useForm<FarmerFormValues>({
    resolver: zodResolver(farmerFormSchema),
    defaultValues: {
      name: "",
      location: "",
      cropsString: "",
      livestockString: "",
      languagePref: "en",
      isActive: true,
    },
  });

  useEffect(() => {
    if (farmer) {
      form.reset({
        name: farmer.name || "",
        location: farmer.location || "",
        cropsString: farmer.crops?.join(", ") || "",
        livestockString: farmer.livestock?.join(", ") || "",
        languagePref: (farmer.languagePref as any) || "en",
        isActive: farmer.isActive,
      });
    }
  }, [farmer, form]);

  const onSubmit = async (values: FarmerFormValues) => {
    if (!phone) return;
    try {
      await updateFarmer.mutateAsync({
        phone,
        data: {
          name: values.name,
          location: values.location,
          crops: values.cropsString.split(",").map(s => s.trim()).filter(Boolean),
          livestock: values.livestockString.split(",").map(s => s.trim()).filter(Boolean),
          languagePref: values.languagePref,
          isActive: values.isActive,
        }
      });
      queryClient.invalidateQueries({ queryKey: getListFarmersQueryKey() });
      toast({ title: "Profile updated" });
      onOpenChange(false);
    } catch (err) {
      toast({ variant: "destructive", title: "Error", description: "Failed to update profile." });
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Edit Farmer Profile</SheetTitle>
          <SheetDescription>Update information for {phone}</SheetDescription>
        </SheetHeader>
        {isLoading ? (
          <div className="space-y-6 py-6">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl><Input placeholder="E.g. Mashonaland West" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="languagePref"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Language Preference</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select language" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="sn">Shona</SelectItem>
                        <SelectItem value="nd">Ndebele</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="cropsString"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Crops (comma separated)</FormLabel>
                    <FormControl><Input placeholder="Maize, Tobacco, Cotton" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="livestockString"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Livestock (comma separated)</FormLabel>
                    <FormControl><Input placeholder="Cattle, Goats, Poultry" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Active Member</FormLabel>
                      <FormDescription>Toggle off to stop broadcasts</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                <Button type="submit" disabled={updateFarmer.isPending}>Save Changes</Button>
              </div>
            </form>
          </Form>
        )}
      </SheetContent>
    </Sheet>
  );
}

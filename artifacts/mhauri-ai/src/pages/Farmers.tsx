import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListFarmers, getListFarmersQueryKey,
  useGetFarmer, getGetFarmerQueryKey,
  useUpdateFarmer, useDeleteFarmer,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Search, Edit2, Trash2, User, MapPin, Mail, Plus, RefreshCw,
  Users, AtSign, Check, X,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

/* ─── WhatsApp SVG icon ─── */
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

/* ─── Types ─── */
interface ContactEntry {
  id: number | null;
  type: "whatsapp" | "email";
  display: string;
  label: string | null;
  source: string | null;
  createdAt: string;
}

const LANGUAGE_MAP: Record<string, string> = { en: "English", sn: "Shona", nd: "Ndebele" };

const farmerFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  location: z.string().optional().default(""),
  cropsString: z.string().optional().default(""),
  livestockString: z.string().optional().default(""),
  languagePref: z.enum(["en", "sn", "nd"]),
  isActive: z.boolean().default(true),
});
type FarmerFormValues = z.infer<typeof farmerFormSchema>;

/* ─── Contacts hook (direct fetch — no codegen needed) ─── */
function useContacts() {
  const [contacts, setContacts] = useState<ContactEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/contacts");
      if (!res.ok) throw new Error("Failed to load contacts");
      setContacts(await res.json());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  return { contacts, loading, error, refresh };
}

async function addEmailContact(email: string, label?: string) {
  const res = await fetch("/api/contacts/email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, label }),
  });
  if (res.status === 409) throw new Error("Email already registered");
  if (!res.ok) throw new Error("Failed to add email");
  return res.json();
}

/* ─── Main page ─── */
export default function Farmers() {
  const [tab, setTab] = useState<"profiles" | "contacts">("contacts");

  return (
    <div className="h-full overflow-y-auto bg-black">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-md border-b border-[#2F3336] px-6 py-3 flex items-center gap-6">
        <h1 className="text-[20px] font-black text-[#E7E9EA]">Farmers</h1>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setTab("contacts")}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-[14px] font-bold border-b-2 transition-colors ${
              tab === "contacts" ? "text-[#E7E9EA] border-[#22c55e]" : "text-[#71767B] border-transparent hover:text-[#E7E9EA]"
            }`}
          >
            <AtSign className="w-4 h-4" /> Contacts
          </button>
          <button
            onClick={() => setTab("profiles")}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-[14px] font-bold border-b-2 transition-colors ${
              tab === "profiles" ? "text-[#E7E9EA] border-[#22c55e]" : "text-[#71767B] border-transparent hover:text-[#E7E9EA]"
            }`}
          >
            <Users className="w-4 h-4" /> Profiles
          </button>
        </div>
      </div>

      {tab === "contacts" ? <ContactsTab /> : <ProfilesTab />}
    </div>
  );
}

/* ─── Contacts tab ─── */
function ContactsTab() {
  const { contacts, loading, error, refresh } = useContacts();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "whatsapp" | "email">("all");
  const [showAdd, setShowAdd] = useState(false);
  const [addEmail, setAddEmail] = useState("");
  const [addLabel, setAddLabel] = useState("");
  const [adding, setAdding] = useState(false);
  const [addStatus, setAddStatus] = useState<"idle" | "success" | "error">("idle");
  const [addMsg, setAddMsg] = useState("");
  const { toast } = useToast();

  const filtered = contacts.filter((c) => {
    if (filter !== "all" && c.type !== filter) return false;
    if (search && !c.display.toLowerCase().includes(search.toLowerCase()) && !(c.label || "").toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const whatsappCount = contacts.filter((c) => c.type === "whatsapp").length;
  const emailCount = contacts.filter((c) => c.type === "email").length;

  const handleAddEmail = async () => {
    if (!addEmail.trim()) return;
    setAdding(true);
    setAddStatus("idle");
    try {
      await addEmailContact(addEmail.trim(), addLabel.trim() || undefined);
      setAddStatus("success");
      setAddMsg("Email added successfully");
      setAddEmail(""); setAddLabel("");
      setTimeout(() => { setShowAdd(false); setAddStatus("idle"); }, 1500);
      refresh();
    } catch (e) {
      setAddStatus("error");
      setAddMsg(e instanceof Error ? e.message : "Failed to add");
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: "Total Contacts", value: contacts.length, color: "text-[#E7E9EA]", bg: "bg-[#16181C]" },
          { label: "WhatsApp", value: whatsappCount, color: "text-[#25D366]", bg: "bg-[#25D366]/10 border border-[#25D366]/20" },
          { label: "Email", value: emailCount, color: "text-blue-400", bg: "bg-blue-400/10 border border-blue-400/20" },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={`${bg} rounded-2xl px-5 py-4 text-center`}>
            <div className={`text-3xl font-black ${color} tabular-nums`}>{value}</div>
            <div className="text-[12px] text-[#71767B] mt-0.5 font-medium">{label}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 bg-[#16181C] border border-[#2F3336] rounded-full px-4 py-2 flex items-center gap-2">
          <Search className="w-4 h-4 text-[#71767B] shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search contacts…"
            className="bg-transparent text-[14px] text-[#E7E9EA] placeholder:text-[#71767B] focus:outline-none flex-1"
          />
        </div>
        <div className="flex items-center gap-1 bg-[#16181C] border border-[#2F3336] rounded-full p-1">
          {(["all", "whatsapp", "email"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-full text-[12px] font-bold capitalize transition-colors ${
                filter === f ? "bg-[#22c55e] text-white" : "text-[#71767B] hover:text-[#E7E9EA]"
              }`}>
              {f}
            </button>
          ))}
        </div>
        <button onClick={() => setShowAdd((v) => !v)}
          className="flex items-center gap-1.5 bg-[#22c55e] hover:bg-[#16a34a] text-white font-bold text-[13px] px-4 py-2 rounded-full transition-colors">
          <Plus className="w-4 h-4" /> Add Email
        </button>
        <button onClick={refresh} className="p-2 rounded-full border border-[#2F3336] text-[#71767B] hover:text-[#E7E9EA] hover:bg-white/5 transition-colors">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Add email form */}
      {showAdd && (
        <div className="bg-[#16181C] border border-[#2F3336] rounded-2xl p-5 mb-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-full bg-blue-400/10 flex items-center justify-center">
              <Mail className="w-4 h-4 text-blue-400" />
            </div>
            <h3 className="font-bold text-[#E7E9EA] text-[15px]">Add Email Contact</h3>
          </div>
          <div className="flex flex-col gap-3">
            <input
              type="email"
              value={addEmail}
              onChange={(e) => setAddEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddEmail()}
              placeholder="farmer@example.com"
              className="bg-[#202327] border border-[#2F3336] rounded-xl px-4 py-2.5 text-[14px] text-[#E7E9EA] placeholder:text-[#71767B] focus:outline-none focus:border-[#22c55e] transition-colors"
            />
            <input
              type="text"
              value={addLabel}
              onChange={(e) => setAddLabel(e.target.value)}
              placeholder="Label (optional — e.g. Harare Maize Farmer)"
              className="bg-[#202327] border border-[#2F3336] rounded-xl px-4 py-2.5 text-[14px] text-[#E7E9EA] placeholder:text-[#71767B] focus:outline-none focus:border-[#22c55e] transition-colors"
            />
            {addStatus !== "idle" && (
              <div className={`flex items-center gap-2 text-[13px] font-semibold ${addStatus === "success" ? "text-[#22c55e]" : "text-red-400"}`}>
                {addStatus === "success" ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                {addMsg}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowAdd(false)}
                className="px-4 py-2 rounded-full text-[#71767B] text-[13px] hover:bg-white/5 transition-colors">
                Cancel
              </button>
              <button onClick={handleAddEmail} disabled={!addEmail.trim() || adding}
                className="px-5 py-2 bg-[#22c55e] hover:bg-[#16a34a] disabled:opacity-40 text-white font-bold text-[13px] rounded-full transition-colors">
                {adding ? "Adding…" : "Add Contact"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contacts list */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-[#16181C] border border-[#2F3336] rounded-2xl px-5 py-4 flex items-center gap-4 animate-pulse">
              <div className="w-10 h-10 rounded-full bg-white/10 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-white/10 rounded w-1/3" />
                <div className="h-3 bg-white/10 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="bg-red-900/20 border border-red-500/30 rounded-2xl p-6 text-center">
          <p className="text-red-400 font-semibold">{error}</p>
          <button onClick={refresh} className="mt-3 text-[#22c55e] text-[13px] hover:underline">Retry</button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center">
          <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
            <AtSign className="w-7 h-7 text-[#71767B]" />
          </div>
          <p className="text-[#71767B] text-[15px]">
            {search ? `No contacts match "${search}"` : "No contacts yet. WhatsApp users appear here automatically when they message."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((contact, i) => (
            <ContactRow key={`${contact.type}-${contact.display}-${i}`} contact={contact} />
          ))}
        </div>
      )}
    </div>
  );
}

function ContactRow({ contact }: { contact: ContactEntry }) {
  const isWhatsApp = contact.type === "whatsapp";
  return (
    <div className="group bg-[#16181C] border border-[#2F3336] hover:border-[#3F4346] rounded-2xl px-5 py-4 flex items-center gap-4 transition-colors">
      {/* Icon */}
      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
        isWhatsApp ? "bg-[#25D366]/15" : "bg-blue-400/10"
      }`}>
        {isWhatsApp
          ? <WhatsAppIcon className="w-5 h-5 text-[#25D366]" />
          : <Mail className="w-5 h-5 text-blue-400" />
        }
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="font-bold text-[15px] text-[#E7E9EA] tracking-wide font-mono">
            {contact.display}
          </span>
          <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
            isWhatsApp ? "text-[#25D366] bg-[#25D366]/10" : "text-blue-400 bg-blue-400/10"
          }`}>
            {isWhatsApp ? "WhatsApp" : "Email"}
          </span>
          {contact.source === "whatsapp_bot" && (
            <span className="text-[10px] text-[#71767B] bg-white/5 px-1.5 py-0.5 rounded">bot</span>
          )}
          {contact.source === "web_conversation" && (
            <span className="text-[10px] text-[#71767B] bg-white/5 px-1.5 py-0.5 rounded">web</span>
          )}
        </div>
        {contact.label && (
          <p className="text-[12px] text-[#71767B] truncate">{contact.label}</p>
        )}
      </div>

      {/* Date */}
      <div className="text-right shrink-0">
        <p className="text-[12px] text-[#71767B]">
          {formatDistanceToNow(new Date(contact.createdAt), { addSuffix: true })}
        </p>
        <p className="text-[11px] text-[#3F4346]">
          {format(new Date(contact.createdAt), "dd MMM yyyy")}
        </p>
      </div>
    </div>
  );
}

/* ─── Profiles tab (existing) ─── */
function ProfilesTab() {
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
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Failed to delete farmer." });
    } finally {
      setDeletingPhone(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Filters */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1 bg-[#16181C] border border-[#2F3336] rounded-full px-4 py-2 flex items-center gap-2 max-w-sm">
          <Search className="w-4 h-4 text-[#71767B] shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, phone, or location…"
            className="bg-transparent text-[14px] text-[#E7E9EA] placeholder:text-[#71767B] focus:outline-none flex-1"
          />
        </div>
        <div className="flex items-center gap-1 bg-[#16181C] border border-[#2F3336] rounded-full p-1">
          {(["all", "active", "inactive"] as const).map((f) => (
            <button key={f} onClick={() => setActiveFilter(f)}
              className={`px-3 py-1 rounded-full text-[12px] font-bold capitalize transition-colors ${
                activeFilter === f ? "bg-[#22c55e] text-white" : "text-[#71767B] hover:text-[#E7E9EA]"
              }`}>
              {f}
            </button>
          ))}
        </div>
        <span className="text-[12px] text-[#71767B]">{farmers?.length || 0} profiles</span>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-[#16181C] border border-[#2F3336] rounded-2xl p-5 animate-pulse space-y-3">
              <div className="h-4 bg-white/10 rounded w-3/4" />
              <div className="h-3 bg-white/10 rounded w-1/2" />
              <div className="h-3 bg-white/10 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : !farmers?.length ? (
        <div className="py-20 text-center border border-[#2F3336] rounded-2xl">
          <User className="w-12 h-12 text-[#71767B] mx-auto mb-4" />
          <h3 className="text-[#E7E9EA] font-bold text-[17px] mb-1">No farmer profiles</h3>
          <p className="text-[#71767B] text-[14px]">Profiles are created automatically when farmers message via WhatsApp.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {farmers.map((farmer) => (
            <div key={farmer.phone}
              className={`bg-[#16181C] border rounded-2xl p-5 flex flex-col gap-3 transition-colors ${
                farmer.isActive ? "border-[#2F3336] hover:border-[#22c55e]/30" : "border-[#2F3336] opacity-50"
              }`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-bold text-[15px] text-[#E7E9EA]">{farmer.name || "Unknown"}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <WhatsAppIcon className="w-3.5 h-3.5 text-[#25D366]" />
                    <p className="text-[12px] text-[#71767B] font-mono">{farmer.phone}</p>
                  </div>
                </div>
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                  farmer.isActive ? "bg-[#22c55e]/15 text-[#22c55e]" : "bg-white/5 text-[#71767B]"
                }`}>
                  {farmer.isActive ? "Active" : "Inactive"}
                </span>
              </div>

              <div className="space-y-1.5">
                {farmer.location && (
                  <div className="flex items-center gap-1.5 text-[12px] text-[#71767B]">
                    <MapPin className="w-3 h-3" /> {farmer.location}
                  </div>
                )}
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-[10px] bg-white/5 text-[#71767B] px-2 py-0.5 rounded-full">
                    {LANGUAGE_MAP[farmer.languagePref] || farmer.languagePref}
                  </span>
                  {(farmer.crops?.length || 0) > 0 && (
                    <span className="text-[10px] bg-[#22c55e]/10 text-[#22c55e] px-2 py-0.5 rounded-full">
                      {farmer.crops!.length} Crops
                    </span>
                  )}
                  {(farmer.livestock?.length || 0) > 0 && (
                    <span className="text-[10px] bg-orange-400/10 text-orange-400 px-2 py-0.5 rounded-full">
                      {farmer.livestock!.length} Livestock
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[#2F3336] mt-auto">
                <p className="text-[11px] text-[#71767B]">
                  {farmer.lastSeen ? `${formatDistanceToNow(new Date(farmer.lastSeen), { addSuffix: true })}` : "Never seen"}
                </p>
                <div className="flex gap-1">
                  <button onClick={() => setEditingPhone(farmer.phone)}
                    className="p-1.5 rounded-full text-[#71767B] hover:text-[#E7E9EA] hover:bg-white/5 transition-colors">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setDeletingPhone(farmer.phone)}
                    className="p-1.5 rounded-full text-[#71767B] hover:text-red-400 hover:bg-red-400/10 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <FarmerEditSheet phone={editingPhone} open={!!editingPhone} onOpenChange={(o) => !o && setEditingPhone(null)} />
      <AlertDialog open={!!deletingPhone} onOpenChange={(o) => !o && setDeletingPhone(null)}>
        <AlertDialogContent className="bg-[#16181C] border border-[#2F3336] text-[#E7E9EA]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#E7E9EA]">Delete Farmer Profile</AlertDialogTitle>
            <AlertDialogDescription className="text-[#71767B]">
              This removes the profile. Conversations are kept but the profile resets if they message again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border border-[#2F3336] text-[#E7E9EA] hover:bg-white/10">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600 text-white border-0">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function FarmerEditSheet({ phone, open, onOpenChange }: { phone: string | null; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { data: farmer, isLoading } = useGetFarmer(phone as string, {
    query: { enabled: !!phone && open, queryKey: getGetFarmerQueryKey(phone as string) }
  });
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const updateFarmer = useUpdateFarmer();
  const form = useForm<FarmerFormValues>({
    resolver: zodResolver(farmerFormSchema),
    defaultValues: { name: "", location: "", cropsString: "", livestockString: "", languagePref: "en", isActive: true },
  });

  useEffect(() => {
    if (farmer) form.reset({
      name: farmer.name || "",
      location: farmer.location || "",
      cropsString: farmer.crops?.join(", ") || "",
      livestockString: farmer.livestock?.join(", ") || "",
      languagePref: (farmer.languagePref as any) || "en",
      isActive: farmer.isActive,
    });
  }, [farmer, form]);

  const onSubmit = async (values: FarmerFormValues) => {
    if (!phone) return;
    try {
      await updateFarmer.mutateAsync({ phone, data: {
        name: values.name,
        location: values.location,
        crops: values.cropsString.split(",").map((s) => s.trim()).filter(Boolean),
        livestock: values.livestockString.split(",").map((s) => s.trim()).filter(Boolean),
        languagePref: values.languagePref,
        isActive: values.isActive,
      }});
      queryClient.invalidateQueries({ queryKey: getListFarmersQueryKey() });
      toast({ title: "Profile updated" });
      onOpenChange(false);
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Failed to update profile." });
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md bg-[#16181C] border-l border-[#2F3336] text-[#E7E9EA]">
        <SheetHeader>
          <SheetTitle className="text-[#E7E9EA]">Edit Farmer Profile</SheetTitle>
          <SheetDescription className="text-[#71767B]">Update information for {phone}</SheetDescription>
        </SheetHeader>
        {isLoading ? (
          <div className="space-y-6 py-6">
            {[1,2,3].map((i) => <Skeleton key={i} className="h-10 w-full bg-white/10" />)}
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 py-6">
              {[
                { name: "name" as const, label: "Full Name", placeholder: "Tendai Moyo" },
                { name: "location" as const, label: "Location", placeholder: "Mashonaland West" },
                { name: "cropsString" as const, label: "Crops (comma separated)", placeholder: "Maize, Tobacco, Cotton" },
                { name: "livestockString" as const, label: "Livestock (comma separated)", placeholder: "Cattle, Goats, Poultry" },
              ].map(({ name, label, placeholder }) => (
                <FormField key={name} control={form.control} name={name} render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[#E7E9EA]">{label}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder={placeholder} className="bg-[#202327] border-[#2F3336] text-[#E7E9EA] placeholder:text-[#71767B] focus-visible:ring-[#22c55e]" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              ))}
              <FormField control={form.control} name="languagePref" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[#E7E9EA]">Language</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-[#202327] border-[#2F3336] text-[#E7E9EA]">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-[#16181C] border-[#2F3336]">
                      <SelectItem value="en" className="text-[#E7E9EA]">English</SelectItem>
                      <SelectItem value="sn" className="text-[#E7E9EA]">Shona</SelectItem>
                      <SelectItem value="nd" className="text-[#E7E9EA]">Ndebele</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
              <FormField control={form.control} name="isActive" render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-xl border border-[#2F3336] p-3">
                  <div>
                    <FormLabel className="text-[#E7E9EA]">Active Member</FormLabel>
                    <FormDescription className="text-[#71767B] text-[12px]">Toggle off to stop broadcasts</FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} className="data-[state=checked]:bg-[#22c55e]" />
                  </FormControl>
                </FormItem>
              )} />
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}
                  className="border-[#2F3336] text-[#E7E9EA] bg-transparent hover:bg-white/10">Cancel</Button>
                <Button type="submit" disabled={updateFarmer.isPending}
                  className="bg-[#22c55e] hover:bg-[#16a34a] text-white">Save Changes</Button>
              </div>
            </form>
          </Form>
        )}
      </SheetContent>
    </Sheet>
  );
}

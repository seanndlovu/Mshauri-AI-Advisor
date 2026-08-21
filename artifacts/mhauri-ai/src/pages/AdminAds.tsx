import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, AlertCircle, Loader2, Edit2, Trash2, Check, X,
  ExternalLink, Play, Pause, Info, Megaphone, Upload, Archive
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

// --- Types ---
type AdStatus = 'draft' | 'active' | 'paused' | 'expired';
type AdPlacement = 'sidebar_square';

interface Ad {
  id: number;
  name: string;
  advertiserName: string;
  targetUrl: string;
  imageUrl: string;
  altText: string;
  placement: AdPlacement;
  status: AdStatus;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
}

// --- API Wrapper ---
const api = {
  getAds: async () => {
    const res = await fetch('/api/admin/ads', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch ads');
    return res.json();
  },
  createAd: async (data: Partial<Ad>) => {
    const res = await fetch('/api/admin/ads', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || err.error || 'Failed to create campaign');
    }
    return res.json();
  },
  uploadCreative: async (file: File) => {
    const data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
      reader.onerror = () => reject(new Error("The advert image could not be read."));
      reader.readAsDataURL(file);
    });
    const res = await fetch("/api/admin/ads/upload", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileName: file.name, contentType: file.type, data }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || err.error || "Failed to upload advert");
    }
    return res.json() as Promise<{ imageUrl: string }>;
  },
  updateAd: async (id: number, data: Partial<Ad>) => {
    const res = await fetch(`/api/admin/ads/${id}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || err.error || 'Failed to update campaign');
    }
    return res.json();
  },
  deleteAd: async (id: number) => {
    const res = await fetch(`/api/admin/ads/${id}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || err.error || 'Failed to delete campaign');
    }
    return true;
  }
};

// --- Helpers ---
function formatDate(dateStr: string | null) {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

// --- Shared UI Components ---
function Modal({ title, onClose, children, maxWidth = 'max-w-md' }: { title: string; onClose: () => void; children: React.ReactNode; maxWidth?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className={`bg-card w-full ${maxWidth} rounded-2xl shadow-2xl border border-border overflow-hidden animate-slide-up flex flex-col max-h-[90vh]`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-secondary/20">
          <h3 className="text-lg font-bold text-foreground">{title}</h3>
          <button onClick={onClose} className="p-2 -mr-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-secondary/80 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
      <p className="text-sm font-medium text-muted-foreground">Loading Ads Desk...</p>
    </div>
  );
}

function NoAccessScreen() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
        <AlertCircle className="w-8 h-8 text-red-500" />
      </div>
      <h2 className="text-2xl font-bold text-foreground mb-2">Access Restricted</h2>
      <p className="text-muted-foreground max-w-md">
        You do not have the required permissions to view the Ads Desk. Please contact an administrator if you believe this is a mistake.
      </p>
    </div>
  );
}

// --- Views ---
function AdModal({ ad, onClose, onSuccess }: { ad: Ad | null; onClose: () => void; onSuccess: () => void }) {
  const [data, setData] = useState({
    name: ad?.name || '',
    advertiserName: ad?.advertiserName || '',
    targetUrl: ad?.targetUrl || '',
    imageUrl: ad?.imageUrl || '',
    altText: ad?.altText || '',
    status: ad?.status || 'draft',
    startDate: ad?.startDate ? ad.startDate.split('T')[0] : '',
    endDate: ad?.endDate ? ad.endDate.split('T')[0] : '',
  });
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const payload = {
        ...data,
        placement: 'sidebar_square',
        startDate: data.startDate || null,
        endDate: data.endDate || null,
      };
      if (ad) {
        await api.updateAd(ad.id, payload as Partial<Ad>);
      } else {
        await api.createAd(payload as Partial<Ad>);
      }
      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("Advert images must be smaller than 5 MB.");
      return;
    }
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setError("Upload a PNG, JPEG, or WebP image.");
      return;
    }
    setUploading(true);
    setError("");
    try {
      const uploaded = await api.uploadCreative(file);
      setData((current) => ({ ...current, imageUrl: uploaded.imageUrl }));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal title={ad ? 'Edit Campaign' : 'New Campaign'} onClose={onClose} maxWidth="max-w-2xl">
      <form onSubmit={submit} className="space-y-6">
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm rounded-lg flex gap-2 items-start">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}
        
        <div className="p-4 bg-blue-500/10 rounded-xl border border-blue-500/20 text-blue-800 dark:text-blue-300">
          <p className="text-xs font-medium flex gap-2">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <span>Upload a square image below. Preferred dimensions are <strong>250 × 250 px</strong> (renders at 217 × 217 px). 217 × 192 is intentionally not supported.</span>
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-wider">Campaign Name *</label>
            <input required value={data.name} onChange={e=>setData({...data, name: e.target.value})} className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all font-medium text-foreground" placeholder="e.g. Q3 Seed Promo" />
          </div>
          
          <div>
            <label className="block text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-wider">Advertiser Name *</label>
            <input required value={data.advertiserName} onChange={e=>setData({...data, advertiserName: e.target.value})} className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all font-medium text-foreground" placeholder="e.g. AgriCorp" />
          </div>
          
          <div>
            <label className="block text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-wider">Status</label>
            <select value={data.status} onChange={e=>setData({...data, status: e.target.value as AdStatus})} className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all font-medium text-foreground appearance-none">
              <option value="draft">Draft</option>
               <option value="active">Published</option>
              <option value="paused">Paused</option>
               <option value="expired">Expired</option>
            </select>
          </div>

           <div>
             <label className="block text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-wider">Placement</label>
             <select value="sidebar_square" disabled className="w-full bg-secondary/30 border border-border rounded-xl px-4 py-2.5 text-sm text-foreground font-medium appearance-none cursor-not-allowed">
               <option value="sidebar_square">Sidebar Sponsored · 217 × 217</option>
             </select>
             <p className="text-[11px] text-muted-foreground mt-1.5">The current approved placement for square creatives.</p>
           </div>

          <div className="md:col-span-2">
             <label className="block text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-wider">Advert creative *</label>
             <div className="flex flex-col sm:flex-row gap-3">
               <label className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-primary/40 bg-primary/5 text-primary text-sm font-bold cursor-pointer hover:bg-primary/10 transition-colors ${uploading ? "opacity-60 pointer-events-none" : ""}`}>
                 {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                 {uploading ? "Uploading…" : "Upload advert"}
                 <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(event) => handleUpload(event.target.files?.[0])} />
               </label>
               <input type="url" value={data.imageUrl.startsWith("/api/") ? "" : data.imageUrl} onChange={e=>setData({...data, imageUrl: e.target.value})} className="flex-1 bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all font-medium text-foreground" placeholder="Or paste a hosted image URL" />
             </div>
             <p className="text-[11px] text-muted-foreground mt-2">PNG, JPEG, or WebP · maximum 5 MB · upload is stored with this campaign.</p>
          </div>

          {data.imageUrl && (
            <div className="md:col-span-2 flex flex-col items-center p-6 border border-dashed border-border rounded-xl bg-secondary/10 mt-2">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-3">Preview (217 × 217 slot)</span>
              <div className="relative w-[217px] h-[217px] bg-background border border-border shadow-sm flex items-center justify-center overflow-hidden">
                <img 
                  src={data.imageUrl} 
                  alt="Creative Preview" 
                  className="max-w-full max-h-full object-contain" 
                  onError={(e) => { 
                    (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiNlMGUwZTAiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTQiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIiBmaWxsPSIjOTk5Ij5JbWFnZSBOb3QgRm91bmQ8L3RleHQ+PC9zdmc+'
                  }} 
                />
              </div>
            </div>
          )}

          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-wider">Target Destination URL *</label>
            <input required type="url" value={data.targetUrl} onChange={e=>setData({...data, targetUrl: e.target.value})} className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all font-medium text-foreground" placeholder="https://agricorp.com/promo" />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-wider">Alt Text (Accessibility) *</label>
            <input required value={data.altText} onChange={e=>setData({...data, altText: e.target.value})} className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all font-medium text-foreground" placeholder="Describe the image context..." />
          </div>

          <div>
            <label className="block text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-wider">Start Date</label>
            <input type="date" value={data.startDate} onChange={e=>setData({...data, startDate: e.target.value})} className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all font-medium text-foreground" />
          </div>

          <div>
            <label className="block text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-wider">End Date</label>
            <input type="date" value={data.endDate} onChange={e=>setData({...data, endDate: e.target.value})} className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all font-medium text-foreground" />
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-border">
          <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-muted-foreground hover:text-foreground mr-2 transition-colors">Cancel</button>
          <button type="submit" disabled={loading} className="px-6 py-2.5 bg-primary text-primary-foreground text-sm font-bold rounded-full hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {ad ? 'Save Changes' : 'Create Campaign'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function AdsDesk() {
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | AdStatus>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAd, setEditingAd] = useState<Ad | null>(null);

  const loadAds = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getAds();
      setAds(data.ads || []);
      setError('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAds();
  }, [loadAds]);

  const updateStatus = async (id: number, newStatus: AdStatus) => {
    try {
      await api.updateAd(id, { status: newStatus });
      loadAds();
    } catch (err: any) {
      alert(`Failed to update status: ${err.message}`);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this campaign? This action cannot be undone.')) return;
    try {
      await api.deleteAd(id);
      loadAds();
    } catch (err: any) {
      alert(`Failed to delete campaign: ${err.message}`);
    }
  };

  const filteredAds = ads.filter(ad => filter === 'all' || ad.status === filter);

  if (loading) return <LoadingScreen />;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 pb-24 animate-fade-in">
      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl flex items-center gap-3 font-medium">
          <AlertCircle className="w-5 h-5 shrink-0" />
          {error}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground flex items-center gap-3">
            <Megaphone className="w-8 h-8 text-primary" />
            Ads Desk
          </h1>
          <p className="text-muted-foreground mt-1.5 font-medium">Manage sidebar display campaigns.</p>
        </div>
        <button onClick={() => { setEditingAd(null); setModalOpen(true); }} className="flex items-center justify-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-full font-bold hover:opacity-90 transition-opacity shadow-sm w-full sm:w-auto">
          <Plus className="w-5 h-5" />
          New Campaign
        </button>
      </div>

      <div className="mb-8 p-5 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex flex-col sm:flex-row items-start gap-4">
        <div className="p-2 bg-blue-500/20 rounded-full shrink-0">
          <Info className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-blue-800 dark:text-blue-300 mb-1">Creative Requirements & Specifications</h3>
          <p className="text-sm text-blue-700/90 dark:text-blue-300/90 leading-relaxed font-medium">
            Preferred source creative is <strong>250 × 250 px (square)</strong>. The sidebar display slot renders at exactly <strong>217 × 217 px</strong>. 
            Please note that <strong>217 × 192</strong> is intentionally not supported because it is non-standard and causes cropping or letterboxing.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 border-b border-border mb-6">
        {(['all', 'active', 'paused', 'draft', 'expired'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors ${filter === f ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'}`}>
            {f === 'all' ? 'All Campaigns' : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {filteredAds.length === 0 ? (
        <div className="p-16 flex flex-col items-center justify-center text-center border border-dashed border-border rounded-2xl bg-secondary/10">
          <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mb-5">
            <Megaphone className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-bold text-foreground mb-2">No campaigns found</h3>
          <p className="text-muted-foreground max-w-sm mb-6">There are no advertising campaigns matching this view. Create a new campaign to get started.</p>
          {filter === 'all' && (
            <button onClick={() => { setEditingAd(null); setModalOpen(true); }} className="flex items-center gap-2 bg-secondary text-foreground border border-border px-6 py-2.5 rounded-full font-bold hover:bg-secondary/80 transition-colors">
              <Plus className="w-4 h-4" />
              Create Campaign
            </button>
          )}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="bg-secondary/40 text-muted-foreground uppercase tracking-wider text-[11px] font-black">
                <tr>
                  <th className="px-6 py-4 w-20">Creative</th>
                  <th className="px-6 py-4">Campaign</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Destination</th>
                  <th className="px-6 py-4">Duration</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredAds.map(ad => (
                  <tr key={ad.id} className="hover:bg-secondary/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="w-12 h-12 rounded bg-secondary overflow-hidden border border-border shrink-0 flex items-center justify-center">
                        <img 
                          src={ad.imageUrl} 
                          alt={ad.altText} 
                          className="max-w-full max-h-full object-cover" 
                          onError={(e) => { 
                            (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiNlMGUwZTAiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIiBmaWxsPSIjOTk5Ij5FcnI8L3RleHQ+PC9zdmc+'
                          }} 
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-foreground">{ad.name}</div>
                      <div className="text-xs text-muted-foreground font-medium mt-0.5">{ad.advertiserName}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-black border uppercase tracking-wider ${
                        ad.status === 'active' ? 'bg-primary/10 text-primary border-primary/20' :
                        ad.status === 'paused' ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 border-yellow-500/20' :
                        ad.status === 'expired' ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20' :
                        'bg-muted/50 text-muted-foreground border-border'
                      }`}>
                        {ad.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground font-medium text-sm">
                      <a href={ad.targetUrl} target="_blank" rel="noreferrer" className="hover:text-primary transition-colors flex items-center gap-1.5 max-w-[150px] truncate" title={ad.targetUrl}>
                        {ad.targetUrl} <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground font-medium text-sm">
                      {ad.startDate ? formatDate(ad.startDate) : '-'} <span className="mx-1 opacity-50">to</span> {ad.endDate ? formatDate(ad.endDate) : '-'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {ad.status === 'active' ? (
                          <button onClick={() => updateStatus(ad.id, 'paused')} title="Pause Campaign" className="p-2 text-muted-foreground hover:text-yellow-600 hover:bg-yellow-500/10 rounded-full transition-colors">
                            <Pause className="w-4 h-4" />
                          </button>
                        ) : (
                          <button onClick={() => updateStatus(ad.id, 'active')} title="Publish Campaign" className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-full transition-colors">
                            <Play className="w-4 h-4" />
                          </button>
                        )}
                        {ad.status !== 'expired' && (
                          <button onClick={() => updateStatus(ad.id, 'expired')} title="Expire Campaign" className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-full transition-colors">
                            <Archive className="w-4 h-4" />
                          </button>
                        )}
                        <button onClick={() => { setEditingAd(ad); setModalOpen(true); }} title="Edit Campaign" className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-full transition-colors">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(ad.id)} title="Delete Campaign" className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-full transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modalOpen && (
        <AdModal 
          ad={editingAd} 
          onClose={() => setModalOpen(false)} 
          onSuccess={() => { setModalOpen(false); loadAds(); }} 
        />
      )}
    </div>
  );
}

export default function AdminAds() {
  const { user, loading: authLoading } = useAuth();

  if (authLoading) return <LoadingScreen />;

  if (!user || (user.adminRole !== 'owner' && user.adminRole !== 'ad_manager')) {
    return <NoAccessScreen />;
  }

  return <AdsDesk />;
}

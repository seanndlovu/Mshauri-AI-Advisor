import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, ArrowLeft, Send, Copy, Trash2, Edit2, AlertCircle, Loader2,
  Calendar, List, BarChart2, Check, X, FileText, Download, ChevronRight
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

// --- Types ---
type BatchStatus = 'draft' | 'published' | 'archived';

interface Batch {
  id: number;
  name: string;
  source: string;
  observedDate: string;
  status: BatchStatus;
  entryCount: number;
  createdAt: string;
  publishedAt?: string;
}

interface Entry {
  id: number;
  commodity: string;
  grade: string;
  unit: string;
  market: string;
  priceUsd: string | null;
  priceZig: string | null;
  observedDate: string;
  source: string;
  notes: string;
}

// --- API Wrapper ---
const api = {
  getBatches: async () => {
    const res = await fetch('/api/admin/market-price-batches', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch batches');
    return res.json();
  },
  getBatch: async (id: number) => {
    const res = await fetch(`/api/admin/market-price-batches/${id}`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch batch details');
    return res.json();
  },
  createBatch: async (data: any) => {
    const res = await fetch('/api/admin/market-price-batches', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || err.error || 'Failed to create batch');
    }
    return res.json();
  },
  addEntry: async (id: number, data: any) => {
    const res = await fetch(`/api/admin/market-price-batches/${id}/entries`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to add entry');
    return res.json();
  },
  updateEntry: async (id: number, entryId: number, data: any) => {
    const res = await fetch(`/api/admin/market-price-batches/${id}/entries/${entryId}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to update entry');
    return res.json();
  },
  deleteEntry: async (id: number, entryId: number) => {
    const res = await fetch(`/api/admin/market-price-batches/${id}/entries/${entryId}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    if (!res.ok) throw new Error('Failed to delete entry');
    return true;
  },
  publishBatch: async (id: number) => {
    const res = await fetch(`/api/admin/market-price-batches/${id}/publish`, {
      method: 'POST',
      credentials: 'include'
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || err.error || 'Failed to publish batch');
    }
    return res.json();
  },
  duplicateBatch: async (id: number) => {
    const res = await fetch(`/api/admin/market-price-batches/${id}/duplicate`, {
      method: 'POST',
      credentials: 'include'
    });
    if (!res.ok) throw new Error('Failed to duplicate batch');
    return res.json();
  }
};

// --- Helpers ---
function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const res = reader.result as string;
      resolve(res.split(',')[1]); 
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function formatDate(dateStr: string) {
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
      <p className="text-sm font-medium text-muted-foreground">Loading Market Price Desk...</p>
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
        You do not have the required permissions to view the Market Price Desk. Please contact an administrator if you believe this is a mistake.
      </p>
    </div>
  );
}

// --- Main Views ---

function CreateModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: (id: number, errors: any[]) => void }) {
  const [name, setName] = useState('');
  const [source, setSource] = useState('Mbare Musika');
  const [observedDate, setObservedDate] = useState(new Date().toISOString().split('T')[0]);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      let fileData;
      let fileName;
      if (file) {
        fileData = await readFileAsBase64(file);
        fileName = file.name;
      }
      const res = await api.createBatch({ name, source, observedDate, fileData, fileName });
      if (res.batch) {
        onSuccess(res.batch.id, res.errors || []);
      } else if (res.errors && res.errors.length > 0) {
        setError(`Validation failed: ${res.errors[0].error || 'Check file format'}`);
      } else {
        setError('Failed to create edition. Please check your inputs.');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title="New Price Edition" onClose={onClose} maxWidth="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm rounded-lg flex gap-2 items-start">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-wider">Edition Name *</label>
            <input required value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Week 42 Prices" className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all font-medium text-foreground" />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-wider">Source *</label>
              <input required value={source} onChange={e=>setSource(e.target.value)} className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all font-medium text-foreground" />
            </div>
            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-wider">Date Observed *</label>
              <input type="date" required value={observedDate} onChange={e=>setObservedDate(e.target.value)} className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all font-medium text-foreground" />
            </div>
          </div>
        </div>

        <div className="p-5 border border-dashed border-border rounded-xl bg-secondary/20">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h4 className="text-sm font-bold text-foreground">Import spreadsheet (Optional)</h4>
              <p className="text-xs text-muted-foreground mt-0.5">Upload a filled price template to auto-populate entries.</p>
            </div>
            <a href="/api/admin/market-price-template" download className="text-[11px] font-bold text-primary hover:text-primary/80 transition-colors flex items-center gap-1.5 bg-primary/10 px-2.5 py-1 rounded-full">
              <Download className="w-3 h-3" /> Template
            </a>
          </div>
          <input type="file" accept=".csv,.xlsx" onChange={e => setFile(e.target.files?.[0] || null)} className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-secondary file:text-foreground hover:file:bg-secondary/80 transition-all cursor-pointer border border-border rounded-full p-1 bg-background" />
        </div>

        <div className="flex justify-end pt-2">
          <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-muted-foreground hover:text-foreground mr-2 transition-colors">Cancel</button>
          <button type="submit" disabled={loading} className="px-6 py-2.5 bg-primary text-primary-foreground text-sm font-bold rounded-full hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Create Edition
          </button>
        </div>
      </form>
    </Modal>
  );
}

function EntryModal({ batchId, entry, onClose, onSuccess }: { batchId: number; entry: Entry | null; onClose: () => void; onSuccess: () => void }) {
  const [data, setData] = useState({
    commodity: entry?.commodity || '',
    grade: entry?.grade || '',
    unit: entry?.unit || '',
    market: entry?.market || 'Mbare Musika',
    priceUsd: entry?.priceUsd || '',
    priceZig: entry?.priceZig || '',
    notes: entry?.notes || ''
  });
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...data,
        priceUsd: data.priceUsd || null,
        priceZig: data.priceZig || null
      };
      if (entry) {
        await api.updateEntry(batchId, entry.id, payload);
      } else {
        await api.addEntry(batchId, payload);
      }
      onSuccess();
    } catch (err: any) {
      alert(`Failed to save entry: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title={entry ? "Edit Price Entry" : "Add Price Entry"} onClose={onClose} maxWidth="max-w-lg">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-wider">Commodity *</label>
            <input required value={data.commodity} onChange={e=>setData({...data, commodity: e.target.value})} className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-foreground font-medium" placeholder="e.g. Maize" />
          </div>
          <div>
            <label className="block text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-wider">Grade</label>
            <input value={data.grade} onChange={e=>setData({...data, grade: e.target.value})} className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-foreground font-medium" placeholder="e.g. Grade A" />
          </div>
          <div>
            <label className="block text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-wider">Unit *</label>
            <input required value={data.unit} onChange={e=>setData({...data, unit: e.target.value})} className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-foreground font-medium" placeholder="e.g. 20kg Bucket" />
          </div>
          <div>
            <label className="block text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-wider">Market *</label>
            <input required value={data.market} onChange={e=>setData({...data, market: e.target.value})} className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-foreground font-medium" placeholder="e.g. Mbare Musika" />
          </div>
          <div>
            <label className="block text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-wider">Price (USD)</label>
            <input type="number" step="0.01" min="0" value={data.priceUsd} onChange={e=>setData({...data, priceUsd: e.target.value})} className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-foreground font-medium" placeholder="0.00" />
          </div>
          <div>
            <label className="block text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-wider">Price (ZiG)</label>
            <input type="number" step="0.01" min="0" value={data.priceZig} onChange={e=>setData({...data, priceZig: e.target.value})} className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-foreground font-medium" placeholder="Optional" />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-wider">Notes</label>
            <input value={data.notes} onChange={e=>setData({...data, notes: e.target.value})} className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-foreground font-medium" placeholder="Trend context, supply notes..." />
          </div>
        </div>
        <div className="flex justify-end pt-4 mt-2">
          <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-muted-foreground hover:text-foreground mr-2 transition-colors">Cancel</button>
          <button type="submit" disabled={loading} className="px-6 py-2.5 bg-primary text-primary-foreground text-sm font-bold rounded-full hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Entry"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function BatchList({ onSelect, onCreated }: { onSelect: (id: number) => void; onCreated: (id: number, errs: any[]) => void }) {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'draft' | 'published'>('all');

  useEffect(() => {
    api.getBatches()
      .then(data => setBatches(data.batches || []))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = batches.filter(b => filter === 'all' || b.status === filter);

  if (loading) return <LoadingScreen />;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 pb-24 animate-fade-in">
      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl flex items-center gap-3 font-medium">
          <AlertCircle className="w-5 h-5 shrink-0" />
          {error}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground flex items-center gap-3">
            <BarChart2 className="w-8 h-8 text-primary" />
            Market Price Desk
          </h1>
          <p className="text-muted-foreground mt-1.5 font-medium">Publish and manage agricultural commodity prices.</p>
        </div>
        <button onClick={() => setCreateOpen(true)} className="flex items-center justify-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-full font-bold hover:opacity-90 transition-opacity shadow-sm w-full sm:w-auto">
          <Plus className="w-5 h-5" />
          New Edition
        </button>
      </div>

      <div className="flex items-center gap-2 border-b border-border mb-6">
        {(['all', 'draft', 'published'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors ${filter === f ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'}`}>
             {f === 'all' ? 'All Editions' : f.charAt(0).toUpperCase() + f.slice(1) + 's'}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="p-16 flex flex-col items-center justify-center text-center border border-dashed border-border rounded-2xl bg-secondary/10">
          <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mb-5">
            <FileText className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-bold text-foreground mb-2">No editions found</h3>
          <p className="text-muted-foreground max-w-sm mb-6">There are no price editions matching this view. Create a new edition to start tracking.</p>
          {filter === 'all' && (
            <button onClick={() => setCreateOpen(true)} className="flex items-center gap-2 bg-secondary text-foreground border border-border px-6 py-2.5 rounded-full font-bold hover:bg-secondary/80 transition-colors">
              <Plus className="w-4 h-4" />
              Create Edition
            </button>
          )}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-secondary/40 text-muted-foreground uppercase tracking-wider text-[11px] font-black">
                <tr>
                  <th className="px-6 py-4">Edition Name</th>
                  <th className="px-6 py-4">Observed Date</th>
                  <th className="px-6 py-4">Source</th>
                  <th className="px-6 py-4">Entries</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map(batch => (
                  <tr key={batch.id} className="hover:bg-secondary/30 transition-colors group cursor-pointer" onClick={() => onSelect(batch.id)}>
                    <td className="px-6 py-4 font-bold text-foreground">{batch.name}</td>
                    <td className="px-6 py-4 text-muted-foreground font-medium">{formatDate(batch.observedDate)}</td>
                    <td className="px-6 py-4 text-muted-foreground font-medium">{batch.source}</td>
                    <td className="px-6 py-4 text-muted-foreground font-medium">{batch.entryCount} items</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-black border uppercase tracking-wider ${
                        batch.status === 'published' ? 'bg-primary/10 text-primary border-primary/20' :
                        batch.status === 'archived' ? 'bg-muted/50 text-muted-foreground border-border' :
                        'bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 border-yellow-500/20'
                      }`}>
                        {batch.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="text-primary font-bold inline-flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        Manage <ChevronRight className="w-4 h-4" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {createOpen && <CreateModal onClose={() => setCreateOpen(false)} onSuccess={onCreated} />}
    </div>
  );
}

function BatchDetail({ batchId, uploadErrors, clearUploadErrors, onBack }: { batchId: number; uploadErrors: any[]; clearUploadErrors: () => void; onBack: () => void }) {
  const [batch, setBatch] = useState<Batch | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [entryModalOpen, setEntryModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const [publishOpen, setPublishOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = useCallback(() => {
    setLoading(true);
    api.getBatch(batchId)
      .then(data => {
        setBatch(data.batch);
        setEntries(data.entries || []);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [batchId]);

  useEffect(() => { loadData(); }, [loadData]);

  const handlePublish = async () => {
    setActionLoading(true);
    try {
      await api.publishBatch(batchId);
      setPublishOpen(false);
      loadData();
    } catch(err: any) {
      alert(`Publish failed: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDuplicate = async () => {
    if (!confirm('Duplicate this edition to a new draft?')) return;
    setActionLoading(true);
    try {
      await api.duplicateBatch(batchId);
      onBack(); 
    } catch(err: any) {
      alert(`Duplicate failed: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteEntry = async (entryId: number) => {
    if (!confirm('Delete this price entry?')) return;
    try {
      await api.deleteEntry(batchId, entryId);
      loadData();
    } catch(err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  if (loading) return <LoadingScreen />;
  if (error || !batch) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12 text-center">
        <div className="text-red-500 font-bold mb-4">{error || 'Batch not found'}</div>
        <button onClick={onBack} className="text-primary font-bold hover:underline inline-flex items-center gap-2"><ArrowLeft className="w-4 h-4"/> Go Back</button>
      </div>
    );
  }

  const isDraft = batch.status === 'draft';

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 pb-24 animate-fade-in">
      <button onClick={onBack} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6 text-sm font-bold">
        <ArrowLeft className="w-4 h-4" />
        All Editions
      </button>

      {uploadErrors.length > 0 && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
          <h4 className="text-sm font-bold text-red-600 dark:text-red-400 mb-2 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Import completed with {uploadErrors.length} errors
          </h4>
          <ul className="list-disc list-inside text-xs text-red-600/80 dark:text-red-400/80 ml-4 space-y-1 max-h-32 overflow-y-auto font-medium">
            {uploadErrors.map((err, i) => (
              <li key={i}>Row {err.row}: {err.error}</li>
            ))}
          </ul>
          <button onClick={clearUploadErrors} className="mt-3 text-xs font-bold text-red-600 hover:underline">Dismiss Warnings</button>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8 bg-card border border-border p-6 rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center gap-4 mb-3">
            <h1 className="text-3xl font-black tracking-tight text-foreground">{batch.name}</h1>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-black border uppercase tracking-wider ${
              batch.status === 'published' ? 'bg-primary/10 text-primary border-primary/20' :
              batch.status === 'archived' ? 'bg-muted/50 text-muted-foreground border-border' :
              'bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 border-yellow-500/20'
            }`}>
              {batch.status}
            </span>
          </div>
          <p className="text-muted-foreground flex items-center gap-5 text-sm font-medium">
            <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4 text-primary" /> {formatDate(batch.observedDate)}</span>
            <span className="flex items-center gap-1.5"><List className="w-4 h-4 text-primary" /> {batch.source}</span>
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <button onClick={handleDuplicate} disabled={actionLoading} className="flex-1 md:flex-none items-center justify-center flex gap-2 bg-secondary text-foreground border border-border px-5 py-2.5 rounded-full font-bold hover:bg-secondary/80 transition-colors shadow-sm disabled:opacity-50">
            <Copy className="w-4 h-4" />
            Duplicate
          </button>
          {isDraft && (
            <button onClick={() => setPublishOpen(true)} className="flex-1 md:flex-none items-center justify-center flex gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-full font-bold hover:opacity-90 transition-opacity shadow-sm">
              <Send className="w-4 h-4" />
              Publish
            </button>
          )}
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl shadow-sm flex flex-col overflow-hidden">
        <div className="p-5 border-b border-border flex items-center justify-between bg-secondary/10">
          <h3 className="font-bold text-foreground text-lg flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-primary" />
            Price Entries <span className="text-muted-foreground font-medium text-sm ml-2">({entries.length})</span>
          </h3>
          {isDraft && (
            <button onClick={() => { setEditingEntry(null); setEntryModalOpen(true); }} className="flex items-center gap-1.5 text-sm font-bold text-primary hover:text-primary/80 transition-colors bg-primary/10 px-4 py-2 rounded-full">
              <Plus className="w-4 h-4" /> Add Entry
            </button>
          )}
        </div>
        
        {entries.length === 0 ? (
          <div className="p-16 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-secondary/50 rounded-full flex items-center justify-center mb-4">
              <List className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-xl font-bold text-foreground mb-2">No price data yet</p>
            <p className="text-muted-foreground max-w-sm mb-6 font-medium">This edition is empty. Add entries manually to build out the price sheet.</p>
            {isDraft && (
              <button onClick={() => { setEditingEntry(null); setEntryModalOpen(true); }} className="flex items-center gap-2 text-sm font-bold text-primary border border-primary/30 hover:bg-primary/10 transition-colors px-6 py-2.5 rounded-full">
                <Plus className="w-4 h-4" /> Add First Entry
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-secondary/40 text-muted-foreground uppercase tracking-wider text-[10px] font-black">
                <tr>
                  <th className="px-5 py-4">Commodity</th>
                  <th className="px-5 py-4">Grade</th>
                  <th className="px-5 py-4">Unit</th>
                  <th className="px-5 py-4">Market</th>
                  <th className="px-5 py-4 text-right">USD</th>
                  <th className="px-5 py-4 text-right">ZiG</th>
                  <th className="px-5 py-4">Notes</th>
                  {isDraft && <th className="px-5 py-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {entries.map(entry => (
                  <tr key={entry.id} className="hover:bg-secondary/20 transition-colors group">
                    <td className="px-5 py-3.5 font-bold text-foreground whitespace-nowrap">{entry.commodity}</td>
                    <td className="px-5 py-3.5 text-muted-foreground font-medium whitespace-nowrap">{entry.grade || '-'}</td>
                    <td className="px-5 py-3.5 text-muted-foreground font-medium whitespace-nowrap">{entry.unit || '-'}</td>
                    <td className="px-5 py-3.5 text-muted-foreground font-medium whitespace-nowrap">{entry.market || '-'}</td>
                    <td className="px-5 py-3.5 text-right font-mono font-bold text-primary">{entry.priceUsd ? `$${Number(entry.priceUsd).toFixed(2)}` : '-'}</td>
                    <td className="px-5 py-3.5 text-right font-mono text-muted-foreground">{entry.priceZig ? Number(entry.priceZig).toLocaleString() : '-'}</td>
                    <td className="px-5 py-3.5 text-muted-foreground text-xs max-w-[200px] truncate font-medium" title={entry.notes}>{entry.notes || '-'}</td>
                    {isDraft && (
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => { setEditingEntry(entry); setEntryModalOpen(true); }} className="p-2 text-muted-foreground hover:text-primary transition-colors rounded-lg hover:bg-secondary">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDeleteEntry(entry.id)} className="p-2 text-muted-foreground hover:text-red-500 transition-colors rounded-lg hover:bg-red-500/10">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {entryModalOpen && (
        <EntryModal 
          batchId={batchId} 
          entry={editingEntry} 
          onClose={() => setEntryModalOpen(false)} 
          onSuccess={() => { setEntryModalOpen(false); loadData(); }} 
        />
      )}

      {publishOpen && (
        <Modal title="Publish Edition" onClose={() => setPublishOpen(false)}>
          <div className="py-2">
            <div className="flex items-start gap-3 text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-500/10 p-4 rounded-xl border border-amber-200 dark:border-amber-500/20 mb-6">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="text-sm font-bold">Publishing this edition makes it instantly visible to all farmers across the platform. Verify all prices are correct before proceeding.</p>
            </div>
            <p className="text-sm text-foreground mb-8 font-medium">Are you sure you want to publish <strong>{batch.name}</strong> containing {entries.length} price records?</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setPublishOpen(false)} className="px-5 py-2.5 font-bold text-muted-foreground hover:bg-secondary rounded-full transition-colors">Cancel</button>
              <button onClick={handlePublish} disabled={actionLoading} className="px-6 py-2.5 bg-primary text-primary-foreground font-bold rounded-full hover:opacity-90 transition-opacity flex items-center gap-2">
                {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                Yes, Publish Now
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// --- Main Page Export ---
export default function AdminMarketPrices() {
  const { user, loading: authLoading } = useAuth();
  const [selectedBatchId, setSelectedBatchId] = useState<number | null>(null);
  const [uploadErrors, setUploadErrors] = useState<any[]>([]);

  if (authLoading) return <LoadingScreen />;

  const hasAccess = user && (user.adminRole === 'owner' || user.adminRole === 'price_editor');
  
  if (!hasAccess) {
    return <NoAccessScreen />;
  }

  if (selectedBatchId) {
    return (
      <BatchDetail
        batchId={selectedBatchId}
        uploadErrors={uploadErrors}
        clearUploadErrors={() => setUploadErrors([])}
        onBack={() => {
          setSelectedBatchId(null);
          setUploadErrors([]);
        }}
      />
    );
  }

  return (
    <BatchList
      onSelect={(id) => setSelectedBatchId(id)}
      onCreated={(id, errs) => {
        setUploadErrors(errs || []);
        setSelectedBatchId(id);
      }}
    />
  );
}

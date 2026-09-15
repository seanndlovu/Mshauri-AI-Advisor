import { useState, useEffect, useCallback, useMemo, type FormEvent, type ReactNode } from 'react';
import {
  Shield, AlertCircle, Loader2, Check, X,
  Users, Key, Search, UserMinus, UserCheck, ShieldAlert, History
} from 'lucide-react';
import { useAuth, type AdminRole } from '@/hooks/use-auth';

// --- Types ---
interface StaffUser {
  id: number;
  email: string;
  name: string;
  adminRole: StaffRole;
  createdAt: string;
}

type StaffRole = AdminRole | null;

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

interface BootstrapStatus {
  canBootstrap: boolean;
  setupComplete: boolean;
}

interface StaffList {
  users: StaffUser[];
  currentUserId: number;
}

interface AuditEntry {
  id: number;
  actorUserId: number;
  actorName: string;
  actorEmail: string;
  targetUserId: number;
  targetName: string;
  targetEmail: string;
  previousRole: StaffRole;
  newRole: StaffRole;
  createdAt: string;
}

// --- API Wrapper ---
const api = {
  getBootstrapStatus: async (): Promise<BootstrapStatus> => {
    const res = await fetch('/api/admin/staff/bootstrap-status', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch bootstrap status');
    return res.json();
  },
  bootstrapOwner: async () => {
    const res = await fetch('/api/admin/staff/bootstrap-owner', {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || err.error || 'Failed to initialize owner access');
    }
    return res.json();
  },
  getStaff: async (): Promise<StaffList> => {
    const res = await fetch('/api/admin/staff', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch staff directory');
    return res.json();
  },
  getAuditHistory: async (): Promise<{ entries: AuditEntry[] }> => {
    const res = await fetch('/api/admin/staff/audit-history', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch staff access history');
    return res.json();
  },
  updateStaffRole: async (userId: number, adminRole: StaffRole) => {
    const res = await fetch(`/api/admin/staff/${userId}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminRole })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || err.error || 'Failed to update user role');
    }
    return res.json();
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

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit'
  });
}

function roleLabel(role: StaffRole) {
  if (role === 'owner') return 'Owner';
  if (role === 'price_editor') return 'Market Price Editor';
  if (role === 'ad_manager') return 'Ad Manager';
  return 'No staff access';
}

// --- Shared UI Components ---
function Modal({ title, onClose, children, maxWidth = 'max-w-md' }: { title: string; onClose: () => void; children: ReactNode; maxWidth?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className={`bg-card w-full ${maxWidth} rounded-2xl shadow-2xl border border-border overflow-hidden animate-slide-up flex flex-col max-h-[90vh]`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-secondary/20">
          <h3 className="text-lg font-bold text-foreground">{title}</h3>
          <button onClick={onClose} className="p-2 -mr-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-secondary/80 transition-colors" aria-label="Close modal" data-testid="button-close-role-modal">
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
    <div className="h-full overflow-y-auto flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
      <p className="text-sm font-medium text-muted-foreground">Verifying secure access...</p>
    </div>
  );
}

function NoAccessScreen({ signedIn }: { signedIn: boolean }) {
  return (
    <div className="h-full overflow-y-auto flex flex-col items-center justify-center min-h-[60vh] text-center px-4 animate-fade-in">
      <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-6 border border-red-500/20">
        <ShieldAlert className="w-8 h-8 text-red-500" />
      </div>
      <h2 className="text-2xl font-bold text-foreground mb-2">Restricted Access</h2>
      <p className="text-muted-foreground max-w-md font-medium">
        {signedIn
          ? 'You do not have permission to manage staff access. Please contact a platform Owner if you need administrative privileges.'
          : 'Sign in with your personal Mshauri account to continue.'}
      </p>
    </div>
  );
}

// --- Views ---
function RoleModal({ 
  user, 
  currentUserId,
  onClose, 
  onSuccess 
}: { 
  user: StaffUser; 
  currentUserId: number;
  onClose: () => void; 
  onSuccess: (updatedUser: StaffUser) => void;
}) {
  const [role, setRole] = useState<StaffRole>(user.adminRole);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (
      isSelf
      && role !== 'owner'
      && !window.confirm('Remove your own Owner access? You will immediately lose access to this desk.')
    ) {
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await api.updateStaffRole(user.id, role);
      onSuccess(res.user);
    } catch (err: unknown) {
      setError(errorMessage(err, 'Failed to update user role'));
    } finally {
      setLoading(false);
    }
  };

  const isSelf = user.id === currentUserId;

  return (
    <Modal title="Manage Staff Access" onClose={onClose}>
      <form onSubmit={submit} className="space-y-6">
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm rounded-lg flex gap-2 items-start font-medium" data-testid="error-message">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        <div className="flex items-center gap-4 p-4 border border-border rounded-xl bg-secondary/10">
          <div className="w-12 h-12 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-lg shrink-0">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h4 className="font-bold text-foreground truncate">{user.name}</h4>
            <p className="text-sm text-muted-foreground truncate">{user.email}</p>
          </div>
        </div>

        {isSelf && (
          <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-yellow-800 dark:text-yellow-300 text-sm font-medium flex gap-3">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p>You are editing your own access. Removing your Owner status will immediately revoke your access to this desk.</p>
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-muted-foreground mb-3 uppercase tracking-wider">Assign Role</label>
          <div className="space-y-2">
            {[
              { id: 'owner', label: 'Owner', desc: 'Full access to all administrative desks and staff management.' },
              { id: 'price_editor', label: 'Market Price Editor', desc: 'Can publish and edit market price editions.' },
              { id: 'ad_manager', label: 'Ad Manager', desc: 'Can create and manage sidebar advertising campaigns.' },
              { id: null, label: 'No Staff Access', desc: 'Standard user access only. Removes all admin privileges.' },
            ].map((r) => (
              <label 
                key={r.id || 'none'} 
                className={`flex items-start gap-3 p-4 border rounded-xl cursor-pointer transition-colors ${
                  role === r.id 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border bg-background hover:border-primary/40 hover:bg-secondary/20'
                }`}
              >
                <div className="flex h-5 items-center">
                  <input
                    type="radio"
                    name="adminRole"
                    value={r.id || 'none'}
                    checked={role === r.id}
                    onChange={() => setRole(r.id as StaffRole)}
                    className="h-4 w-4 text-primary border-border focus:ring-primary focus:ring-offset-background"
                    data-testid={`radio-role-${r.id || 'none'}`}
                  />
                </div>
                <div>
                  <div className={`font-bold text-sm ${role === r.id ? 'text-primary' : 'text-foreground'}`}>
                    {r.label}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5 font-medium leading-relaxed">
                    {r.desc}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-border">
          <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-muted-foreground hover:text-foreground mr-2 transition-colors" data-testid="button-cancel-role">
            Cancel
          </button>
          <button 
            type="submit" 
            disabled={loading}
            className="px-6 py-2.5 bg-primary text-primary-foreground text-sm font-bold rounded-full hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
            data-testid="button-save-role"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Save Privileges
          </button>
        </div>
      </form>
    </Modal>
  );
}

function BootstrapView({ onComplete }: { onComplete: () => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleBootstrap = async () => {
    setLoading(true);
    setError('');
    try {
      await api.bootstrapOwner();
      onComplete();
    } catch (err: unknown) {
      setError(errorMessage(err, 'Failed to initialize owner access'));
      setLoading(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto animate-fade-in">
      <div className="max-w-xl mx-auto px-4 py-16">
        <div className="bg-card border border-border p-8 rounded-3xl shadow-xl text-center">
        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-primary/20">
          <Key className="w-10 h-10 text-primary" />
        </div>
        
        <h1 className="text-3xl font-black text-foreground mb-3 tracking-tight">Initialize Mshauri</h1>
        <p className="text-muted-foreground text-base mb-8 max-w-md mx-auto font-medium leading-relaxed">
          Welcome to the administrative initialization. Since there are currently no platform Owners configured, you can claim the first Owner account to begin managing the platform.
        </p>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-xl flex items-center justify-center gap-2 font-medium text-sm text-left">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <button 
          onClick={handleBootstrap} 
          disabled={loading}
          data-testid="button-bootstrap"
          className="w-full sm:w-auto px-8 py-4 bg-primary text-primary-foreground font-black text-lg rounded-full hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 active:shadow-md"
        >
          {loading ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : (
            <Shield className="w-6 h-6" />
          )}
          Claim Owner Access
        </button>

        <p className="text-xs text-muted-foreground mt-8 font-medium">
            This is a one-time operation. Roles never create or reveal passwords; every staff member keeps using their own personal login.
        </p>
        </div>
      </div>
    </div>
  );
}

function StaffDirectory() {
  const [data, setData] = useState<StaffList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<StaffRole | 'all'>('all');
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
  const [auditLoading, setAuditLoading] = useState(true);
  
  const [editingUser, setEditingUser] = useState<StaffUser | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [staff, audit] = await Promise.all([api.getStaff(), api.getAuditHistory()]);
      setData(staff);
      setAuditEntries(audit.entries);
      setError('');
    } catch (err: unknown) {
      setError(errorMessage(err, 'Failed to fetch staff directory'));
    } finally {
      setLoading(false);
      setAuditLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredUsers = useMemo(() => {
    if (!data) return [];
    return data.users.filter(u => {
      const matchesSearch = 
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        u.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRole = filterRole === 'all' || u.adminRole === filterRole || (filterRole === null && !u.adminRole);
      return matchesSearch && matchesRole;
    });
  }, [data, searchQuery, filterRole]);

  const getRoleBadge = (role: StaffRole) => {
    switch (role) {
      case 'owner':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-primary/15 text-primary border border-primary/30"><Shield className="w-3 h-3" /> Owner</span>;
      case 'price_editor':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30">Price Editor</span>;
      case 'ad_manager':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30">Ad Manager</span>;
      default:
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-muted/50 text-muted-foreground border border-border">No Access</span>;
    }
  };

  if (loading && !data) return <LoadingScreen />;

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto px-4 py-8 pb-24 animate-fade-in">
      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl flex items-center gap-3 font-medium">
          <AlertCircle className="w-5 h-5 shrink-0" />
          {error}
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground flex items-center gap-3">
            <Users className="w-8 h-8 text-primary" />
            Staff Access Desk
          </h1>
          <p className="text-muted-foreground mt-2 font-medium max-w-xl leading-relaxed">
            Manage platform permissions. Staff use their personal Mshauri accounts; roles grant them access to specific administrative areas without requiring separate credentials.
          </p>
        </div>
        
        <div className="p-4 bg-primary/5 border border-primary/20 rounded-2xl flex items-start gap-3 md:max-w-xs shrink-0">
          <Shield className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold text-foreground">Secure Delegation</h4>
            <p className="text-xs text-muted-foreground mt-1 font-medium leading-relaxed">Ensure deliberate access control. Only assign privileges to trusted operational personnel.</p>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden flex flex-col">
        <div className="p-5 border-b border-border bg-secondary/10 flex flex-col sm:flex-row items-center gap-4">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search by name or email..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-background border border-border rounded-full pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all font-medium text-foreground"
              data-testid="input-search-staff"
            />
          </div>
          <div className="w-full sm:w-48 shrink-0">
            <select 
              value={filterRole === null ? 'none' : filterRole}
              onChange={(e) => setFilterRole(e.target.value === 'none' ? null : e.target.value as AdminRole | 'all')}
              className="w-full bg-background border border-border rounded-full px-4 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all font-medium text-foreground appearance-none cursor-pointer"
              data-testid="select-staff-role-filter"
            >
              <option value="all">All Roles</option>
              <option value="owner">Owners</option>
              <option value="price_editor">Market Editors</option>
              <option value="ad_manager">Ad Managers</option>
              <option value="none">No Access</option>
            </select>
          </div>
        </div>

        {filteredUsers.length === 0 ? (
          <div className="p-16 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mb-5">
              <UserMinus className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">No users found</h3>
            <p className="text-muted-foreground max-w-sm font-medium">No accounts match your current search or filter criteria. Try adjusting your query.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-secondary/40 text-muted-foreground uppercase tracking-wider text-[11px] font-black">
                <tr>
                  <th className="px-6 py-4">User Details</th>
                  <th className="px-6 py-4">Registered</th>
                  <th className="px-6 py-4">Staff Privileges</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredUsers.map(u => (
                  <tr key={u.id} className="hover:bg-secondary/30 transition-colors group" data-testid={`row-user-${u.id}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-secondary text-muted-foreground flex items-center justify-center font-bold text-sm shrink-0 border border-border">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-foreground text-[14px]">{u.name}</div>
                          <div className="text-xs text-muted-foreground font-medium mt-0.5">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground font-medium whitespace-nowrap">
                      {formatDate(u.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getRoleBadge(u.adminRole)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => setEditingUser(u)} 
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-background hover:bg-secondary hover:text-foreground text-muted-foreground text-[12px] font-bold transition-all shadow-sm group-hover:border-primary/30 group-hover:text-primary"
                        data-testid={`button-manage-${u.id}`}
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        Manage
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <section className="mt-8 bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-border bg-secondary/10">
          <h2 className="text-lg font-black text-foreground flex items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            Staff Access History
          </h2>
          <p className="text-sm text-muted-foreground mt-1 font-medium">
            Permanent, read-only record of Owner setup and staff role changes.
          </p>
        </div>
        {auditLoading ? (
          <div className="p-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : auditEntries.length === 0 ? (
          <p className="p-10 text-center text-sm text-muted-foreground font-medium">No staff access changes have been recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-secondary/40 text-muted-foreground uppercase tracking-wider text-[11px] font-black">
                <tr>
                  <th className="px-6 py-4">When</th>
                  <th className="px-6 py-4">Changed by</th>
                  <th className="px-6 py-4">Account</th>
                  <th className="px-6 py-4">Access change</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {auditEntries.map(entry => (
                  <tr key={entry.id} data-testid={`row-audit-${entry.id}`}>
                    <td className="px-6 py-4 whitespace-nowrap text-muted-foreground font-medium">{formatDateTime(entry.createdAt)}</td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-foreground">{entry.actorName}</div>
                      <div className="text-xs text-muted-foreground">{entry.actorEmail}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-foreground">{entry.targetName}</div>
                      <div className="text-xs text-muted-foreground">{entry.targetEmail}</div>
                    </td>
                    <td className="px-6 py-4 font-medium text-foreground">
                      {roleLabel(entry.previousRole)} <span className="text-muted-foreground mx-1">→</span> {roleLabel(entry.newRole)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {editingUser && data && (
        <RoleModal 
          user={editingUser} 
          currentUserId={data.currentUserId}
          onClose={() => setEditingUser(null)}
          onSuccess={(updatedUser) => {
            setEditingUser(null);
            
            // If the user modified their own role, force a hard reload to sync Clerk/auth state
            if (updatedUser.id === data.currentUserId && updatedUser.adminRole !== editingUser.adminRole) {
              window.location.reload();
              return;
            }

            // Otherwise visually update the row
            setData(prev => {
              if (!prev) return prev;
              return {
                ...prev,
                users: prev.users.map(u => u.id === updatedUser.id ? updatedUser : u)
              };
            });
            api.getAuditHistory().then(audit => setAuditEntries(audit.entries)).catch(() => {
              setError('Role changed, but the access history could not be refreshed.');
            });
          }}
        />
      )}
      </div>
    </div>
  );
}

export default function AdminStaff() {
  const { user, loading: authLoading } = useAuth();
  const [bootstrapStatus, setBootstrapStatus] = useState<BootstrapStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchStatus = useCallback(async () => {
    setStatusLoading(true);
    try {
      const res = await api.getBootstrapStatus();
      setBootstrapStatus(res);
    } catch (err: unknown) {
      setError(errorMessage(err, 'Failed to verify staff access'));
    } finally {
      setStatusLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && user) {
      fetchStatus();
    } else if (!authLoading) {
      setStatusLoading(false);
    }
  }, [authLoading, fetchStatus, user]);

  if (authLoading || statusLoading) return <LoadingScreen />;

  if (error) {
    return (
      <div className="h-full overflow-y-auto flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertCircle className="w-8 h-8 text-red-500" />
        <p className="text-red-500 font-bold">{error}</p>
        <button onClick={() => window.location.reload()} className="text-primary hover:underline font-bold text-sm" data-testid="button-retry-staff-access">Retry</button>
      </div>
    );
  }

  // 1. One-time Setup
  if (bootstrapStatus?.canBootstrap) {
    return <BootstrapView onComplete={() => window.location.reload()} />;
  }

  // 2. Authorization Check
  if (!user || user.adminRole !== 'owner') {
    return <NoAccessScreen signedIn={Boolean(user)} />;
  }

  // 3. Owners Dashboard
  return <StaffDirectory />;
}
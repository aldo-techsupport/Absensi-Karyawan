import { Head, router, usePage } from '@inertiajs/react';
import {
    AlertCircle,
    Crown,
    Pencil,
    Plus,
    ShieldCheck,
    Trash2,
    User,
    UserCog,
    X,
} from 'lucide-react';
import { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserRow {
    id: number;
    name: string;
    email: string;
    role: 'admin' | 'user';
    created_at: string;
}

interface Props {
    users: UserRow[];
}

// ─── Role Badge ───────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: 'admin' | 'user' }) {
    if (role === 'admin') {
        return (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-semibold text-orange-800 dark:bg-orange-900/30 dark:text-orange-400">
                <Crown className="h-3 w-3" />
                Admin
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
            <User className="h-3 w-3" />
            User
        </span>
    );
}

// ─── Field ────────────────────────────────────────────────────────────────────

function Field({
    label, required, error, children,
}: {
    label: string; required?: boolean; error?: string; children: React.ReactNode;
}) {
    return (
        <div className="space-y-1.5">
            <Label className="text-sm font-semibold">
                {label}{required && <span className="ml-1 text-red-500">*</span>}
            </Label>
            {children}
            {error && (
                <p className="flex items-center gap-1 text-xs text-red-500">
                    <AlertCircle className="h-3 w-3" />{error}
                </p>
            )}
        </div>
    );
}

// ─── User Form Modal ──────────────────────────────────────────────────────────

function UserFormModal({
    open,
    onClose,
    editUser,
    currentUserId,
}: {
    open: boolean;
    onClose: () => void;
    editUser: UserRow | null;
    currentUserId: number;
}) {
    const isEdit = editUser !== null;

    const [form, setForm] = useState({
        name:                 editUser?.name ?? '',
        email:                editUser?.email ?? '',
        role:                 editUser?.role ?? 'user' as 'admin' | 'user',
        password:             '',
        password_confirmation: '',
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [processing, setProcessing] = useState(false);

    // Reset form when modal opens
    const handleOpen = () => {
        setForm({
            name:                 editUser?.name ?? '',
            email:                editUser?.email ?? '',
            role:                 editUser?.role ?? 'user',
            password:             '',
            password_confirmation: '',
        });
        setErrors({});
    };

    const isSelf = isEdit && editUser?.id === currentUserId;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setProcessing(true);
        setErrors({});

        const url    = isEdit ? `/users/${editUser!.id}` : '/users';
        const method = isEdit ? 'put' : 'post';

        router[method](url, form as any, {
            onError:   (errs) => { setErrors(errs); setProcessing(false); },
            onSuccess: () => { setProcessing(false); onClose(); },
            onFinish:  () => setProcessing(false),
        });
    };

    return (
        <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }} >
            <DialogContent className="max-w-md" onOpenAutoFocus={handleOpen}>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <UserCog className="h-5 w-5 text-blue-600" />
                        {isEdit ? 'Edit Akun' : 'Tambah Akun Baru'}
                    </DialogTitle>
                    <DialogDescription>
                        {isEdit
                            ? 'Perbarui informasi akun. Kosongkan password jika tidak ingin mengubahnya.'
                            : 'Buat akun baru untuk mengakses sistem absensi.'}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <Field label="Nama Lengkap" required error={errors.name}>
                        <Input
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            placeholder="Nama lengkap"
                            className={errors.name ? 'border-red-400' : ''}
                        />
                    </Field>

                    <Field label="Email" required error={errors.email}>
                        <Input
                            type="email"
                            value={form.email}
                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                            placeholder="email@perusahaan.com"
                            className={errors.email ? 'border-red-400' : ''}
                        />
                    </Field>

                    {/* Role selector */}
                    <Field label="Role" required error={errors.role}>
                        <div className="flex gap-3">
                            {(['user', 'admin'] as const).map((r) => (
                                <label
                                    key={r}
                                    className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 py-3 text-sm font-semibold transition-all ${
                                        isSelf ? 'cursor-not-allowed opacity-60' : ''
                                    } ${
                                        form.role === r
                                            ? r === 'admin'
                                                ? 'border-orange-500 bg-orange-500 text-white shadow-md'
                                                : 'border-blue-500 bg-blue-500 text-white shadow-md'
                                            : 'border-muted bg-muted/30 text-muted-foreground hover:border-blue-300'
                                    }`}
                                >
                                    <input
                                        type="radio"
                                        name="role"
                                        value={r}
                                        checked={form.role === r}
                                        onChange={() => !isSelf && setForm({ ...form, role: r })}
                                        disabled={isSelf}
                                        className="sr-only"
                                    />
                                    {r === 'admin' ? <Crown className="h-4 w-4" /> : <User className="h-4 w-4" />}
                                    {r === 'admin' ? 'Admin' : 'User'}
                                </label>
                            ))}
                        </div>
                        {isSelf && (
                            <p className="text-xs text-muted-foreground">Anda tidak bisa mengubah role akun sendiri.</p>
                        )}
                    </Field>

                    <div className="border-t pt-3">
                        <p className="mb-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            {isEdit ? 'Ganti Password (opsional)' : 'Password'}
                        </p>
                        <div className="space-y-3">
                            <Field label={isEdit ? 'Password Baru' : 'Password'} required={!isEdit} error={errors.password}>
                                <Input
                                    type="password"
                                    value={form.password}
                                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                                    placeholder={isEdit ? 'Kosongkan jika tidak diubah' : 'Minimal 8 karakter'}
                                    className={errors.password ? 'border-red-400' : ''}
                                />
                            </Field>
                            <Field label="Konfirmasi Password" required={!isEdit && form.password !== ''} error={errors.password_confirmation}>
                                <Input
                                    type="password"
                                    value={form.password_confirmation}
                                    onChange={(e) => setForm({ ...form, password_confirmation: e.target.value })}
                                    placeholder="Ulangi password"
                                    className={errors.password_confirmation ? 'border-red-400' : ''}
                                />
                            </Field>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose} disabled={processing}>
                            Batal
                        </Button>
                        <Button type="submit" disabled={processing}>
                            {processing ? (
                                <span className="flex items-center gap-2">
                                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                    Menyimpan...
                                </span>
                            ) : isEdit ? 'Simpan Perubahan' : 'Buat Akun'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────

function DeleteModal({
    open,
    onClose,
    user,
}: {
    open: boolean;
    onClose: () => void;
    user: UserRow | null;
}) {
    const [processing, setProcessing] = useState(false);

    const handleDelete = () => {
        if (!user) return;
        setProcessing(true);
        router.delete(`/users/${user.id}`, {
            onSuccess: () => { setProcessing(false); onClose(); },
            onFinish:  () => setProcessing(false),
        });
    };

    return (
        <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <DialogTitle>Hapus Akun</DialogTitle>
                    <DialogDescription>
                        Akun <strong>{user?.name}</strong> ({user?.email}) akan dihapus permanen dan tidak bisa dikembalikan.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={processing}>Batal</Button>
                    <Button variant="destructive" onClick={handleDelete} disabled={processing}>
                        {processing ? 'Menghapus...' : 'Hapus Akun'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function UsersIndex({ users }: Props) {
    const { auth } = usePage().props as any;
    const currentUserId: number = auth?.user?.id;

    const [showForm, setShowForm]     = useState(false);
    const [editUser, setEditUser]     = useState<UserRow | null>(null);
    const [deleteUser, setDeleteUser] = useState<UserRow | null>(null);

    const flash = (usePage().props as any).flash as { success?: string; error?: string } | undefined;

    const adminCount = users.filter((u) => u.role === 'admin').length;
    const userCount  = users.filter((u) => u.role === 'user').length;

    const openCreate = () => { setEditUser(null); setShowForm(true); };
    const openEdit   = (u: UserRow) => { setEditUser(u); setShowForm(true); };

    return (
        <>
            <Head title="Kelola User" />

            <div className="flex flex-col gap-6 p-4 md:p-6">

                {/* ── Header ── */}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Kelola User</h1>
                        <p className="text-sm text-muted-foreground">
                            {users.length} akun terdaftar
                        </p>
                    </div>
                    <Button onClick={openCreate} className="w-fit gap-2">
                        <Plus className="h-4 w-4" />
                        Tambah Akun
                    </Button>
                </div>

                {/* ── Flash messages ── */}
                {flash?.success && (
                    <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30">
                        <ShieldCheck className="h-4 w-4 text-green-600" />
                        <AlertDescription className="text-green-800 dark:text-green-300">{flash.success}</AlertDescription>
                    </Alert>
                )}
                {flash?.error && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{flash.error}</AlertDescription>
                    </Alert>
                )}

                {/* ── Stat cards ── */}
                <div className="grid grid-cols-3 gap-3">
                    <Card>
                        <CardContent className="p-4">
                            <p className="text-xs font-medium text-muted-foreground">Total Akun</p>
                            <p className="mt-1 text-2xl font-bold">{users.length}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            <p className="text-xs font-medium text-muted-foreground">Admin</p>
                            <p className="mt-1 text-2xl font-bold text-orange-600">{adminCount}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            <p className="text-xs font-medium text-muted-foreground">User</p>
                            <p className="mt-1 text-2xl font-bold text-blue-600">{userCount}</p>
                        </CardContent>
                    </Card>
                </div>

                {/* ── User Table ── */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">Daftar Akun</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {users.length === 0 ? (
                            <div className="flex flex-col items-center gap-3 py-12 text-center">
                                <User className="h-10 w-10 text-muted-foreground/40" />
                                <p className="text-sm text-muted-foreground">Belum ada akun terdaftar.</p>
                                <Button size="sm" onClick={openCreate} className="gap-2">
                                    <Plus className="h-4 w-4" /> Tambah Akun Pertama
                                </Button>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b bg-muted/30">
                                            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Nama</th>
                                            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Email</th>
                                            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Role</th>
                                            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Dibuat</th>
                                            <th className="px-4 py-3 text-right font-medium text-muted-foreground">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {users.map((u) => {
                                            const isSelf = u.id === currentUserId;
                                            return (
                                                <tr
                                                    key={u.id}
                                                    className={`border-b transition-colors last:border-0 hover:bg-muted/20 ${isSelf ? 'bg-blue-50/50 dark:bg-blue-950/10' : ''}`}
                                                >
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-2">
                                                            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                                                                u.role === 'admin'
                                                                    ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                                                                    : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                                            }`}>
                                                                {u.name.charAt(0).toUpperCase()}
                                                            </div>
                                                            <div>
                                                                <p className="font-medium">{u.name}</p>
                                                                {isSelf && (
                                                                    <p className="text-xs text-blue-600 dark:text-blue-400">Akun Anda</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                                                    <td className="px-4 py-3">
                                                        <RoleBadge role={u.role} />
                                                    </td>
                                                    <td className="px-4 py-3 text-muted-foreground">{u.created_at}</td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center justify-end gap-1">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => openEdit(u)}
                                                                className="h-8 w-8 p-0"
                                                                title="Edit"
                                                            >
                                                                <Pencil className="h-3.5 w-3.5" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => !isSelf && setDeleteUser(u)}
                                                                disabled={isSelf}
                                                                className="h-8 w-8 p-0 text-muted-foreground hover:text-red-600 disabled:opacity-30"
                                                                title={isSelf ? 'Tidak bisa hapus akun sendiri' : 'Hapus'}
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>

            </div>

            {/* ── Modals ── */}
            <UserFormModal
                open={showForm}
                onClose={() => setShowForm(false)}
                editUser={editUser}
                currentUserId={currentUserId}
            />
            <DeleteModal
                open={deleteUser !== null}
                onClose={() => setDeleteUser(null)}
                user={deleteUser}
            />
        </>
    );
}

UsersIndex.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Kelola User', href: '/users' },
    ],
};

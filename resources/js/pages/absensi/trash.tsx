import { Head, router } from '@inertiajs/react';
import { ArchiveRestore, Calendar, Trash2 } from 'lucide-react';
import { useState } from 'react';
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
import * as absensiRoutes from '@/routes/absensi';

interface DeletedRow {
    db_id: number;
    daily_id: string;
    nama?: string;
    tanggal_formatted?: string;
    tanggal?: string;
    hari?: string;
    shift?: string;
    departemen?: string;
    section?: string;
    jabatan?: string;
    nrp?: string;
    mulai_tidur?: string;
    bangun_tidur?: string;
    durasi_tidur_label?: string;
    status_tidur?: string;
    deleted_at?: string;
    deleted_reason?: string;
    is_modified?: boolean;
}

interface Props {
    deleted: DeletedRow[];
}

function ShiftBadge({ shift }: { shift: string }) {
    const colors: Record<string, string> = {
        '1': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
        '2': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
        '3': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    };
    return (
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colors[shift] ?? 'bg-gray-100 text-gray-700'}`}>
            Shift {shift}
        </span>
    );
}

export default function AbsensiTrash({ deleted }: Props) {
    const [restoreRow, setRestoreRow] = useState<DeletedRow | null>(null);
    const [forceRow, setForceRow] = useState<DeletedRow | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const handleRestore = () => {
        if (!restoreRow) return;
        setIsProcessing(true);
        router.post(absensiRoutes.restore.url(restoreRow.db_id), {}, {
            onSuccess: () => setRestoreRow(null),
            onFinish: () => setIsProcessing(false),
        });
    };

    const handleForceDelete = () => {
        if (!forceRow) return;
        setIsProcessing(true);
        router.delete(absensiRoutes.forceDelete.url(forceRow.db_id), {
            onSuccess: () => setForceRow(null),
            onFinish: () => setIsProcessing(false),
        });
    };

    return (
        <>
            <Head title="Recycle Bin Absensi" />

            <div className="flex flex-col gap-6 p-4 md:p-6">
                {/* Header */}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Recycle Bin</h1>
                        <p className="text-sm text-muted-foreground">
                            {deleted.length} data yang dihapus · bisa dikembalikan kapan saja
                        </p>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.get(absensiRoutes.index.url())}
                    >
                        ← Kembali ke Dashboard
                    </Button>
                </div>

                {/* Table */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">History Penghapusan</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {deleted.length === 0 ? (
                            <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
                                <Calendar className="h-10 w-10 opacity-30" />
                                <p className="text-sm">Recycle bin kosong</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b bg-muted/50">
                                            <th className="px-4 py-3 text-left font-medium text-muted-foreground">ID</th>
                                            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Nama</th>
                                            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tanggal</th>
                                            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Shift</th>
                                            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Departemen</th>
                                            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Section</th>
                                            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Durasi Tidur</th>
                                            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Dihapus Pada</th>
                                            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Keterangan</th>
                                            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {deleted.map((row) => (
                                            <tr key={row.db_id} className="bg-red-50/30 transition-colors hover:bg-muted/30 dark:bg-red-900/5">
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="rounded bg-muted px-2 py-0.5 font-mono text-xs font-medium">
                                                            {row.daily_id}
                                                        </span>
                                                        {row.is_modified && (
                                                            <span className="rounded-full bg-orange-100 px-1.5 py-0.5 text-xs text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                                                                diedit
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 font-medium">{row.nama || '-'}</td>
                                                <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                                                    {row.tanggal_formatted || row.tanggal || '-'}
                                                    {row.hari && <span className="ml-1 text-xs">({row.hari})</span>}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {row.shift ? <ShiftBadge shift={row.shift} /> : '-'}
                                                </td>
                                                <td className="px-4 py-3 text-muted-foreground">{row.departemen || '-'}</td>
                                                <td className="px-4 py-3 text-muted-foreground">{row.section || '-'}</td>
                                                <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                                                    {row.durasi_tidur_label && row.durasi_tidur_label !== '-'
                                                        ? row.durasi_tidur_label
                                                        : '-'}
                                                </td>
                                                <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                                                    {row.deleted_at || '-'}
                                                </td>
                                                <td className="max-w-40 truncate px-4 py-3 text-muted-foreground">
                                                    {row.deleted_reason || <span className="italic opacity-50">—</span>}
                                                </td>
                                                <td className="whitespace-nowrap px-4 py-3">
                                                    <div className="flex items-center gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7 text-green-600 hover:bg-green-50 hover:text-green-700 dark:text-green-400 dark:hover:bg-green-900/20"
                                                            onClick={() => setRestoreRow(row)}
                                                            title="Kembalikan"
                                                        >
                                                            <ArchiveRestore className="h-3.5 w-3.5" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7 text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
                                                            onClick={() => setForceRow(row)}
                                                            title="Hapus Permanen"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Restore Confirm */}
            <Dialog open={restoreRow !== null} onOpenChange={(v) => { if (!v) setRestoreRow(null); }}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Kembalikan Data</DialogTitle>
                        <DialogDescription>
                            Kembalikan data absensi <strong>{restoreRow?.nama}</strong> ke daftar aktif?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRestoreRow(null)} disabled={isProcessing}>
                            Batal
                        </Button>
                        <Button onClick={handleRestore} disabled={isProcessing} className="bg-green-600 hover:bg-green-700">
                            {isProcessing ? 'Memproses...' : 'Kembalikan'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Force Delete Confirm */}
            <Dialog open={forceRow !== null} onOpenChange={(v) => { if (!v) setForceRow(null); }}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Hapus Permanen</DialogTitle>
                        <DialogDescription>
                            Data <strong>{forceRow?.nama}</strong> akan dihapus permanen dan tidak bisa dikembalikan lagi.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setForceRow(null)} disabled={isProcessing}>
                            Batal
                        </Button>
                        <Button variant="destructive" onClick={handleForceDelete} disabled={isProcessing}>
                            {isProcessing ? 'Menghapus...' : 'Hapus Permanen'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

AbsensiTrash.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Absensi', href: '/absensi' },
        { title: 'Recycle Bin', href: '/absensi/trash' },
    ],
};

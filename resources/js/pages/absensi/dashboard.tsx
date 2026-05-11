import { Head, router, usePage } from '@inertiajs/react';
import {
    AlertCircle,
    Building2,
    Calendar,
    Clock,
    Download,
    ExternalLink,
    MapPin,
    Pencil,
    PlayCircle,
    Search,
    ShieldAlert,
    ShieldCheck,
    ShieldX,
    StopCircle,
    Timer,
    Trash2,
    Users,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx-js-style';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import * as absensiRoutes from '@/routes/absensi';

const BULAN_NAMES: Record<string, string> = {
    '01': 'Januari', '02': 'Februari', '03': 'Maret', '04': 'April',
    '05': 'Mei', '06': 'Juni', '07': 'Juli', '08': 'Agustus',
    '09': 'September', '10': 'Oktober', '11': 'November', '12': 'Desember',
};

type StatusTidur = 'FIT TO WORK' | 'COACHING ATASAN' | 'FATIGUE RISK' | 'UNKNOWN';

interface AbsensiRow {
    daily_id?: string;
    db_id?: number | null;
    timestamp?: string;
    hari?: string;
    tanggal?: string;
    tanggal_formatted?: string;
    shift?: string;
    shift_label?: string;
    waktu_mulai?: string;
    perusahaan?: string;
    departemen?: string;
    kegiatan?: string;
    nama?: string;
    nrp?: string;
    jabatan?: string;
    section?: string;
    mulai_tidur?: string;
    bangun_tidur?: string;
    lokasi?: string;
    judul_kegiatan?: string;
    durasi_tidur_jam?: number | null;
    durasi_tidur_menit?: number | null;
    durasi_tidur_label?: string;
    status_tidur?: StatusTidur;
    status_tidur_color?: string;
    bulan?: string;
    tahun?: string;
    jam_isi?: string;
    terlambat?: boolean;
    selisih_terlambat?: string | null;
}

interface Stats {
    total: number;
    total_karyawan: number;
    total_departemen: number;
    fit_count: number;
    coaching_count: number;
    fatigue_count: number;
    unknown_count: number;
    terlambat_count: number;
    shift_counts: Record<string, number>;
    departemen_counts: Record<string, number>;
    kegiatan_counts: Record<string, number>;
}

interface Filters {
    bulan?: string | null;
    tahun?: string | null;
    tanggal_dari?: string | null;
    tanggal_sampai?: string | null;
    nama?: string | null;
    departemen?: string | null;
    shift?: string | null;
    status_tidur?: string | null;
    section?: string | null;
    batas_jam?: string | null;
    terlambat?: string | null;
}

interface Props {
    absensi: AbsensiRow[];
    stats: Stats;
    namaList: string[];
    bulanList: string[];
    tahunList: string[];
    departemenList: string[];
    shiftList: string[];
    sectionList: string[];
    filters: Filters;
    error?: string | null;
    totalRows: number;
    trashCount: number;
    formSetting?: {
        form_status: 'open' | 'closed';
        is_open: boolean;
        closed_message: string;
        schedule_enabled: boolean;
        schedule_days: string[];
        schedule_start: string;
        schedule_end: string;
        location_enabled: boolean;
        location_lat: number | null;
        location_lng: number | null;
        location_radius: number;
        location_embed_url: string | null;
    };
}

// ─── Status Tidur Badge ───────────────────────────────────────────────────────

const STATUS_CONFIG: Record<StatusTidur, { label: string; className: string; dot: string }> = {
    'FIT TO WORK': {
        label: 'Fit to Work',
        className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
        dot: 'bg-green-500',
    },
    'COACHING ATASAN': {
        label: 'Coaching Atasan',
        className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
        dot: 'bg-yellow-500',
    },
    'FATIGUE RISK': {
        label: 'Fatigue Risk',
        className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
        dot: 'bg-red-500',
    },
    'UNKNOWN': {
        label: '-',
        className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
        dot: 'bg-gray-400',
    },
};

function StatusTidurBadge({ status }: { status: StatusTidur }) {
    const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG['UNKNOWN'];
    return (
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.className}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
            {cfg.label}
        </span>
    );
}

function ShiftBadge({ shift }: { shift: string }) {
    const colors: Record<string, string> = {
        '1': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
        '2': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
        '3': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    };
    return (
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[shift] ?? 'bg-gray-100 text-gray-700'}`}>
            Shift {shift}
        </span>
    );
}

// ─── Schedule Modal ───────────────────────────────────────────────────────────

const HARI_LABELS: Record<string, string> = {
    '1': 'Senin', '2': 'Selasa', '3': 'Rabu', '4': 'Kamis',
    '5': 'Jumat', '6': 'Sabtu', '7': 'Minggu',
};

function ScheduleModal({
    open,
    onClose,
    setting,
}: {
    open: boolean;
    onClose: () => void;
    setting: {
        schedule_enabled: boolean;
        schedule_days: string[];
        schedule_start: string;
        schedule_end: string;
        closed_message: string;
    };
}) {
    const [enabled, setEnabled]       = useState(setting.schedule_enabled);
    const [days, setDays]             = useState<string[]>(setting.schedule_days);
    const [start, setStart]           = useState(setting.schedule_start);
    const [end, setEnd]               = useState(setting.schedule_end);
    const [message, setMessage]       = useState(setting.closed_message);
    const [saving, setSaving]         = useState(false);

    // Sync when modal reopens
    useEffect(() => {
        if (open) {
            setEnabled(setting.schedule_enabled);
            setDays(setting.schedule_days);
            setStart(setting.schedule_start);
            setEnd(setting.schedule_end);
            setMessage(setting.closed_message);
        }
    }, [open]);

    const toggleDay = (d: string) => {
        setDays((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]);
    };

    const handleSave = () => {
        setSaving(true);
        router.post('/absensi/form-setting/schedule', {
            schedule_enabled: enabled,
            schedule_days:    days,
            schedule_start:   start,
            schedule_end:     end,
            closed_message:   message,
        }, {
            onSuccess: () => { setSaving(false); onClose(); },
            onError:   () => setSaving(false),
        });
    };

    return (
        <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Timer className="h-5 w-5 text-blue-600" />
                        Jadwal Buka/Tutup Form
                    </DialogTitle>
                    <DialogDescription>
                        Atur jadwal otomatis kapan form absensi bisa diisi.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-5">
                    {/* Toggle schedule */}
                    <div className="flex items-center justify-between rounded-xl border bg-muted/30 p-4">
                        <div>
                            <p className="font-medium text-sm">Jadwal Otomatis</p>
                            <p className="text-xs text-muted-foreground">
                                {enabled ? 'Form buka/tutup sesuai jadwal' : 'Gunakan tombol Start/Stop manual'}
                            </p>
                        </div>
                        <button
                            type="button"
                            role="switch"
                            aria-checked={enabled}
                            onClick={() => setEnabled(!enabled)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                enabled ? 'bg-blue-600' : 'bg-muted-foreground/30'
                            }`}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                                enabled ? 'translate-x-6' : 'translate-x-1'
                            }`} />
                        </button>
                    </div>

                    {/* Hari aktif */}
                    <div className="space-y-2">
                        <Label className="text-sm font-semibold">Hari Aktif</Label>
                        <div className="flex flex-wrap gap-2">
                            {Object.entries(HARI_LABELS).map(([val, label]) => (
                                <button
                                    key={val}
                                    type="button"
                                    onClick={() => toggleDay(val)}
                                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                                        days.includes(val)
                                            ? 'bg-blue-600 text-white'
                                            : 'border border-muted-foreground/30 text-muted-foreground hover:border-blue-400 hover:text-blue-600'
                                    }`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Jam buka & tutup */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label className="text-sm font-semibold">Jam Buka</Label>
                            <Input
                                type="time"
                                value={start}
                                onChange={(e) => setStart(e.target.value)}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-sm font-semibold">Jam Tutup</Label>
                            <Input
                                type="time"
                                value={end}
                                onChange={(e) => setEnd(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Pesan saat ditutup */}
                    <div className="space-y-1.5">
                        <Label className="text-sm font-semibold">Pesan saat Form Ditutup</Label>
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            rows={2}
                            placeholder="Contoh: Form absensi sudah ditutup. Hubungi admin."
                            className="w-full rounded-lg border bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={saving}>Batal</Button>
                    <Button onClick={handleSave} disabled={saving}>
                        {saving ? 'Menyimpan...' : 'Simpan Jadwal'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────

function DeleteConfirmModal({
    open,
    onClose,
    onConfirm,
    nama,
    processing,
}: {
    open: boolean;
    onClose: () => void;
    onConfirm: (reason: string) => void;
    nama: string;
    processing: boolean;
}) {
    const [reason, setReason] = useState('');
    return (
        <Dialog open={open} onOpenChange={(v) => { if (!v) { setReason(''); onClose(); } }}>
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <DialogTitle>Hapus Data Absensi</DialogTitle>
                    <DialogDescription>
                        Data <strong>{nama}</strong> akan dipindahkan ke recycle bin dan bisa dikembalikan kapan saja.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-1.5">
                    <Label htmlFor="reason">Alasan penghapusan <span className="text-muted-foreground">(opsional)</span></Label>
                    <Input
                        id="reason"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Contoh: data duplikat, salah input..."
                    />
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => { setReason(''); onClose(); }} disabled={processing}>
                        Batal
                    </Button>
                    <Button variant="destructive" onClick={() => onConfirm(reason)} disabled={processing}>
                        {processing ? 'Memproses...' : 'Pindahkan ke Recycle Bin'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AbsensiDashboard({
    absensi, stats, namaList, bulanList, tahunList,
    departemenList, shiftList, sectionList, filters, error, totalRows, trashCount,
    formSetting,
}: Props) {
    const { auth } = usePage().props as any;
    const isAdmin: boolean = auth?.isAdmin ?? false;
    const [searchNama, setSearchNama] = useState(filters.nama ?? '');
    const [batasJam, setBatasJam] = useState(filters.batas_jam ?? '09:00');
    const [deleteRow, setDeleteRow] = useState<AbsensiRow | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [page, setPage] = useState(1);
    const PAGE_SIZE = 25;

    // Reset ke halaman 1 saat filter berubah
    const totalPages = Math.ceil(absensi.length / PAGE_SIZE);
    const pagedAbsensi = absensi.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    const [showSchedule, setShowSchedule] = useState(false);
    const [isTogglingForm, setIsTogglingForm] = useState(false);

    const formIsOpen = formSetting?.is_open ?? true;
    const scheduleEnabled = formSetting?.schedule_enabled ?? false;

    const handleToggleForm = () => {
        setIsTogglingForm(true);
        router.post('/absensi/form-setting/toggle', {}, {
            onFinish: () => setIsTogglingForm(false),
        });
    };

    // Simpan filter preferences ke akun user (fire-and-forget, tidak blokir UI)
    const saveFilterPreferences = (prefs: Partial<Filters>) => {
        const csrfToken = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '';
        const body: Record<string, string> = {};
        // Hanya kirim nilai yang ada (null/undefined → skip)
        Object.entries(prefs).forEach(([k, v]) => {
            if (v != null && v !== '') body[k] = String(v);
        });
        fetch('/user/filter-preferences', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': csrfToken,
                'Accept': 'application/json',
            },
            body: JSON.stringify(body),
        }).catch(() => {/* silent fail */});
    };

    const applyFilter = (updates: Partial<Filters>) => {
        setPage(1); // reset ke halaman 1
        const merged = { ...filters, ...updates };
        const params: Record<string, string> = {};

        // Selalu sertakan batas_jam (pakai state lokal sebagai fallback)
        params.batas_jam = merged.batas_jam ?? batasJam ?? '09:00';

        if (merged.bulan) params.bulan = merged.bulan;
        if (merged.tahun) params.tahun = merged.tahun;
        if (merged.tanggal_dari) params.tanggal_dari = merged.tanggal_dari;
        if (merged.tanggal_sampai) params.tanggal_sampai = merged.tanggal_sampai;
        if (merged.nama) params.nama = merged.nama;
        if (merged.departemen) params.departemen = merged.departemen;
        if (merged.shift) params.shift = merged.shift;
        if (merged.status_tidur) params.status_tidur = merged.status_tidur;
        if (merged.section) params.section = merged.section;
        // terlambat bisa '0' (falsy) jadi pakai !== null/undefined
        if (merged.terlambat != null && merged.terlambat !== '') {
            params.terlambat = merged.terlambat;
        }

        // Simpan ke preferensi akun user
        saveFilterPreferences(merged);

        router.get('/absensi', params, { preserveState: true, replace: true });
    };

    const handleClearFilters = () => {
        setSearchNama('');
        // Hapus semua preferensi filter yang tersimpan
        saveFilterPreferences({
            bulan: null, tahun: null, tanggal_dari: null, tanggal_sampai: null,
            nama: null, departemen: null, shift: null, status_tidur: null,
            section: null, batas_jam: '09:00', terlambat: null,
        });
        router.get('/absensi', {}, { preserveState: false, replace: true });
    };

    const handleDelete = (reason: string) => {
        if (!deleteRow?.db_id) return;
        setIsDeleting(true);
        router.delete(absensiRoutes.destroy.url(deleteRow.db_id), {
            data: { reason },
            onSuccess: () => { setDeleteRow(null); },
            onFinish: () => setIsDeleting(false),
        });
    };

    const handleExport = () => {
        // Sort: Pemateri/GL di atas, Audience di bawah
        const sorted = [...absensi].sort((a, b) => {
            const isPemateriA = (a as any).peran_kegiatan === 'Pemateri' || (a.jabatan ?? '').toUpperCase().includes('GL');
            const isPemateriB = (b as any).peran_kegiatan === 'Pemateri' || (b.jabatan ?? '').toUpperCase().includes('GL');
            if (isPemateriA && !isPemateriB) return -1;
            if (!isPemateriA && isPemateriB) return 1;
            return 0;
        });

        // Siapkan data untuk Excel
        const rows = sorted.map((row, idx) => ({
            'No': idx + 1,
            'ID': row.daily_id ?? '',
            'Tanggal': row.tanggal_formatted ?? row.tanggal ?? '',
            'Hari': row.hari ?? '',
            'Shift': row.shift ? `Shift ${row.shift}` : '',
            'Waktu Mulai': row.waktu_mulai ?? '',
            'Nama': row.nama ?? '',
            'Section': row.section ?? '',
            'Jabatan': row.jabatan ?? '',
            'Peran': (row as any).peran_kegiatan ?? '',
            'NRP': row.nrp ?? '',
            'Departemen': row.departemen ?? '',
            'Kegiatan': row.kegiatan ?? '',
            'Judul Kegiatan': (row as any).judul_kegiatan ?? '',
            'Mulai Tidur': row.mulai_tidur ?? '',
            'Bangun Tidur': row.bangun_tidur ?? '',
            'Durasi Tidur': row.durasi_tidur_label ?? '',
            'Status Tidur': row.status_tidur ?? '',
            'Jam Isi': row.jam_isi ?? '',
            'Keterlambatan': row.terlambat
                ? `Terlambat +${row.selisih_terlambat}`
                : row.jam_isi ? 'Tepat Waktu' : '',
        }));

        const headers = Object.keys(rows[0] ?? {});
        const colCount = headers.length;

        // Warna per status tidur
        const STATUS_COLORS: Record<string, { bg: string; font: string }> = {
            'FIT TO WORK':     { bg: 'C6EFCE', font: '276221' }, // hijau
            'COACHING ATASAN': { bg: 'FFEB9C', font: '9C6500' }, // kuning
            'FATIGUE RISK':    { bg: 'FFC7CE', font: '9C0006' }, // merah
        };

        // Build worksheet manually agar bisa styling per cell
        const wsData: (string | number)[][] = [
            headers,
            ...rows.map(r => headers.map(h => r[h as keyof typeof r] as string | number)),
        ];

        const ws = XLSX.utils.aoa_to_sheet(wsData);

        // Style header row (baris 1 = index 0)
        for (let c = 0; c < colCount; c++) {
            const cellRef = XLSX.utils.encode_cell({ r: 0, c });
            if (!ws[cellRef]) continue;
            ws[cellRef].s = {
                font: { bold: true, color: { rgb: 'FFFFFF' } },
                fill: { fgColor: { rgb: '1F4E79' } },
                alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
                border: {
                    top:    { style: 'thin', color: { rgb: 'AAAAAA' } },
                    bottom: { style: 'thin', color: { rgb: 'AAAAAA' } },
                    left:   { style: 'thin', color: { rgb: 'AAAAAA' } },
                    right:  { style: 'thin', color: { rgb: 'AAAAAA' } },
                },
            };
        }

        // Style data rows
        const statusColIdx = headers.indexOf('Status Tidur');
        const durasiColIdx = headers.indexOf('Durasi Tidur');
        const peranColIdx  = headers.indexOf('Peran');

        rows.forEach((row, rowIdx) => {
            const status     = row['Status Tidur'];
            const color      = STATUS_COLORS[status];
            const peran      = row['Peran'] ?? '';
            const jabatan    = row['Jabatan'] ?? '';
            // Pemateri atau GL → highlight baris dengan warna emas muda
            const isPemateri = peran === 'Pemateri' || jabatan.toUpperCase().includes('GL');
            const excelRow   = rowIdx + 1;

            for (let c = 0; c < colCount; c++) {
                const cellRef = XLSX.utils.encode_cell({ r: excelRow, c });
                if (!ws[cellRef]) ws[cellRef] = { t: 's', v: '' };

                const isColoredCol = c === statusColIdx || c === durasiColIdx;
                const isEven = rowIdx % 2 === 0;

                const baseStyle = {
                    alignment: { vertical: 'center', wrapText: false },
                    border: {
                        top:    { style: 'thin', color: { rgb: 'DDDDDD' } },
                        bottom: { style: 'thin', color: { rgb: 'DDDDDD' } },
                        left:   { style: 'thin', color: { rgb: 'DDDDDD' } },
                        right:  { style: 'thin', color: { rgb: 'DDDDDD' } },
                    },
                };

                if (isColoredCol && color) {
                    ws[cellRef].s = {
                        ...baseStyle,
                        fill: { fgColor: { rgb: color.bg } },
                        font: {
                            bold: c === statusColIdx,
                            color: { rgb: color.font },
                        },
                    };
                } else if (isPemateri) {
                    // Baris Pemateri/GL — highlight emas muda
                    ws[cellRef].s = {
                        ...baseStyle,
                        fill: { fgColor: { rgb: 'FFF2CC' } },
                        font: {
                            bold: c === peranColIdx,
                            color: { rgb: '7D4E00' },
                        },
                    };
                } else {
                    ws[cellRef].s = {
                        ...baseStyle,
                        fill: { fgColor: { rgb: isEven ? 'FFFFFF' : 'F5F5F5' } },
                        font: { color: { rgb: '333333' } },
                    };
                }
            }
        });

        // Auto column width
        ws['!cols'] = headers.map((h) => ({
            wch: Math.max(
                h.length,
                ...rows.map((r) => String(r[h as keyof typeof r] ?? '').length),
            ) + 2,
        }));

        // Freeze header row
        ws['!freeze'] = { xSplit: 0, ySplit: 1 };

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Absensi');

        // Nama file dengan info filter aktif
        const parts = ['Absensi'];
        if (filters.bulan) parts.push(BULAN_NAMES[filters.bulan] ?? filters.bulan);
        if (filters.tahun) parts.push(filters.tahun);
        if (filters.tanggal_dari) parts.push(filters.tanggal_dari.replace(/-/g, ''));
        if (filters.tanggal_sampai) parts.push('sd' + filters.tanggal_sampai.replace(/-/g, ''));
        if (filters.departemen) parts.push(filters.departemen);
        if (filters.section) parts.push(filters.section);
        if (filters.shift) parts.push(`Shift${filters.shift}`);
        if (filters.terlambat === '1') parts.push('Terlambat');
        if (filters.terlambat === '0') parts.push('TepakWaktu');
        const filename = parts.join('_') + '.xlsx';

        XLSX.writeFile(wb, filename, { bookType: 'xlsx', cellStyles: true });
    };

    const hasActiveFilters = Object.values(filters).some(Boolean);

    // ── Stat cards ──
    const statCards = [
        {
            title: 'Total Absensi',
            value: stats.total,
            sub: `dari ${totalRows} total data`,
            icon: Calendar,
            color: 'text-blue-600 dark:text-blue-400',
            bg: 'bg-blue-50 dark:bg-blue-900/20',
        },
        {
            title: 'Karyawan',
            value: stats.total_karyawan,
            sub: 'karyawan unik',
            icon: Users,
            color: 'text-indigo-600 dark:text-indigo-400',
            bg: 'bg-indigo-50 dark:bg-indigo-900/20',
        },
        {
            title: 'Fit to Work',
            value: stats.fit_count,
            sub: '≥ 6 jam tidur',
            icon: ShieldCheck,
            color: 'text-green-600 dark:text-green-400',
            bg: 'bg-green-50 dark:bg-green-900/20',
        },
        {
            title: 'Coaching Atasan',
            value: stats.coaching_count,
            sub: '5–6 jam tidur',
            icon: ShieldAlert,
            color: 'text-yellow-600 dark:text-yellow-400',
            bg: 'bg-yellow-50 dark:bg-yellow-900/20',
        },
        {
            title: 'Fatigue Risk',
            value: stats.fatigue_count,
            sub: '< 5 jam tidur',
            icon: ShieldX,
            color: 'text-red-600 dark:text-red-400',
            bg: 'bg-red-50 dark:bg-red-900/20',
        },
        {
            title: 'Departemen',
            value: stats.total_departemen,
            sub: 'departemen aktif',
            icon: Building2,
            color: 'text-purple-600 dark:text-purple-400',
            bg: 'bg-purple-50 dark:bg-purple-900/20',
        },
        {
            title: 'Terlambat Isi',
            value: stats.terlambat_count,
            sub: `batas ${filters.batas_jam ?? '09:00'}`,
            icon: Clock,
            color: 'text-rose-600 dark:text-rose-400',
            bg: 'bg-rose-50 dark:bg-rose-900/20',
        },
    ];

    return (
        <>
            <Head title="Dashboard Absensi" />

            <div className="flex flex-col gap-6 p-4 md:p-6">

                {/* ── Header ── */}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Dashboard Absensi</h1>
                        <p className="text-sm text-muted-foreground">
                            {totalRows} total entri tersimpan
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {isAdmin && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => router.get(absensiRoutes.trash.url())}
                                className="relative w-fit gap-2"
                            >
                                <Trash2 className="h-4 w-4" />
                                Recycle Bin
                                {trashCount > 0 && (
                                    <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                                        {trashCount > 99 ? '99+' : trashCount}
                                    </span>
                                )}
                            </Button>
                        )}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleExport}
                            disabled={absensi.length === 0}
                            className="w-fit gap-2"
                        >
                            <Download className="h-4 w-4" />
                            Export Excel
                            {absensi.length > 0 && (
                                <span className="rounded-full bg-muted px-1.5 py-0.5 text-xs">{absensi.length}</span>
                            )}
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open('/absensi/form', '_blank')}
                            className="w-fit gap-2 border-blue-300 text-blue-700 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-400 dark:hover:bg-blue-900/20"
                        >
                            <ExternalLink className="h-4 w-4" />
                            Buka Form
                        </Button>
                        {isAdmin && (
                            <>
                                {/* Start / Stop tombol — hanya tampil jika schedule tidak aktif */}
                                {!scheduleEnabled && (
                                    <Button
                                        size="sm"
                                        onClick={handleToggleForm}
                                        disabled={isTogglingForm}
                                        className={`w-fit gap-2 ${
                                            formIsOpen
                                                ? 'bg-red-600 hover:bg-red-700 text-white'
                                                : 'bg-green-600 hover:bg-green-700 text-white'
                                        }`}
                                    >
                                        {isTogglingForm ? (
                                            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                        ) : formIsOpen ? (
                                            <StopCircle className="h-4 w-4" />
                                        ) : (
                                            <PlayCircle className="h-4 w-4" />
                                        )}
                                        {isTogglingForm ? 'Memproses...' : formIsOpen ? 'Stop Form' : 'Start Form'}
                                    </Button>
                                )}

                                {/* Status badge jika schedule aktif */}
                                {scheduleEnabled && (
                                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                                        formIsOpen
                                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                    }`}>
                                        <span className={`h-2 w-2 rounded-full ${formIsOpen ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                                        {formIsOpen ? 'Form Terbuka' : 'Form Ditutup'}
                                    </span>
                                )}

                                {/* Tombol Jadwal */}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowSchedule(true)}
                                    className="w-fit gap-2"
                                >
                                    <Timer className="h-4 w-4" />
                                    Jadwal
                                    {scheduleEnabled && (
                                        <span className="h-2 w-2 rounded-full bg-blue-500" />
                                    )}
                                </Button>

                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => router.get('/absensi/form-config')}
                                    className="w-fit gap-2"
                                >
                                    <Pencil className="h-4 w-4" />
                                    Atur Form
                                </Button>
                            </>
                        )}
                    </div>
                </div>

                {/* ── Schedule Modal ── */}
                {isAdmin && formSetting && (
                    <ScheduleModal
                        open={showSchedule}
                        onClose={() => setShowSchedule(false)}
                        setting={formSetting}
                    />
                )}

                {/* ── Error ── */}
                {error && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                {/* ── Status Form Banner ── */}
                {isAdmin && formSetting && !formSetting.is_open && (
                    <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30">
                        <StopCircle className="h-4 w-4 text-red-600" />
                        <AlertDescription className="text-red-800 dark:text-red-300">
                            <strong>Form absensi sedang ditutup.</strong> Karyawan tidak bisa mengisi absensi saat ini.
                            {scheduleEnabled && ' (Dikelola oleh jadwal otomatis)'}
                        </AlertDescription>
                    </Alert>
                )}

                {/* ── Aturan Tidur Info ── */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
                        <ShieldCheck className="h-8 w-8 shrink-0 text-green-600 dark:text-green-400" />
                        <div>
                            <p className="font-semibold text-green-800 dark:text-green-300">Fit to Work</p>
                            <p className="text-sm text-green-700 dark:text-green-400">Durasi tidur 6–8 jam</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 rounded-xl border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20">
                        <ShieldAlert className="h-8 w-8 shrink-0 text-yellow-600 dark:text-yellow-400" />
                        <div>
                            <p className="font-semibold text-yellow-800 dark:text-yellow-300">Coaching Atasan</p>
                            <p className="text-sm text-yellow-700 dark:text-yellow-400">Durasi tidur 5–6 jam</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
                        <ShieldX className="h-8 w-8 shrink-0 text-red-600 dark:text-red-400" />
                        <div>
                            <p className="font-semibold text-red-800 dark:text-red-300">Fatigue Risk</p>
                            <p className="text-sm text-red-700 dark:text-red-400">Durasi tidur &lt; 5 jam</p>
                        </div>
                    </div>
                </div>

                {/* ── Stat Cards ── */}
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-7">
                    {statCards.map((card) => (
                        <Card key={card.title}>
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-xs font-medium text-muted-foreground">{card.title}</p>
                                        <p className="mt-1 text-2xl font-bold">{card.value}</p>
                                        <p className="mt-0.5 truncate text-xs text-muted-foreground">{card.sub}</p>
                                    </div>
                                    <div className={`shrink-0 rounded-lg p-2 ${card.bg}`}>
                                        <card.icon className={`h-4 w-4 ${card.color}`} />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* ── Summary Cards ── */}
                <div className="grid gap-4 md:grid-cols-3">
                    {/* Shift */}
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">Distribusi Shift</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {Object.entries(stats.shift_counts).length === 0 ? (
                                <p className="text-xs text-muted-foreground">Tidak ada data</p>
                            ) : (
                                Object.entries(stats.shift_counts).sort((a, b) => b[1] - a[1]).map(([shift, count]) => (
                                    <div key={shift} className="flex items-center justify-between">
                                        <span className="text-sm">{shift}</span>
                                        <div className="flex items-center gap-2">
                                            <div className="h-2 rounded-full bg-blue-200 dark:bg-blue-900"
                                                style={{ width: `${Math.max(20, (count / stats.total) * 120)}px` }} />
                                            <span className="w-8 text-right text-xs font-medium text-muted-foreground">{count}</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>

                    {/* Departemen */}
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">Top Departemen</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {Object.entries(stats.departemen_counts).length === 0 ? (
                                <p className="text-xs text-muted-foreground">Tidak ada data</p>
                            ) : (
                                Object.entries(stats.departemen_counts).map(([dep, count]) => (
                                    <div key={dep} className="flex items-center justify-between gap-2">
                                        <span className="min-w-0 truncate text-sm">{dep}</span>
                                        <Badge variant="secondary" className="shrink-0 text-xs">{count}</Badge>
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>

                    {/* Status Tidur */}
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">Status Tidur</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {[
                                { key: 'FIT TO WORK' as StatusTidur, count: stats.fit_count },
                                { key: 'COACHING ATASAN' as StatusTidur, count: stats.coaching_count },
                                { key: 'FATIGUE RISK' as StatusTidur, count: stats.fatigue_count },
                            ].map(({ key, count }) => (
                                <div key={key} className="flex items-center justify-between gap-2">
                                    <StatusTidurBadge status={key} />
                                    <span className="text-sm font-medium">{count}</span>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>

                {/* ── Filters ── */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">Filter Data</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-3">
                            {/* Filter Tanggal Range */}
                            <div className="flex items-center gap-1.5 rounded-lg border bg-muted/30 px-3 py-1.5">
                                <Calendar className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                <input
                                    type="date"
                                    value={filters.tanggal_dari ?? ''}
                                    onChange={(e) => applyFilter({ tanggal_dari: e.target.value || null, bulan: null, tahun: null })}
                                    className="w-36 bg-transparent text-sm focus:outline-none"
                                    title="Dari tanggal"
                                />
                                <span className="text-xs text-muted-foreground">–</span>
                                <input
                                    type="date"
                                    value={filters.tanggal_sampai ?? ''}
                                    min={filters.tanggal_dari ?? undefined}
                                    onChange={(e) => applyFilter({ tanggal_sampai: e.target.value || null, bulan: null, tahun: null })}
                                    className="w-36 bg-transparent text-sm focus:outline-none"
                                    title="Sampai tanggal"
                                />
                                {(filters.tanggal_dari || filters.tanggal_sampai) && (
                                    <button
                                        type="button"
                                        onClick={() => applyFilter({ tanggal_dari: null, tanggal_sampai: null })}
                                        className="ml-1 text-muted-foreground hover:text-foreground"
                                        title="Hapus filter tanggal"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>

                            <Select value={filters.departemen ?? 'all'} onValueChange={(v) => applyFilter({ departemen: v === 'all' ? null : v })}>
                                <SelectTrigger className="w-44"><SelectValue placeholder="Semua Departemen" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Semua Departemen</SelectItem>
                                    {departemenList.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                                </SelectContent>
                            </Select>

                            <Select value={filters.section ?? 'all'} onValueChange={(v) => applyFilter({ section: v === 'all' ? null : v })}>
                                <SelectTrigger className="w-40"><SelectValue placeholder="Semua Section" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Semua Section</SelectItem>
                                    {sectionList.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                </SelectContent>
                            </Select>

                            <Select value={filters.shift ?? 'all'} onValueChange={(v) => applyFilter({ shift: v === 'all' ? null : v })}>
                                <SelectTrigger className="w-32"><SelectValue placeholder="Semua Shift" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Semua Shift</SelectItem>
                                    {shiftList.map((s) => <SelectItem key={s} value={s}>Shift {s}</SelectItem>)}
                                </SelectContent>
                            </Select>

                            <Select value={filters.status_tidur ?? 'all'} onValueChange={(v) => applyFilter({ status_tidur: v === 'all' ? null : v })}>
                                <SelectTrigger className="w-48"><SelectValue placeholder="Semua Status Tidur" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Semua Status Tidur</SelectItem>
                                    <SelectItem value="FIT TO WORK">Fit to Work</SelectItem>
                                    <SelectItem value="COACHING ATASAN">Coaching Atasan</SelectItem>
                                    <SelectItem value="FATIGUE RISK">Fatigue Risk</SelectItem>
                                </SelectContent>
                            </Select>

                            <div className="flex gap-2">
                                <Input
                                    placeholder="Cari nama karyawan..."
                                    value={searchNama}
                                    onChange={(e) => setSearchNama(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && applyFilter({ nama: searchNama || null })}
                                    className="w-52"
                                />
                                <Button variant="outline" size="icon" onClick={() => applyFilter({ nama: searchNama || null })}>
                                    <Search className="h-4 w-4" />
                                </Button>
                            </div>

                            {hasActiveFilters && (
                                <Button variant="ghost" size="sm" onClick={handleClearFilters} className="text-muted-foreground">
                                    Hapus Filter
                                </Button>
                            )}
                        </div>

                        {/* Batas Jam Pengisian */}
                        <div className="mt-4 flex flex-wrap items-end gap-3 rounded-lg border border-dashed border-orange-300 bg-orange-50/50 p-3 dark:border-orange-800 dark:bg-orange-900/10">
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-medium text-orange-700 dark:text-orange-400">
                                    ⏰ Batas Waktu Pengisian Absensi
                                </label>
                                <p className="text-xs text-muted-foreground">
                                    Karyawan yang mengisi setelah jam ini dianggap terlambat
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Input
                                    type="time"
                                    value={batasJam}
                                    onChange={(e) => setBatasJam(e.target.value)}
                                    className="w-32"
                                />
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => applyFilter({ batas_jam: batasJam })}
                                    className="border-orange-300 text-orange-700 hover:bg-orange-100 dark:border-orange-700 dark:text-orange-400"
                                >
                                    Terapkan
                                </Button>
                            </div>
                            <Select
                                value={filters.terlambat ?? 'all'}
                                onValueChange={(v) => applyFilter({ terlambat: v === 'all' ? null : v })}
                            >
                                <SelectTrigger className="w-48 border-orange-300 dark:border-orange-700">
                                    <SelectValue placeholder="Semua Karyawan" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Semua Karyawan</SelectItem>
                                    <SelectItem value="1">🔴 Terlambat Mengisi</SelectItem>
                                    <SelectItem value="0">✅ Tepat Waktu</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {hasActiveFilters && (
                            <div className="mt-3 flex flex-wrap gap-2">
                                {filters.bulan && <Badge variant="secondary">Bulan: {BULAN_NAMES[filters.bulan] ?? filters.bulan}</Badge>}
                                {filters.tahun && <Badge variant="secondary">Tahun: {filters.tahun}</Badge>}
                                {(filters.tanggal_dari || filters.tanggal_sampai) && (
                                    <Badge variant="secondary" className="gap-1">
                                        <Calendar className="h-3 w-3" />
                                        {filters.tanggal_dari
                                            ? new Date(filters.tanggal_dari).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
                                            : '...'}
                                        {' – '}
                                        {filters.tanggal_sampai
                                            ? new Date(filters.tanggal_sampai).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
                                            : '...'}
                                    </Badge>
                                )}
                                {filters.departemen && <Badge variant="secondary">Dept: {filters.departemen}</Badge>}
                                {filters.section && <Badge variant="secondary">Section: {filters.section}</Badge>}
                                {filters.shift && <Badge variant="secondary">Shift {filters.shift}</Badge>}
                                {filters.status_tidur && <Badge variant="secondary">Status: {filters.status_tidur}</Badge>}
                                {filters.terlambat === '1' && <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">🔴 Terlambat Mengisi</Badge>}
                                {filters.terlambat === '0' && <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">✅ Tepat Waktu</Badge>}
                                {filters.nama && <Badge variant="secondary">Nama: {filters.nama}</Badge>}
                                <Button variant="ghost" size="sm" onClick={handleClearFilters} className="h-6 px-2 text-xs text-muted-foreground">
                                    Hapus semua
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* ── Table ── */}
                <Card>
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-medium">Data Absensi Karyawan</CardTitle>
                            <span className="text-xs text-muted-foreground">
                                {absensi.length} entri · halaman {page} dari {totalPages || 1}
                            </span>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        {absensi.length === 0 ? (
                            <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
                                <Calendar className="h-10 w-10 opacity-30" />
                                <p className="text-sm">Tidak ada data absensi</p>
                                {hasActiveFilters && (
                                    <Button variant="link" size="sm" onClick={handleClearFilters}>
                                        Hapus filter untuk melihat semua data
                                    </Button>
                                )}
                            </div>
                        ) : (
                            <>
                            {/* Scroll area dengan tinggi tetap */}
                            <div className="overflow-x-auto">
                                <div className="max-h-[600px] overflow-y-auto">
                                <table className="w-full text-sm">
                                    <thead className="sticky top-0 z-10">
                                        <tr className="border-b bg-muted/90 backdrop-blur-sm">
                                            <th className="px-4 py-3 text-left font-medium text-muted-foreground">ID</th>
                                            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tanggal</th>
                                            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Hari</th>
                                            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Shift</th>
                                            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Waktu Mulai</th>
                                            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Nama</th>
                                            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Section</th>
                                            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Jabatan</th>
                                            <th className="px-4 py-3 text-left font-medium text-muted-foreground">NRP</th>
                                            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Departemen</th>
                                            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Kegiatan</th>
                                            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Judul Kegiatan</th>
                                            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Lokasi</th>
                                            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Mulai Tidur</th>
                                            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Bangun Tidur</th>
                                            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Durasi Tidur</th>
                                            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status Tidur</th>
                                            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Jam Isi</th>
                                            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Keterlambatan</th>
                                            {isAdmin && (
                                                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Aksi</th>
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {pagedAbsensi.map((row, idx) => (
                                            <tr
                                                key={idx}
                                                className={`transition-colors hover:bg-muted/30 ${
                                                    row.status_tidur === 'FATIGUE RISK'
                                                        ? 'bg-red-50/40 dark:bg-red-900/10'
                                                        : row.status_tidur === 'COACHING ATASAN'
                                                          ? 'bg-yellow-50/40 dark:bg-yellow-900/10'
                                                          : ''
                                                }`}
                                            >
                                                <td className="px-4 py-3">
                                                    <span className="rounded bg-muted px-2 py-0.5 font-mono text-xs font-medium">
                                                        {row.daily_id ?? '-'}
                                                    </span>
                                                </td>
                                                <td className="whitespace-nowrap px-4 py-3 font-medium">
                                                    {row.tanggal_formatted || row.tanggal || '-'}
                                                </td>
                                                <td className="px-4 py-3 text-muted-foreground">{row.hari || '-'}</td>
                                                <td className="px-4 py-3">
                                                    {row.shift ? <ShiftBadge shift={row.shift} /> : '-'}
                                                </td>
                                                <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{row.waktu_mulai || '-'}</td>
                                                <td className="px-4 py-3 font-medium">{row.nama || '-'}</td>
                                                <td className="px-4 py-3 text-muted-foreground">{row.section || '-'}</td>
                                                <td className="px-4 py-3 text-muted-foreground">{row.jabatan || '-'}</td>
                                                <td className="px-4 py-3 text-muted-foreground">{row.nrp || '-'}</td>
                                                <td className="px-4 py-3 text-muted-foreground">{row.departemen || '-'}</td>
                                                <td className="max-w-40 truncate px-4 py-3 text-muted-foreground">{row.kegiatan || '-'}</td>
                                                <td className="max-w-48 px-4 py-3 text-muted-foreground">
                                                    {row.judul_kegiatan
                                                        ? <span className="text-xs">{row.judul_kegiatan}</span>
                                                        : <span className="text-muted-foreground">-</span>}
                                                </td>
                                                <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{row.lokasi || '-'}</td>
                                                <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{row.mulai_tidur || '-'}</td>
                                                <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{row.bangun_tidur || '-'}</td>
                                                <td className="whitespace-nowrap px-4 py-3 font-medium">
                                                    {row.durasi_tidur_label && row.durasi_tidur_label !== '-'
                                                        ? row.durasi_tidur_label
                                                        : <span className="text-muted-foreground">-</span>
                                                    }
                                                </td>
                                                <td className="px-4 py-3">
                                                    {row.status_tidur && row.status_tidur !== 'UNKNOWN'
                                                        ? <StatusTidurBadge status={row.status_tidur} />
                                                        : <span className="text-muted-foreground">-</span>
                                                    }
                                                </td>
                                                <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                                                    {row.jam_isi ?? '-'}
                                                </td>
                                                <td className="whitespace-nowrap px-4 py-3">
                                                    {row.terlambat ? (
                                                        <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
                                                            <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                                                            +{row.selisih_terlambat}
                                                        </span>
                                                    ) : row.jam_isi ? (
                                                        <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                                            <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                                                            Tepat Waktu
                                                        </span>
                                                    ) : (
                                                        <span className="text-muted-foreground">-</span>
                                                    )}
                                                </td>
                                                                {/* Aksi */}
                                                {isAdmin && (
                                                <td className="whitespace-nowrap px-4 py-3">
                                                    <div className="flex items-center gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7 text-blue-600 hover:bg-blue-50 hover:text-blue-700 dark:text-blue-400 dark:hover:bg-blue-900/20"
                                                            onClick={() => router.get(`/absensi/${row.db_id}/edit`)}
                                                            title="Edit"
                                                        >
                                                            <Pencil className="h-3.5 w-3.5" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7 text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
                                                            onClick={() => setDeleteRow(row)}
                                                            title="Hapus"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </div>
                                                </td>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                </div>
                            </div>

                            {/* Pagination footer */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-between border-t px-4 py-3">
                                    <p className="text-xs text-muted-foreground">
                                        Menampilkan {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, absensi.length)} dari {absensi.length} entri
                                    </p>
                                    <div className="flex items-center gap-1">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-7 px-2 text-xs"
                                            onClick={() => setPage(1)}
                                            disabled={page === 1}
                                        >
                                            «
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-7 px-2 text-xs"
                                            onClick={() => setPage(p => Math.max(1, p - 1))}
                                            disabled={page === 1}
                                        >
                                            ‹ Prev
                                        </Button>
                                        {/* Nomor halaman */}
                                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                                            .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                                            .reduce<(number | '...')[]>((acc, p, i, arr) => {
                                                if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push('...');
                                                acc.push(p);
                                                return acc;
                                            }, [])
                                            .map((p, i) =>
                                                p === '...' ? (
                                                    <span key={`ellipsis-${i}`} className="px-1 text-xs text-muted-foreground">…</span>
                                                ) : (
                                                    <Button
                                                        key={p}
                                                        variant={page === p ? 'default' : 'outline'}
                                                        size="sm"
                                                        className="h-7 w-7 p-0 text-xs"
                                                        onClick={() => setPage(p as number)}
                                                    >
                                                        {p}
                                                    </Button>
                                                )
                                            )}
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-7 px-2 text-xs"
                                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                            disabled={page === totalPages}
                                        >
                                            Next ›
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-7 px-2 text-xs"
                                            onClick={() => setPage(totalPages)}
                                            disabled={page === totalPages}
                                        >
                                            »
                                        </Button>
                                    </div>
                                </div>
                            )}
                            </>
                        )}
                    </CardContent>
                </Card>

            </div>

            {/* ── Modals ── */}
            <DeleteConfirmModal
                open={deleteRow !== null}
                onClose={() => setDeleteRow(null)}
                onConfirm={handleDelete}
                nama={deleteRow?.nama ?? ''}
                processing={isDeleting}
            />
        </>
    );
}

AbsensiDashboard.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Absensi', href: '/absensi' },
    ],
};

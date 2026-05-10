import { Head, router } from '@inertiajs/react';
import {
    AlertCircle,
    Building2,
    Calendar,
    Clock,
    Download,
    RefreshCw,
    Search,
    ShieldAlert,
    ShieldCheck,
    ShieldX,
    Users,
} from 'lucide-react';
import { useState } from 'react';
import * as XLSX from 'xlsx';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const BULAN_NAMES: Record<string, string> = {
    '01': 'Januari', '02': 'Februari', '03': 'Maret', '04': 'April',
    '05': 'Mei', '06': 'Juni', '07': 'Juli', '08': 'Agustus',
    '09': 'September', '10': 'Oktober', '11': 'November', '12': 'Desember',
};

type StatusTidur = 'FIT TO WORK' | 'COACHING ATASAN' | 'FATIGUE RISK' | 'UNKNOWN';

interface AbsensiRow {
    daily_id?: string;
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

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AbsensiDashboard({
    absensi, stats, namaList, bulanList, tahunList,
    departemenList, shiftList, sectionList, filters, error, totalRows,
}: Props) {
    const [searchNama, setSearchNama] = useState(filters.nama ?? '');
    const [batasJam, setBatasJam] = useState(filters.batas_jam ?? '09:00');
    const [isRefreshing, setIsRefreshing] = useState(false);

    const applyFilter = (updates: Partial<Filters>) => {
        const merged = { ...filters, ...updates };
        const params: Record<string, string> = {};

        // Selalu sertakan batas_jam (pakai state lokal sebagai fallback)
        params.batas_jam = merged.batas_jam ?? batasJam ?? '09:00';

        if (merged.bulan) params.bulan = merged.bulan;
        if (merged.tahun) params.tahun = merged.tahun;
        if (merged.nama) params.nama = merged.nama;
        if (merged.departemen) params.departemen = merged.departemen;
        if (merged.shift) params.shift = merged.shift;
        if (merged.status_tidur) params.status_tidur = merged.status_tidur;
        if (merged.section) params.section = merged.section;
        // terlambat bisa '0' (falsy) jadi pakai !== null/undefined
        if (merged.terlambat != null && merged.terlambat !== '') {
            params.terlambat = merged.terlambat;
        }

        router.get('/absensi', params, { preserveState: true, replace: true });
    };

    const handleRefresh = () => {
        setIsRefreshing(true);
        router.reload({ onFinish: () => setIsRefreshing(false) });
    };

    const handleClearFilters = () => {
        setSearchNama('');
        router.get('/absensi', {}, { preserveState: false, replace: true });
    };

    const handleExport = () => {
        // Siapkan data untuk Excel
        const rows = absensi.map((row, idx) => ({
            'No': idx + 1,
            'ID': row.daily_id ?? '',
            'Tanggal': row.tanggal_formatted ?? row.tanggal ?? '',
            'Hari': row.hari ?? '',
            'Shift': row.shift ? `Shift ${row.shift}` : '',
            'Waktu Mulai': row.waktu_mulai ?? '',
            'Nama': row.nama ?? '',
            'Section': row.section ?? '',
            'Jabatan': row.jabatan ?? '',
            'NRP': row.nrp ?? '',
            'Departemen': row.departemen ?? '',
            'Kegiatan': row.kegiatan ?? '',
            'Mulai Tidur': row.mulai_tidur ?? '',
            'Bangun Tidur': row.bangun_tidur ?? '',
            'Durasi Tidur': row.durasi_tidur_label ?? '',
            'Status Tidur': row.status_tidur ?? '',
            'Jam Isi': row.jam_isi ?? '',
            'Keterlambatan': row.terlambat
                ? `Terlambat +${row.selisih_terlambat}`
                : row.jam_isi ? 'Tepat Waktu' : '',
        }));

        const ws = XLSX.utils.json_to_sheet(rows);

        // Auto column width
        const colWidths = Object.keys(rows[0] ?? {}).map((key) => ({
            wch: Math.max(key.length, ...rows.map((r) => String(r[key as keyof typeof r] ?? '').length)) + 2,
        }));
        ws['!cols'] = colWidths;

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Absensi');

        // Nama file dengan info filter aktif
        const parts = ['Absensi'];
        if (filters.bulan) parts.push(BULAN_NAMES[filters.bulan] ?? filters.bulan);
        if (filters.tahun) parts.push(filters.tahun);
        if (filters.departemen) parts.push(filters.departemen);
        if (filters.section) parts.push(filters.section);
        if (filters.shift) parts.push(`Shift${filters.shift}`);
        if (filters.terlambat === '1') parts.push('Terlambat');
        if (filters.terlambat === '0') parts.push('TepakWaktu');
        const filename = parts.join('_') + '.xlsx';

        XLSX.writeFile(wb, filename);
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
                            Sumber: Google Sheets · {totalRows} total entri
                        </p>
                    </div>
                    <div className="flex gap-2">
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
                            onClick={handleRefresh}
                            disabled={isRefreshing}
                            className="w-fit gap-2"
                        >
                            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                            Refresh Data
                        </Button>
                    </div>
                </div>

                {/* ── Error ── */}
                {error && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
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
                            <Select value={filters.bulan ?? 'all'} onValueChange={(v) => applyFilter({ bulan: v === 'all' ? null : v })}>
                                <SelectTrigger className="w-40"><SelectValue placeholder="Semua Bulan" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Semua Bulan</SelectItem>
                                    {bulanList.map((b) => <SelectItem key={b} value={b}>{BULAN_NAMES[b] ?? b}</SelectItem>)}
                                </SelectContent>
                            </Select>

                            <Select value={filters.tahun ?? 'all'} onValueChange={(v) => applyFilter({ tahun: v === 'all' ? null : v })}>
                                <SelectTrigger className="w-32"><SelectValue placeholder="Semua Tahun" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Semua Tahun</SelectItem>
                                    {tahunList.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                </SelectContent>
                            </Select>

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
                            <span className="text-xs text-muted-foreground">{absensi.length} entri ditampilkan</span>
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
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b bg-muted/50">
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
                                            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Mulai Tidur</th>
                                            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Bangun Tidur</th>
                                            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Durasi Tidur</th>
                                            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status Tidur</th>
                                            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Jam Isi</th>
                                            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Keterlambatan</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {absensi.map((row, idx) => (
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
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>

            </div>
        </>
    );
}

AbsensiDashboard.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Absensi', href: '/absensi' },
    ],
};

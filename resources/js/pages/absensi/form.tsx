import { Head, useForm } from '@inertiajs/react';
import { AlertCircle, CheckCircle2, Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// ─── Opsi ─────────────────────────────────────────────────────────────────────
// (opsi dimuat dari DB via formConfigs prop)

// ─── Tipe ─────────────────────────────────────────────────────────────────────

interface FieldConfig {
    label: string;
    options: string[];
    is_required: boolean;
}

type FormFields = {
    tanggal: string;
    shift: string;
    waktu_mulai: string;
    perusahaan: string;
    perusahaan_other: string;
    departemen: string;
    departemen_other: string;
    kegiatan: string;
    kegiatan_other: string;
    peran_kegiatan: string;   // 'Pemateri' | 'Audience' | ''
    judul_kegiatan: string;
    nama: string;
    section: string;
    section_other: string;
    lokasi: string;
    lokasi_other: string;
    jabatan: string;
    nrp: string;
    mulai_tidur: string;
    bangun_tidur: string;
};

// ─── Helper durasi tidur ──────────────────────────────────────────────────────

function hitungDurasi(mulai: string, bangun: string) {
    if (!mulai || !bangun) return null;
    try {
        const [mH, mM] = mulai.split(':').map(Number);
        const [bH, bM] = bangun.split(':').map(Number);
        let total = (bH * 60 + bM) - (mH * 60 + mM);
        if (total <= 0) total += 24 * 60;
        const jam = Math.floor(total / 60);
        const menit = total % 60;
        const label = `${jam} jam${menit > 0 ? ` ${menit} menit` : ''}`;
        const status: 'fit' | 'coaching' | 'fatigue' = jam >= 6 ? 'fit' : jam >= 5 ? 'coaching' : 'fatigue';
        return { jam, menit, label, status };
    } catch { return null; }
}

const STATUS_INFO = {
    fit:      { label: 'Fit to Work',     color: 'text-green-700 dark:text-green-400',  bg: 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800',  icon: '✅' },
    coaching: { label: 'Coaching Atasan', color: 'text-yellow-700 dark:text-yellow-400', bg: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800', icon: '⚠️' },
    fatigue:  { label: 'Fatigue Risk',    color: 'text-red-700 dark:text-red-400',    bg: 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800',    icon: '🚨' },
};

// ─── Radio Group ─────────────────────────────────────────────────────────────

function RadioGroup({
    label, required, options, value, onChange, otherValue, onOtherChange, error,
}: {
    label: string;
    required?: boolean;
    options: string[];
    value: string;
    onChange: (v: string) => void;
    otherValue?: string;
    onOtherChange?: (v: string) => void;
    error?: string;
}) {
    return (
        <div className="space-y-2">
            <Label className="text-sm font-semibold text-foreground">
                {label}{required && <span className="ml-1 text-red-500">*</span>}
            </Label>
            <div className="space-y-2 rounded-xl border bg-muted/20 p-3">
                {options.map((opt) => (
                    <label key={opt} className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted/50">
                        <input
                            type="radio"
                            name={label}
                            value={opt}
                            checked={value === opt}
                            onChange={() => onChange(opt)}
                            className="h-4 w-4 accent-blue-600"
                        />
                        <span className="text-sm">{opt}</span>
                    </label>
                ))}
                {/* Other input */}
                {value === 'Other' && onOtherChange && (
                    <div className="ml-7 mt-1">
                        <Input
                            value={otherValue ?? ''}
                            onChange={(e) => onOtherChange(e.target.value)}
                            placeholder="Tulis di sini..."
                            className="h-8 text-sm"
                            autoFocus
                        />
                    </div>
                )}
            </div>
            {error && (
                <p className="flex items-center gap-1 text-xs text-red-500">
                    <AlertCircle className="h-3 w-3" />{error}
                </p>
            )}
        </div>
    );
}

// ─── Jabatan Field (dropdown + input bebas jika "Lainnya") ───────────────────

const JABATAN_LIST = [
    'Dept Head', 'Section Head', 'Planner', 'Plant Engineer', 'She Coor',
    'Instruktur', 'Plant Asessor', 'GL', 'Mekanik', 'Welder', 'Tyreman',
    'Driver STD', 'FGDP', 'Mekanik Magang', 'Magang PKL', 'Washingman',
    'Lainnya (Isi sendiri...)',
];

function JabatanField({ value, onChange, error }: {
    value: string;
    onChange: (v: string) => void;
    error?: string;
}) {
    const isOther = value !== '' && !JABATAN_LIST.slice(0, -1).includes(value);
    const selectValue = isOther ? 'Lainnya (Isi sendiri...)' : value;

    return (
        <div className="space-y-2">
            <Label className="text-sm font-semibold text-foreground">Jabatan</Label>
            <select
                value={selectValue}
                onChange={(e) => {
                    const v = e.target.value;
                    if (v === 'Lainnya (Isi sendiri...)') {
                        onChange('');
                    } else {
                        onChange(v);
                    }
                }}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
                <option value="">— Pilih jabatan —</option>
                {JABATAN_LIST.map((j) => (
                    <option key={j} value={j}
                        className={j === 'GL' ? 'font-bold' : ''}
                    >
                        {j === 'GL' ? '⭐ GL' : j}
                    </option>
                ))}
            </select>
            {/* Input bebas jika pilih Lainnya */}
            {(selectValue === 'Lainnya (Isi sendiri...)' || isOther) && (
                <Input
                    value={isOther ? value : ''}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="Tulis jabatan Anda..."
                    autoFocus
                />
            )}
            {error && (
                <p className="flex items-center gap-1 text-xs text-red-500">
                    <AlertCircle className="h-3 w-3" />{error}
                </p>
            )}
        </div>
    );
}

// ─── Field wrapper ────────────────────────────────────────────────────────────

function Field({ label, required, error, hint, children }: {
    label: string; required?: boolean; error?: string; hint?: string; children: React.ReactNode;
}) {
    return (
        <div className="space-y-1.5">
            <Label className="text-sm font-semibold text-foreground">
                {label}{required && <span className="ml-1 text-red-500">*</span>}
            </Label>
            {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
            {children}
            {error && (
                <p className="flex items-center gap-1 text-xs text-red-500">
                    <AlertCircle className="h-3 w-3" />{error}
                </p>
            )}
        </div>
    );
}

// ─── Divider ─────────────────────────────────────────────────────────────────

function Divider({ label }: { label: string }) {
    return (
        <div className="flex items-center gap-3 py-1">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
            <div className="h-px flex-1 bg-border" />
        </div>
    );
}

// ─── Main Form ────────────────────────────────────────────────────────────────

export default function AbsensiForm({
    defaultTanggal,
    formConfigs = {},
}: {
    defaultTanggal: string;
    defaultHari: string;
    formConfigs: Record<string, FieldConfig>;
}) {
    // Helper: ambil opsi dari config, tambahkan 'Other' di akhir
    const opts = (key: string, fallback: string[]) =>
        [...(formConfigs[key]?.options ?? fallback), 'Other'];

    const perusahaanOpts = opts('perusahaan', ['PT KPP MINING']);
    const departemenOpts = opts('departemen', ['PLANT']);
    const kegiatanOpts   = opts('kegiatan',   ['P5M', 'SAFETY TALK', 'SAFETY ALERT']);
    const sectionOpts    = opts('section',     ['* Service & Fabrikasi', '* Daily, Repair & Fabrikasi', '* Tyre']);
    const lokasiOpts     = opts('lokasi',      ['WS 25', 'Quarry', 'Crusher']);

    // Field-field tambahan dari admin (selain field bawaan)
    const extraFields = Object.entries(formConfigs).filter(
        ([key]) => !['perusahaan', 'departemen', 'kegiatan', 'section', 'lokasi'].includes(key)
    );
    const { data, setData, post, processing, errors } = useForm<FormFields>({
        tanggal: defaultTanggal,
        shift: '',
        waktu_mulai: '',
        perusahaan: 'PT KPP MINING',
        perusahaan_other: '',
        departemen: 'PLANT',
        departemen_other: '',
        kegiatan: '',
        kegiatan_other: '',
        peran_kegiatan: '',
        judul_kegiatan: '',
        nama: '',
        section: '',
        section_other: '',
        lokasi: '',
        lokasi_other: '',
        jabatan: '',
        nrp: '',
        mulai_tidur: '',
        bangun_tidur: '',
    });

    // Hanya SAFETY TALK yang membutuhkan pilihan Pemateri/Audience
    const KEGIATAN_DENGAN_PERAN = ['SAFETY TALK'];
    const kegiatanAktif = data.kegiatan === 'Other' ? data.kegiatan_other : data.kegiatan;
    const butuhPeran = KEGIATAN_DENGAN_PERAN.includes(kegiatanAktif);
    const isPemateri = butuhPeran && data.peran_kegiatan === 'Pemateri';
    const isAudience = butuhPeran && data.peran_kegiatan === 'Audience';
    // GL atau Pemateri → wajib isi judul & jabatan dapat bintang
    // Pengecualian: GL + Audience = absen biasa, tidak perlu judul
    const isGL = data.jabatan.toUpperCase() === 'GL';
    const wajibJudul = isPemateri || (isGL && !isAudience && !butuhPeran);
    // Tampilkan bintang di jabatan hanya jika Pemateri (bukan GL Audience)
    const showStar = isPemateri;

    const [durasi, setDurasi] = useState<ReturnType<typeof hitungDurasi>>(null);

    useEffect(() => {
        setDurasi(hitungDurasi(data.mulai_tidur, data.bangun_tidur));
    }, [data.mulai_tidur, data.bangun_tidur]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const payload = {
            ...data,
            perusahaan: data.perusahaan === 'Other' ? data.perusahaan_other : data.perusahaan,
            departemen: data.departemen === 'Other' ? data.departemen_other : data.departemen,
            kegiatan:   data.kegiatan   === 'Other' ? data.kegiatan_other   : data.kegiatan,
            section:    data.section    === 'Other' ? data.section_other    : data.section,
            lokasi:     data.lokasi     === 'Other' ? data.lokasi_other     : data.lokasi,
            // Tambahkan peran ke judul jika Pemateri
            judul_kegiatan: data.judul_kegiatan,
        };
        post('/absensi/form', { data: payload });
    };

    return (
        <>
            <Head title="Form Absensi Karyawan" />

            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
                <div className="mx-auto max-w-xl px-4 py-8">

                    {/* Header */}
                    <div className="mb-5 overflow-hidden rounded-2xl shadow-sm">
                        <div className="bg-gradient-to-r from-blue-600 to-violet-600 px-6 py-6">
                            <h1 className="text-xl font-bold text-white">Lembar Absensi P5M/SAFETY TALK</h1>
                            <p className="mt-0.5 text-sm font-medium text-blue-100">(Incl. FATIGUE CONTROL)</p>
                        </div>
                        {/* Banner logo perusahaan */}
                        <div className="border border-t-0 border-blue-200 bg-white dark:border-blue-900 dark:bg-gray-900">
                            <img
                                src="/form-perusahaan.jpeg"
                                alt="KPP Mining · CISS · ASTO · PLANT ASTO"
                                className="h-24 w-full object-contain px-4 py-2"
                            />
                        </div>
                        <div className="flex items-center gap-2 border border-t-0 border-blue-200 bg-blue-50/80 px-6 py-2.5 dark:border-blue-900 dark:bg-blue-950/30">
                            <AlertCircle className="h-3.5 w-3.5 text-blue-500" />
                            <p className="text-xs text-blue-700 dark:text-blue-400">
                                Kolom bertanda <span className="font-bold text-red-500">*</span> wajib diisi
                            </p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className="space-y-5 rounded-2xl border bg-white p-6 shadow-sm dark:bg-gray-900">

                            {/* 1. Tanggal Pelaksanaan */}
                            <Field label="Tanggal Pelaksanaan" required error={errors.tanggal}>
                                <Input
                                    type="date"
                                    value={data.tanggal}
                                    onChange={(e) => setData('tanggal', e.target.value)}
                                    className={errors.tanggal ? 'border-red-400' : ''}
                                />
                            </Field>

                            {/* 2. Shift Kerja */}
                            <Field label="Shift Kerja" required error={errors.shift}>
                                <div className="flex gap-3">
                                    {[
                                        { v: '1', label: '1' },
                                        { v: '2', label: '2' },
                                    ].map(({ v, label }) => (
                                        <label key={v} className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 py-3 text-sm font-semibold transition-all ${
                                            data.shift === v
                                                ? 'border-blue-500 bg-blue-500 text-white shadow-md'
                                                : 'border-muted bg-muted/30 text-muted-foreground hover:border-blue-300'
                                        }`}>
                                            <input
                                                type="radio"
                                                name="shift"
                                                value={v}
                                                checked={data.shift === v}
                                                onChange={() => setData('shift', v)}
                                                className="sr-only"
                                            />
                                            Shift {label}
                                        </label>
                                    ))}
                                </div>
                            </Field>

                            {/* 3. Waktu Mulai */}
                            <Field label="Waktu Mulai (Jam)" required error={errors.waktu_mulai}>
                                <Input
                                    type="time"
                                    value={data.waktu_mulai}
                                    onChange={(e) => setData('waktu_mulai', e.target.value)}
                                    className={errors.waktu_mulai ? 'border-red-400' : ''}
                                />
                            </Field>

                            <Divider label="Informasi Perusahaan" />

                            {/* 4. Perusahaan Pelaksana */}
                            <RadioGroup
                                label={formConfigs['perusahaan']?.label ?? 'Perusahaan Pelaksana'}
                                options={perusahaanOpts}
                                value={data.perusahaan}
                                onChange={(v) => setData('perusahaan', v)}
                                otherValue={data.perusahaan_other}
                                onOtherChange={(v) => setData('perusahaan_other', v)}
                                error={errors.perusahaan}
                            />

                            {/* 5. Departemen Pelaksana */}
                            <RadioGroup
                                label={formConfigs['departemen']?.label ?? 'Departemen Pelaksana'}
                                options={departemenOpts}
                                value={data.departemen}
                                onChange={(v) => setData('departemen', v)}
                                otherValue={data.departemen_other}
                                onOtherChange={(v) => setData('departemen_other', v)}
                                error={errors.departemen}
                            />

                            {/* 6. Kegiatan */}
                            <RadioGroup
                                label={formConfigs['kegiatan']?.label ?? 'Kegiatan'}
                                required
                                options={kegiatanOpts}
                                value={data.kegiatan}
                                onChange={(v) => {
                                    setData('kegiatan', v);
                                    // Reset peran & judul saat kegiatan berubah
                                    setData('peran_kegiatan', '');
                                    setData('judul_kegiatan', '');
                                }}
                                otherValue={data.kegiatan_other}
                                onOtherChange={(v) => setData('kegiatan_other', v)}
                                error={errors.kegiatan}
                            />

                            {/* 6b. Peran — muncul jika kegiatan P5M/SAFETY TALK/SAFETY ALERT */}
                            {butuhPeran && (
                                <div className="space-y-2 rounded-xl border-2 border-blue-200 bg-blue-50/50 p-4 dark:border-blue-800 dark:bg-blue-950/20">
                                    <Label className="text-sm font-semibold text-blue-800 dark:text-blue-300">
                                        Peran dalam {kegiatanAktif}
                                        <span className="ml-1 text-red-500">*</span>
                                    </Label>
                                    <div className="flex gap-3">
                                        {/* Pemateri */}
                                        <label className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 py-3 text-sm font-semibold transition-all ${
                                            data.peran_kegiatan === 'Pemateri'
                                                ? 'border-orange-500 bg-orange-500 text-white shadow-md'
                                                : 'border-muted bg-muted/30 text-muted-foreground hover:border-orange-300'
                                        }`}>
                                            <input
                                                type="radio"
                                                name="peran_kegiatan"
                                                value="Pemateri"
                                                checked={data.peran_kegiatan === 'Pemateri'}
                                                onChange={() => setData('peran_kegiatan', 'Pemateri')}
                                                className="sr-only"
                                            />
                                            ⭐ Pemateri
                                        </label>
                                        {/* Audience */}
                                        <label className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 py-3 text-sm font-semibold transition-all ${
                                            data.peran_kegiatan === 'Audience'
                                                ? 'border-blue-500 bg-blue-500 text-white shadow-md'
                                                : 'border-muted bg-muted/30 text-muted-foreground hover:border-blue-300'
                                        }`}>
                                            <input
                                                type="radio"
                                                name="peran_kegiatan"
                                                value="Audience"
                                                checked={data.peran_kegiatan === 'Audience'}
                                                onChange={() => {
                                                    setData('peran_kegiatan', 'Audience');
                                                    setData('judul_kegiatan', ''); // reset judul
                                                }}
                                                className="sr-only"
                                            />
                                            👥 Audience
                                        </label>
                                    </div>
                                    {isPemateri && (
                                        <p className="text-xs text-orange-700 dark:text-orange-400">
                                            Sebagai Pemateri, jabatan Anda akan ditandai ⭐ dan wajib mengisi judul materi.
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* 6c. Judul Kegiatan — muncul jika GL atau Pemateri */}
                            {wajibJudul && (
                                <div className="space-y-1.5 rounded-xl border-2 border-orange-300 bg-orange-50/50 p-4 dark:border-orange-700 dark:bg-orange-950/20">
                                    <div className="flex items-center gap-2">
                                        <span className="text-base">⭐</span>
                                        <Label className="text-sm font-semibold text-orange-800 dark:text-orange-300">
                                            Judul {kegiatanAktif || 'Kegiatan'}
                                            <span className="ml-1 text-red-500">*</span>
                                        </Label>
                                    </div>
                                    <p className="text-xs text-orange-700 dark:text-orange-400">
                                        Wajib diisi untuk Pemateri — tulis judul materi yang disampaikan
                                    </p>
                                    <textarea
                                        value={data.judul_kegiatan}
                                        onChange={(e) => setData('judul_kegiatan', e.target.value)}
                                        placeholder={`Contoh: Bahaya Kelelahan saat Berkendara, Prosedur Penggunaan APD...`}
                                        rows={3}
                                        className={`w-full rounded-lg border bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-400 dark:bg-gray-900 ${
                                            errors.judul_kegiatan ? 'border-red-400' : 'border-orange-200 dark:border-orange-800'
                                        }`}
                                    />
                                    {errors.judul_kegiatan && (
                                        <p className="flex items-center gap-1 text-xs text-red-500">
                                            <AlertCircle className="h-3 w-3" />{errors.judul_kegiatan}
                                        </p>
                                    )}
                                </div>
                            )}

                            <Divider label="Data Karyawan" />

                            {/* 7. Nama */}
                            <Field label="Nama" required error={errors.nama}>
                                <Input
                                    value={data.nama}
                                    onChange={(e) => setData('nama', e.target.value)}
                                    placeholder="Nama lengkap"
                                    className={errors.nama ? 'border-red-400' : ''}
                                />
                            </Field>

                            {/* 8. Section */}
                            <RadioGroup
                                label={formConfigs['section']?.label ?? 'Section'}
                                required
                                options={sectionOpts}
                                value={data.section}
                                onChange={(v) => setData('section', v)}
                                otherValue={data.section_other}
                                onOtherChange={(v) => setData('section_other', v)}
                                error={errors.section}
                            />

                            {/* 8b. Lokasi */}
                            <RadioGroup
                                label={formConfigs['lokasi']?.label ?? 'Lokasi'}
                                options={lokasiOpts}
                                value={data.lokasi}
                                onChange={(v) => setData('lokasi', v)}
                                otherValue={data.lokasi_other}
                                onOtherChange={(v) => setData('lokasi_other', v)}
                                error={errors.lokasi}
                            />

                            {/* 9. Jabatan — dropdown + bintang jika Pemateri/GL */}
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold text-foreground">
                                    Jabatan
                                    {showStar && (
                                        <span className="ml-2 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-bold text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                                            ⭐ Pemateri
                                        </span>
                                    )}
                                </Label>
                                <JabatanField
                                    value={data.jabatan}
                                    onChange={(v) => setData('jabatan', v)}
                                    error={errors.jabatan}
                                />
                            </div>

                            {/* Field tambahan dari admin (misal: Lokasi) */}
                            {extraFields.map(([key, cfg]) => (
                                <RadioGroup
                                    key={key}
                                    label={cfg.label}
                                    required={cfg.is_required}
                                    options={[...cfg.options, 'Other']}
                                    value={(data as any)[key] ?? ''}
                                    onChange={(v) => setData(key as any, v)}
                                    otherValue={(data as any)[`${key}_other`] ?? ''}
                                    onOtherChange={(v) => setData(`${key}_other` as any, v)}
                                />
                            ))}

                            {/* 10. NRP */}
                            <Field label="NRP" required error={errors.nrp}>
                                <Input
                                    value={data.nrp}
                                    onChange={(e) => setData('nrp', e.target.value)}
                                    placeholder="Nomor registrasi pegawai"
                                    className={errors.nrp ? 'border-red-400' : ''}
                                />
                            </Field>

                            <Divider label="Data Tidur" />

                            {/* 11. Mulai Tidur */}
                            <Field label="MULAI TIDUR" required error={errors.mulai_tidur}>
                                <div className="relative">
                                    <Moon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        type="time"
                                        value={data.mulai_tidur}
                                        onChange={(e) => setData('mulai_tidur', e.target.value)}
                                        className={`pl-9 ${errors.mulai_tidur ? 'border-red-400' : ''}`}
                                    />
                                </div>
                            </Field>

                            {/* 12. Bangun Tidur */}
                            <Field label="BANGUN TIDUR" required error={errors.bangun_tidur}>
                                <div className="relative">
                                    <Sun className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        type="time"
                                        value={data.bangun_tidur}
                                        onChange={(e) => setData('bangun_tidur', e.target.value)}
                                        className={`pl-9 ${errors.bangun_tidur ? 'border-red-400' : ''}`}
                                    />
                                </div>
                            </Field>

                            {/* Preview durasi tidur real-time */}
                            {durasi && (
                                <div className={`flex items-center gap-3 rounded-xl border p-4 ${STATUS_INFO[durasi.status].bg}`}>
                                    <span className="text-2xl">{STATUS_INFO[durasi.status].icon}</span>
                                    <div>
                                        <p className={`font-semibold ${STATUS_INFO[durasi.status].color}`}>
                                            {STATUS_INFO[durasi.status].label}
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            Durasi tidur: <strong>{durasi.label}</strong>
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Panduan */}
                            <div className="rounded-xl border border-dashed border-muted-foreground/30 bg-muted/20 p-4">
                                <p className="mb-2 text-xs font-semibold text-muted-foreground">Panduan Status Tidur:</p>
                                <div className="space-y-1 text-xs text-muted-foreground">
                                    <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-green-500" /><span><strong>Fit to Work</strong> — tidur ≥ 6 jam</span></div>
                                    <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-yellow-500" /><span><strong>Coaching Atasan</strong> — tidur 5–6 jam</span></div>
                                    <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-red-500" /><span><strong>Fatigue Risk</strong> — tidur &lt; 5 jam</span></div>
                                </div>
                            </div>

                            {/* Submit */}
                            <Button
                                type="submit"
                                disabled={processing}
                                className="w-full bg-gradient-to-r from-blue-600 to-violet-600 py-6 text-base font-semibold hover:from-blue-700 hover:to-violet-700"
                            >
                                {processing ? (
                                    <span className="flex items-center gap-2">
                                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                        Mengirim...
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-2">
                                        <CheckCircle2 className="h-5 w-5" />
                                        Kirim Absensi
                                    </span>
                                )}
                            </Button>

                        </div>
                    </form>
                </div>
            </div>
        </>
    );
}

AbsensiForm.layout = undefined;

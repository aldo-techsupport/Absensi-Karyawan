import { Head, router, useForm } from '@inertiajs/react';
import { AlertCircle, CheckCircle2, Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// ─── Opsi (sama dengan form publik) ──────────────────────────────────────────

const PERUSAHAAN_OPTIONS = ['PT KPP MINING', 'Other'];
const DEPARTEMEN_OPTIONS = ['PLANT', 'MINE', 'ENGINEERING', 'HSE', 'HR & GA', 'FINANCE', 'IT', 'LOGISTIC', 'Other'];
const KEGIATAN_OPTIONS   = ['P5M', 'SAFETY TALK', 'SAFETY ALERT', 'Other'];
const SECTION_OPTIONS    = ['* Service & Fabrikasi', '* Daily, Repair & Fabrikasi', '* Tyre', 'KLM', 'KHG', 'Other'];

// ─── Tipe ─────────────────────────────────────────────────────────────────────

interface RecordData {
    id: number;
    tanggal: string;
    shift: string;
    waktu_mulai: string;
    perusahaan: string;
    departemen: string;
    kegiatan: string;
    nama: string;
    section: string;
    jabatan: string;
    nrp: string;
    mulai_tidur: string;
    bangun_tidur: string;
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
    nama: string;
    section: string;
    section_other: string;
    jabatan: string;
    nrp: string;
    mulai_tidur: string;
    bangun_tidur: string;
};

// ─── Helper ───────────────────────────────────────────────────────────────────

function resolveOther(options: string[], value: string): { selected: string; other: string } {
    if (!value) return { selected: '', other: '' };
    if (options.includes(value)) return { selected: value, other: '' };
    return { selected: 'Other', other: value };
}

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

// ─── Sub-komponen ─────────────────────────────────────────────────────────────

function Field({ label, required, error, children }: {
    label: string; required?: boolean; error?: string; children: React.ReactNode;
}) {
    return (
        <div className="space-y-1.5">
            <Label className="text-sm font-semibold">
                {label}{required && <span className="ml-1 text-red-500">*</span>}
            </Label>
            {children}
            {error && <p className="flex items-center gap-1 text-xs text-red-500"><AlertCircle className="h-3 w-3" />{error}</p>}
        </div>
    );
}

function RadioGroup({ label, required, options, value, onChange, otherValue, onOtherChange, error }: {
    label: string; required?: boolean; options: string[]; value: string;
    onChange: (v: string) => void; otherValue?: string; onOtherChange?: (v: string) => void; error?: string;
}) {
    return (
        <div className="space-y-2">
            <Label className="text-sm font-semibold">{label}{required && <span className="ml-1 text-red-500">*</span>}</Label>
            <div className="space-y-2 rounded-xl border bg-muted/20 p-3">
                {options.map((opt) => (
                    <label key={opt} className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted/50">
                        <input type="radio" name={label} value={opt} checked={value === opt} onChange={() => onChange(opt)} className="h-4 w-4 accent-blue-600" />
                        <span className="text-sm">{opt}</span>
                    </label>
                ))}
                {value === 'Other' && onOtherChange && (
                    <div className="ml-7 mt-1">
                        <Input value={otherValue ?? ''} onChange={(e) => onOtherChange(e.target.value)} placeholder="Tulis di sini..." className="h-8 text-sm" autoFocus />
                    </div>
                )}
            </div>
            {error && <p className="flex items-center gap-1 text-xs text-red-500"><AlertCircle className="h-3 w-3" />{error}</p>}
        </div>
    );
}

const JABATAN_LIST = ['GL', 'Mekanik', 'Dept Head', 'Section Head', 'Planner', 'Plant Engineer', 'She Coor', 'Instruktur', 'Plant Asessor', 'Welder', 'Tyreman', 'Driver STD', 'FGDP', 'Mekanik Magang', 'Magang PKL', 'Washingman', 'Lainnya (Isi sendiri...)'];

function JabatanField({ value, onChange, error }: { value: string; onChange: (v: string) => void; error?: string }) {
    const isOther = value !== '' && !JABATAN_LIST.slice(0, -1).includes(value);
    const selectValue = isOther ? 'Lainnya (Isi sendiri...)' : value;
    return (
        <div className="space-y-2">
            <Label className="text-sm font-semibold">Jabatan</Label>
            <select
                value={selectValue}
                onChange={(e) => {
                    const v = e.target.value;
                    onChange(v === 'Lainnya (Isi sendiri...)' ? '' : v);
                }}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
                <option value="">— Pilih jabatan —</option>
                {JABATAN_LIST.map((j) => (
                    <option key={j} value={j}>{j === 'GL' ? '⭐ GL' : j}</option>
                ))}
            </select>
            {(selectValue === 'Lainnya (Isi sendiri...)' || isOther) && (
                <Input value={isOther ? value : ''} onChange={(e) => onChange(e.target.value)} placeholder="Tulis jabatan Anda..." autoFocus />
            )}
            {error && <p className="flex items-center gap-1 text-xs text-red-500"><AlertCircle className="h-3 w-3" />{error}</p>}
        </div>
    );
}

function Divider({ label }: { label: string }) {
    return (
        <div className="flex items-center gap-3 py-1">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
            <div className="h-px flex-1 bg-border" />
        </div>
    );
}

// ─── Main Edit Page ───────────────────────────────────────────────────────────

export default function AbsensiEdit({ record }: { record: RecordData }) {
    // Resolve nilai "Other" dari data yang ada
    const perusahaanResolved = resolveOther(PERUSAHAAN_OPTIONS, record.perusahaan);
    const departemenResolved = resolveOther(DEPARTEMEN_OPTIONS, record.departemen);
    const kegiatanResolved   = resolveOther(KEGIATAN_OPTIONS, record.kegiatan);
    const sectionResolved    = resolveOther(SECTION_OPTIONS, record.section);

    const { data, setData, put, processing, errors } = useForm<FormFields>({
        tanggal:          record.tanggal,
        shift:            record.shift,
        waktu_mulai:      record.waktu_mulai,
        perusahaan:       perusahaanResolved.selected,
        perusahaan_other: perusahaanResolved.other,
        departemen:       departemenResolved.selected,
        departemen_other: departemenResolved.other,
        kegiatan:         kegiatanResolved.selected,
        kegiatan_other:   kegiatanResolved.other,
        nama:             record.nama,
        section:          sectionResolved.selected,
        section_other:    sectionResolved.other,
        jabatan:          record.jabatan,
        nrp:              record.nrp,
        mulai_tidur:      record.mulai_tidur,
        bangun_tidur:     record.bangun_tidur,
    });

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
        };
        put(`/absensi/${record.id}/edit`, { data: payload });
    };

    return (
        <>
            <Head title={`Edit Absensi — ${record.nama}`} />

            <div className="mx-auto max-w-xl px-4 py-6">

                {/* Admin header */}
                <div className="mb-5 overflow-hidden rounded-2xl shadow-sm">
                    <div className="bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium uppercase tracking-wider text-orange-100">Mode Admin</p>
                                <h1 className="text-xl font-bold text-white">Edit Data Absensi</h1>
                                <p className="mt-0.5 text-sm text-orange-100">ID: A-{String(record.id).padStart(4, '0')} · {record.nama}</p>
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => router.get('/absensi')}
                                className="border-white/30 bg-white/10 text-white hover:bg-white/20"
                            >
                                ← Kembali
                            </Button>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 border border-t-0 border-orange-200 bg-orange-50/80 px-6 py-2.5 dark:border-orange-900 dark:bg-orange-950/30">
                        <AlertCircle className="h-3.5 w-3.5 text-orange-500" />
                        <p className="text-xs text-orange-700 dark:text-orange-400">
                            Perubahan akan ditandai sebagai <strong>diedit</strong> dan tidak akan di-overwrite saat sync
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="space-y-5 rounded-2xl border bg-white p-6 shadow-sm dark:bg-gray-900">

                        {/* 1. Tanggal */}
                        <Field label="Tanggal Pelaksanaan" required error={errors.tanggal}>
                            <Input type="date" value={data.tanggal} onChange={(e) => setData('tanggal', e.target.value)} className={errors.tanggal ? 'border-red-400' : ''} />
                        </Field>

                        {/* 2. Shift */}
                        <Field label="Shift Kerja" required error={errors.shift}>
                            <div className="flex gap-3">
                                {['1', '2'].map((v) => (
                                    <label key={v} className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 py-3 text-sm font-semibold transition-all ${data.shift === v ? 'border-blue-500 bg-blue-500 text-white shadow-md' : 'border-muted bg-muted/30 text-muted-foreground hover:border-blue-300'}`}>
                                        <input type="radio" name="shift" value={v} checked={data.shift === v} onChange={() => setData('shift', v)} className="sr-only" />
                                        Shift {v}
                                    </label>
                                ))}
                            </div>
                        </Field>

                        {/* 3. Waktu Mulai */}
                        <Field label="Waktu Mulai (Jam)" required error={errors.waktu_mulai}>
                            <Input type="time" value={data.waktu_mulai} onChange={(e) => setData('waktu_mulai', e.target.value)} className={errors.waktu_mulai ? 'border-red-400' : ''} />
                        </Field>

                        <Divider label="Informasi Perusahaan" />

                        {/* 4. Perusahaan */}
                        <RadioGroup label="Perusahaan Pelaksana" options={PERUSAHAAN_OPTIONS} value={data.perusahaan} onChange={(v) => setData('perusahaan', v)} otherValue={data.perusahaan_other} onOtherChange={(v) => setData('perusahaan_other', v)} error={errors.perusahaan} />

                        {/* 5. Departemen */}
                        <RadioGroup label="Departemen Pelaksana" options={DEPARTEMEN_OPTIONS} value={data.departemen} onChange={(v) => setData('departemen', v)} otherValue={data.departemen_other} onOtherChange={(v) => setData('departemen_other', v)} error={errors.departemen} />

                        {/* 6. Kegiatan */}
                        <RadioGroup label="Kegiatan" required options={KEGIATAN_OPTIONS} value={data.kegiatan} onChange={(v) => setData('kegiatan', v)} otherValue={data.kegiatan_other} onOtherChange={(v) => setData('kegiatan_other', v)} error={errors.kegiatan} />

                        <Divider label="Data Karyawan" />

                        {/* 7. Nama */}
                        <Field label="Nama" required error={errors.nama}>
                            <Input value={data.nama} onChange={(e) => setData('nama', e.target.value)} placeholder="Nama lengkap" className={errors.nama ? 'border-red-400' : ''} />
                        </Field>

                        {/* 8. Section */}
                        <RadioGroup label="Section" required options={SECTION_OPTIONS} value={data.section} onChange={(v) => setData('section', v)} otherValue={data.section_other} onOtherChange={(v) => setData('section_other', v)} error={errors.section} />

                        {/* 9. Jabatan */}
                        <JabatanField value={data.jabatan} onChange={(v) => setData('jabatan', v)} error={errors.jabatan} />

                        {/* 10. NRP */}
                        <Field label="NRP" error={errors.nrp}>
                            <Input value={data.nrp} onChange={(e) => setData('nrp', e.target.value)} placeholder="Nomor registrasi pegawai" />
                        </Field>

                        <Divider label="Data Tidur" />

                        {/* 11. Mulai Tidur */}
                        <Field label="MULAI TIDUR" required error={errors.mulai_tidur}>
                            <div className="relative">
                                <Moon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input type="time" value={data.mulai_tidur} onChange={(e) => setData('mulai_tidur', e.target.value)} className={`pl-9 ${errors.mulai_tidur ? 'border-red-400' : ''}`} />
                            </div>
                        </Field>

                        {/* 12. Bangun Tidur */}
                        <Field label="BANGUN TIDUR" required error={errors.bangun_tidur}>
                            <div className="relative">
                                <Sun className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input type="time" value={data.bangun_tidur} onChange={(e) => setData('bangun_tidur', e.target.value)} className={`pl-9 ${errors.bangun_tidur ? 'border-red-400' : ''}`} />
                            </div>
                        </Field>

                        {/* Preview durasi */}
                        {durasi && (
                            <div className={`flex items-center gap-3 rounded-xl border p-4 ${STATUS_INFO[durasi.status].bg}`}>
                                <span className="text-2xl">{STATUS_INFO[durasi.status].icon}</span>
                                <div>
                                    <p className={`font-semibold ${STATUS_INFO[durasi.status].color}`}>{STATUS_INFO[durasi.status].label}</p>
                                    <p className="text-sm text-muted-foreground">Durasi tidur: <strong>{durasi.label}</strong></p>
                                </div>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-3 pt-2">
                            <Button type="button" variant="outline" className="flex-1" onClick={() => router.get('/absensi')}>
                                Batal
                            </Button>
                            <Button type="submit" disabled={processing} className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 font-semibold hover:from-orange-600 hover:to-amber-600">
                                {processing ? (
                                    <span className="flex items-center gap-2">
                                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                        Menyimpan...
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-2">
                                        <CheckCircle2 className="h-4 w-4" />
                                        Simpan Perubahan
                                    </span>
                                )}
                            </Button>
                        </div>

                    </div>
                </form>
            </div>
        </>
    );
}

AbsensiEdit.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Absensi', href: '/absensi' },
        { title: 'Edit', href: '#' },
    ],
};

import { Head, useForm } from '@inertiajs/react';
import { AlertCircle, CheckCircle2, Loader2, MapPin, Moon, ShieldAlert, Sun } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
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
    'GL', 'Mekanik',
    'Dept Head', 'Section Head', 'Planner', 'Plant Engineer', 'She Coor',
    'Instruktur', 'Plant Asessor', 'Welder', 'Tyreman',
    'Driver STD', 'FGDP', 'Mekanik Magang', 'Magang PKL', 'Washingman',
    'Lainnya (Isi sendiri...)',
];

function JabatanField({ value, onChange, error }: {
    value: string;
    onChange: (v: string) => void;
    error?: string;
}) {
    // isOther: true jika value bukan dari daftar baku (termasuk string kosong setelah pilih Lainnya)
    const [showOther, setShowOther] = useState(
        value !== '' && !JABATAN_LIST.slice(0, -1).includes(value)
    );
    const selectValue = showOther ? 'Lainnya (Isi sendiri...)' : value;

    return (
        <div className="space-y-2">
            <Label className="text-sm font-semibold text-foreground">Jabatan</Label>
            <select
                value={selectValue}
                onChange={(e) => {
                    const v = e.target.value;
                    if (v === 'Lainnya (Isi sendiri...)') {
                        setShowOther(true);
                        onChange(''); // kosongkan agar user isi sendiri
                    } else {
                        setShowOther(false);
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
            {showOther && (
                <Input
                    value={value}
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
    formIsOpen = true,
    closedMessage = 'Form absensi sedang ditutup. Silakan hubungi admin.',
    locationEnabled = false,
    locationLat = null,
    locationLng = null,
    locationRadius = 100,
    locationEmbedHtml = null,
}: {
    defaultTanggal: string;
    defaultHari: string;
    formConfigs: Record<string, FieldConfig>;
    formIsOpen?: boolean;
    closedMessage?: string;
    locationEnabled?: boolean;
    locationLat?: number | null;
    locationLng?: number | null;
    locationRadius?: number;
    locationEmbedHtml?: string | null;
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
        waktu_mulai: new Date().toTimeString().slice(0, 5), // otomatis jam sekarang
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

    // Update waktu_mulai setiap menit secara real-time (tidak bisa diedit user)
    useEffect(() => {
        const tick = () => setData('waktu_mulai', new Date().toTimeString().slice(0, 5));
        tick(); // set langsung
        const interval = setInterval(tick, 60000); // update tiap menit
        return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // P5M, SAFETY TALK, SAFETY ALERT semua butuh pilihan Pemateri/Audience
    const KEGIATAN_DENGAN_PERAN = ['P5M', 'SAFETY TALK', 'SAFETY ALERT'];
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

    // ─── Geolocation ──────────────────────────────────────────────────────────
    type GeoStatus = 'idle' | 'requesting' | 'granted' | 'denied' | 'unavailable' | 'out_of_range';
    const [geoStatus, setGeoStatus] = useState<GeoStatus>('idle');
    const [geoDistance, setGeoDistance] = useState<number | null>(null);
    const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
    const watchIdRef = useRef<number | null>(null);

    // Haversine formula — returns distance in meters
    function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
        const R = 6371000;
        const toRad = (d: number) => (d * Math.PI) / 180;
        const dLat = toRad(lat2 - lat1);
        const dLng = toRad(lng2 - lng1);
        const a =
            Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    useEffect(() => {
        if (!locationEnabled || locationLat == null || locationLng == null) return;

        if (!navigator.geolocation) {
            setGeoStatus('unavailable');
            return;
        }

        setGeoStatus('requesting');

        const onSuccess = (pos: GeolocationPosition) => {
            const dist = haversineDistance(
                pos.coords.latitude, pos.coords.longitude,
                locationLat!, locationLng!,
            );
            setGeoDistance(Math.round(dist));
            setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
            setGeoStatus(dist <= locationRadius ? 'granted' : 'out_of_range');
        };

        const onError = (err: GeolocationPositionError) => {
            if (err.code === GeolocationPositionError.PERMISSION_DENIED) {
                setGeoStatus('denied');
            } else {
                setGeoStatus('unavailable');
            }
        };

        const opts: PositionOptions = { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 };

        // Get once immediately, then watch for updates
        navigator.geolocation.getCurrentPosition(onSuccess, onError, opts);
        watchIdRef.current = navigator.geolocation.watchPosition(onSuccess, onError, opts);

        return () => {
            if (watchIdRef.current != null) {
                navigator.geolocation.clearWatch(watchIdRef.current);
            }
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [locationEnabled, locationLat, locationLng, locationRadius]);

    // Block submit if location validation is active and not granted
    const locationBlocked = locationEnabled && locationLat != null && geoStatus !== 'granted';

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (locationBlocked) return; // safety guard
        post('/absensi/form', {
            // @ts-expect-error — Inertia useForm supports transform via this pattern
            data: {
                ...data,
                perusahaan: data.perusahaan === 'Other' ? data.perusahaan_other : data.perusahaan,
                departemen: data.departemen === 'Other' ? data.departemen_other : data.departemen,
                kegiatan:   data.kegiatan   === 'Other' ? data.kegiatan_other   : data.kegiatan,
                section:    data.section    === 'Other' ? data.section_other    : data.section,
                lokasi:     data.lokasi     === 'Other' ? data.lokasi_other     : data.lokasi,
                judul_kegiatan: data.judul_kegiatan,
                // Kirim koordinat user ke backend untuk validasi server-side
                user_lat: userCoords?.lat ?? null,
                user_lng: userCoords?.lng ?? null,
            },
        });
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

                    {/* ── Validasi Lokasi GPS — Full Blocker ── */}
                    {locationEnabled && locationLat != null && geoStatus !== 'granted' && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                            <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl dark:bg-gray-900 overflow-hidden">

                                {/* Header */}
                                <div className={`px-6 py-5 text-center ${
                                    geoStatus === 'idle' || geoStatus === 'requesting'
                                        ? 'bg-yellow-500'
                                        : geoStatus === 'denied' || geoStatus === 'unavailable'
                                        ? 'bg-red-500'
                                        : 'bg-red-500'
                                }`}>
                                    <div className="flex justify-center mb-3">
                                        {geoStatus === 'idle' || geoStatus === 'requesting' ? (
                                            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20">
                                                <Loader2 className="h-8 w-8 animate-spin text-white" />
                                            </div>
                                        ) : (
                                            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20">
                                                <ShieldAlert className="h-8 w-8 text-white" />
                                            </div>
                                        )}
                                    </div>
                                    <h2 className="text-lg font-bold text-white">
                                        {geoStatus === 'idle' || geoStatus === 'requesting'
                                            ? 'Meminta Izin Lokasi...'
                                            : geoStatus === 'denied'
                                            ? 'Izin Lokasi Ditolak'
                                            : geoStatus === 'unavailable'
                                            ? 'GPS Tidak Tersedia'
                                            : 'Di Luar Area Absensi'}
                                    </h2>
                                </div>

                                {/* Body */}
                                <div className="px-6 py-5 space-y-4">
                                    {(geoStatus === 'idle' || geoStatus === 'requesting') && (
                                        <>
                                            <p className="text-center text-sm text-gray-600 dark:text-gray-400">
                                                Absensi ini memerlukan verifikasi lokasi. Izinkan akses lokasi saat browser meminta izin.
                                            </p>
                                            <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-950/30">
                                                <p className="text-xs font-semibold text-yellow-800 dark:text-yellow-300 mb-1">Cara mengizinkan:</p>
                                                <p className="text-xs text-yellow-700 dark:text-yellow-400">
                                                    Klik <strong>"Izinkan"</strong> atau <strong>"Allow"</strong> pada popup yang muncul di browser Anda.
                                                </p>
                                            </div>
                                        </>
                                    )}

                                    {geoStatus === 'denied' && (
                                        <>
                                            <p className="text-center text-sm text-gray-600 dark:text-gray-400">
                                                Izin lokasi ditolak. Aktifkan lokasi terlebih dahulu lalu muat ulang halaman.
                                            </p>

                                            {/* Android Chrome */}
                                            <div className="rounded-xl border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30 overflow-hidden">
                                                <div className="flex items-center gap-2 bg-red-100 dark:bg-red-900/40 px-4 py-2">
                                                    <span className="text-base">🤖</span>
                                                    <p className="text-xs font-bold text-red-800 dark:text-red-300">Android (Chrome)</p>
                                                </div>
                                                <ol className="text-xs text-red-700 dark:text-red-400 space-y-1 list-decimal list-inside px-4 py-3">
                                                    <li>Tap ikon <strong>🔒</strong> di address bar</li>
                                                    <li>Tap <strong>Izin situs / Site settings</strong></li>
                                                    <li>Tap <strong>Lokasi / Location</strong></li>
                                                    <li>Pilih <strong>Izinkan / Allow</strong></li>
                                                    <li>Kembali ke halaman ini &amp; muat ulang</li>
                                                </ol>
                                            </div>

                                            {/* iOS Safari */}
                                            <div className="rounded-xl border border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/30 overflow-hidden">
                                                <div className="flex items-center gap-2 bg-orange-100 dark:bg-orange-900/40 px-4 py-2">
                                                    <span className="text-base">🍎</span>
                                                    <p className="text-xs font-bold text-orange-800 dark:text-orange-300">iPhone / iPad (Safari)</p>
                                                </div>
                                                <ol className="text-xs text-orange-700 dark:text-orange-400 space-y-1 list-decimal list-inside px-4 py-3">
                                                    <li>Buka <strong>Pengaturan</strong> HP</li>
                                                    <li>Scroll ke <strong>Safari</strong></li>
                                                    <li>Tap <strong>Lokasi / Location</strong></li>
                                                    <li>Pilih <strong>Izinkan / Allow</strong></li>
                                                    <li>Kembali ke browser &amp; muat ulang</li>
                                                </ol>
                                            </div>

                                            {/* Desktop */}
                                            <div className="rounded-xl border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/30 overflow-hidden">
                                                <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700/40 px-4 py-2">
                                                    <span className="text-base">🖥️</span>
                                                    <p className="text-xs font-bold text-gray-700 dark:text-gray-300">Desktop (Chrome / Edge)</p>
                                                </div>
                                                <ol className="text-xs text-gray-600 dark:text-gray-400 space-y-1 list-decimal list-inside px-4 py-3">
                                                    <li>Klik ikon <strong>🔒</strong> atau <strong>ⓘ</strong> di address bar</li>
                                                    <li>Cari <strong>Lokasi / Location</strong></li>
                                                    <li>Ubah ke <strong>Izinkan / Allow</strong></li>
                                                    <li>Muat ulang halaman ini</li>
                                                </ol>
                                            </div>

                                            <Button
                                                className="w-full"
                                                onClick={() => window.location.reload()}
                                            >
                                                Muat Ulang Halaman
                                            </Button>
                                        </>
                                    )}

                                    {geoStatus === 'unavailable' && (
                                        <>
                                            <p className="text-center text-sm text-gray-600 dark:text-gray-400">
                                                GPS tidak tersedia di perangkat ini atau sinyal lemah. Pastikan GPS aktif dan coba lagi.
                                            </p>
                                            <Button
                                                className="w-full"
                                                onClick={() => window.location.reload()}
                                            >
                                                Coba Lagi
                                            </Button>
                                        </>
                                    )}

                                    {geoStatus === 'out_of_range' && (
                                        <>
                                            <p className="text-center text-sm text-gray-600 dark:text-gray-400">
                                                Anda berada <strong>{geoDistance != null ? `±${geoDistance} meter` : 'terlalu jauh'}</strong> dari lokasi absensi.
                                                Harus dalam radius <strong>{locationRadius} meter</strong>.
                                            </p>
                                            {locationEmbedHtml && (
                                                <div className="overflow-hidden rounded-xl border">
                                                    <div
                                                        className="h-40 w-full [&_iframe]:h-full [&_iframe]:w-full [&_iframe]:border-0"
                                                        dangerouslySetInnerHTML={{
                                                            __html: locationEmbedHtml
                                                                .replace(/width="[^"]*"/g, '')
                                                                .replace(/height="[^"]*"/g, ''),
                                                        }}
                                                    />
                                                </div>
                                            )}
                                            {locationLat && locationLng && (
                                                <a
                                                    href={`https://www.google.com/maps?q=${locationLat},${locationLng}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="block"
                                                >
                                                    <Button variant="outline" className="w-full gap-2">
                                                        <MapPin className="h-4 w-4" />
                                                        Lihat Lokasi Absensi di Maps
                                                    </Button>
                                                </a>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Status lokasi kecil (saat granted) ── */}
                    {locationEnabled && locationLat != null && geoStatus === 'granted' && (
                        <div className="mb-4 flex items-center gap-2 rounded-xl border border-green-300 bg-green-50 px-4 py-2.5 dark:border-green-700 dark:bg-green-950/30">
                            <MapPin className="h-4 w-4 shrink-0 text-green-600 dark:text-green-400" />
                            <p className="text-sm font-medium text-green-800 dark:text-green-300">
                                Lokasi terverifikasi ✓
                                {geoDistance != null && (
                                    <span className="ml-1 font-normal text-green-700 dark:text-green-400">
                                        — ±{geoDistance} m dari lokasi absensi
                                    </span>
                                )}
                            </p>
                        </div>
                    )}

                    {/* ── Form Ditutup ── */}
                    {!formIsOpen && (
                        <div className="flex flex-col items-center gap-4 rounded-2xl border-2 border-red-200 bg-red-50 p-8 text-center dark:border-red-800 dark:bg-red-950/30">
                            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40">
                                <span className="text-3xl">🔒</span>
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-red-800 dark:text-red-300">Absen Ditutup</h2>
                                <p className="mt-1 text-sm text-red-700 dark:text-red-400">{closedMessage}</p>
                            </div>
                        </div>
                    )}

                    {formIsOpen && (
                    <form onSubmit={handleSubmit}>
                        <div className="space-y-5 rounded-2xl border bg-white p-6 shadow-sm dark:bg-gray-900">

                            {/* 1 & 3. Tanggal + Waktu Mulai — satu baris, keduanya otomatis */}
                            <div className="grid grid-cols-2 gap-3">
                                <Field label="Tanggal Pelaksanaan" required error={errors.tanggal}>
                                    <div className="flex items-center gap-2 rounded-lg border border-muted bg-muted/50 px-3 py-2 select-none h-10">
                                        <span className="text-sm font-mono font-medium">
                                            {data.tanggal
                                                ? new Date(data.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' })
                                                : '-'}
                                        </span>
                                        <span className="ml-auto text-xs text-muted-foreground">otomatis</span>
                                    </div>
                                    <input type="hidden" name="tanggal" value={data.tanggal} />
                                </Field>
                                <Field label="Waktu Mulai (Jam)" required error={errors.waktu_mulai}>
                                    <div className="flex items-center gap-2 rounded-lg border border-muted bg-muted/50 px-3 py-2 select-none h-10">
                                        <span className="text-sm font-mono font-medium">{data.waktu_mulai}</span>
                                        <span className="ml-auto text-xs text-muted-foreground">otomatis</span>
                                    </div>
                                    <input type="hidden" name="waktu_mulai" value={data.waktu_mulai} />
                                </Field>
                            </div>
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
                                    onChange={(e) => setData('nama', e.target.value.toUpperCase())}
                                    placeholder="NAMA LENGKAP"
                                    className={`uppercase ${errors.nama ? 'border-red-400' : ''}`}
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
                                required
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
                                    Jabatan <span className="text-red-500">*</span>
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
                                    onChange={(e) => setData('nrp', e.target.value.toUpperCase())}
                                    placeholder="NOMOR REGISTRASI PEGAWAI"
                                    className={`uppercase ${errors.nrp ? 'border-red-400' : ''}`}
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
                            {errors.location && (
                                <div className="flex items-center gap-2 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-700 dark:bg-red-950/30 dark:text-red-400">
                                    <ShieldAlert className="h-4 w-4 shrink-0" />
                                    {errors.location}
                                </div>
                            )}
                            <Button
                                type="submit"
                                disabled={processing || locationBlocked}
                                className={`w-full py-6 text-base font-semibold transition-all ${
                                    locationBlocked
                                        ? 'cursor-not-allowed bg-gray-400 opacity-60'
                                        : 'bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700'
                                }`}
                            >
                                {processing ? (
                                    <span className="flex items-center gap-2">
                                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                        Mengirim...
                                    </span>
                                ) : locationBlocked ? (
                                    <span className="flex items-center gap-2">
                                        <ShieldAlert className="h-5 w-5" />
                                        {geoStatus === 'requesting' || geoStatus === 'idle'
                                            ? 'Mendeteksi lokasi...'
                                            : geoStatus === 'denied'
                                            ? 'Izin lokasi diperlukan'
                                            : 'Di luar area absensi'}
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
                    )}
                </div>
            </div>
        </>
    );
}

AbsensiForm.layout = undefined;

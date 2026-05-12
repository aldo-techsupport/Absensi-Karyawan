import { Head, router } from '@inertiajs/react';
import { MapPin, Plus, Save, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Absensi', href: '/absensi' },
    { title: 'Lokasi Absensi', href: '/absensi/lokasi' },
];

interface LocationPoint {
    lat: string;
    lng: string;
    label: string;
    enabled: boolean;
}

interface Props {
    setting: {
        location_enabled: boolean;
        location_lat: number | null;
        location_lng: number | null;
        location_radius: number;
        location_embed_url: string | null;
        location_points: Array<{
            lat: number;
            lng: number;
            label?: string;
            enabled: boolean;
        }>;
    };
    flash?: { success?: string };
}

const MAX_POINTS = 10;

export default function LokasiAbsensi({ setting, flash }: Props) {
    const [enabled, setEnabled] = useState(setting.location_enabled);
    const [radius, setRadius]   = useState(setting.location_radius?.toString() ?? '100');
    const [saving, setSaving]   = useState(false);

    // Multi-koordinat state
    const [points, setPoints] = useState<LocationPoint[]>(() => {
        const existing = (setting.location_points ?? []).map(p => ({
            lat:     p.lat.toString(),
            lng:     p.lng.toString(),
            label:   p.label ?? '',
            enabled: p.enabled,
        }));

        // Migrasi: jika ada legacy single-point dan belum ada di points, tambahkan
        if (
            setting.location_lat != null &&
            setting.location_lng != null &&
            existing.length === 0
        ) {
            existing.push({
                lat:     setting.location_lat.toString(),
                lng:     setting.location_lng.toString(),
                label:   'Lokasi Utama',
                enabled: true,
            });
        }

        return existing;
    });

    // Titik yang sedang dipilih untuk preview peta
    const [previewIdx, setPreviewIdx] = useState<number>(0);

    // Input paste per titik (sementara, tidak disimpan ke DB)
    const [pasteInputs, setPasteInputs] = useState<string[]>(() => {
        const pts = (setting.location_points ?? []).map(p => ({
            lat: p.lat.toString(),
            lng: p.lng.toString(),
        }));
        // Jika ada legacy single-point dan belum ada points, tambahkan
        if (setting.location_lat != null && setting.location_lng != null && pts.length === 0) {
            return [`${setting.location_lat}, ${setting.location_lng}`];
        }
        return pts.map(p => p.lat && p.lng ? `${p.lat}, ${p.lng}` : '');
    });

    // Sync setelah save
    useEffect(() => {
        setEnabled(setting.location_enabled);
        setRadius(setting.location_radius?.toString() ?? '100');
        const synced = (setting.location_points ?? []).map(p => ({
            lat:     p.lat.toString(),
            lng:     p.lng.toString(),
            label:   p.label ?? '',
            enabled: p.enabled,
        }));
        setPoints(synced);
        setPasteInputs(synced.map(p => p.lat && p.lng ? `${p.lat}, ${p.lng}` : ''));
        setPreviewIdx(0);
    }, [setting]);

    // ── Helpers ──────────────────────────────────────────────────────────────

    const addPoint = () => {
        if (points.length >= MAX_POINTS) return;
        setPoints(prev => [...prev, { lat: '', lng: '', label: '', enabled: true }]);
        setPasteInputs(prev => [...prev, '']);
        setPreviewIdx(points.length); // fokus ke titik baru
    };

    const removePoint = (idx: number) => {
        setPoints(prev => prev.filter((_, i) => i !== idx));
        setPasteInputs(prev => prev.filter((_, i) => i !== idx));
        setPreviewIdx(prev => Math.max(0, prev === idx ? 0 : prev > idx ? prev - 1 : prev));
    };

    const updatePoint = (idx: number, field: keyof LocationPoint, value: string | boolean) => {
        setPoints(prev => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p));
    };

    const togglePoint = (idx: number) => {
        updatePoint(idx, 'enabled', !points[idx].enabled);
    };

    // Parse paste koordinat: "-0.931, 100.357" atau "-0.931 100.357"
    const handleCoordPaste = (idx: number, raw: string) => {
        // Pisahkan dengan koma, titik koma, atau spasi (abaikan spasi di sekitar pemisah)
        const parts = raw.trim().split(/[\s,;]+/).filter(Boolean);
        if (parts.length >= 2) {
            const lat = parts[0].replace(',', '.');
            const lng = parts[1].replace(',', '.');
            if (!isNaN(parseFloat(lat)) && !isNaN(parseFloat(lng))) {
                setPoints(prev => prev.map((p, i) =>
                    i === idx ? { ...p, lat, lng } : p
                ));
                setPreviewIdx(idx);
                return true;
            }
        }
        return false;
    };

    // ── Save ─────────────────────────────────────────────────────────────────

    const handleSave = () => {
        setSaving(true);

        // Ambil koordinat pertama yang valid sebagai legacy single-point
        const firstValid = points.find(p => p.lat !== '' && p.lng !== '');

        router.post('/absensi/form-setting/location', {
            location_enabled:   enabled,
            location_lat:       firstValid ? parseFloat(firstValid.lat) : null,
            location_lng:       firstValid ? parseFloat(firstValid.lng) : null,
            location_radius:    radius !== '' ? parseInt(radius) : 100,
            location_embed_url: firstValid
                ? `<iframe src="https://maps.google.com/maps?q=${firstValid.lat},${firstValid.lng}&z=17&output=embed&hl=id" width="600" height="450" style="border:0;" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`
                : null,
            location_points: points
                .filter(p => p.lat !== '' && p.lng !== '')
                .map(p => ({
                    lat:     parseFloat(p.lat),
                    lng:     parseFloat(p.lng),
                    label:   p.label || null,
                    enabled: p.enabled,
                })),
        }, {
            onFinish: () => setSaving(false),
        });
    };

    // ── Preview peta ─────────────────────────────────────────────────────────

    const previewPoint = points[previewIdx];
    const previewSrc = previewPoint?.lat && previewPoint?.lng
        ? `https://maps.google.com/maps?q=${previewPoint.lat},${previewPoint.lng}&z=17&output=embed&hl=id`
        : null;
    const mapsUrl = previewPoint?.lat && previewPoint?.lng
        ? `https://www.google.com/maps?q=${previewPoint.lat},${previewPoint.lng}`
        : null;

    const activeCount = points.filter(p => p.enabled && p.lat && p.lng).length;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Lokasi Absensi" />

            <div className="space-y-6 p-6">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold">Lokasi Absensi</h1>
                        <p className="text-sm text-muted-foreground">
                            Konfigurasi validasi GPS untuk form absensi karyawan
                        </p>
                    </div>
                    <Button onClick={handleSave} disabled={saving} className="gap-2">
                        <Save className="h-4 w-4" />
                        {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
                    </Button>
                </div>

                {/* Flash success */}
                {flash?.success && (
                    <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-800 dark:bg-green-950/30 dark:text-green-300">
                        ✓ {flash.success}
                    </div>
                )}

                <div className="grid gap-6 lg:grid-cols-2">

                    {/* ── Kolom kiri ── */}
                    <div className="space-y-5">

                        {/* Toggle validasi GPS */}
                        <div className="rounded-xl border bg-card p-5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-semibold">Validasi Lokasi GPS</p>
                                    <p className="mt-0.5 text-sm text-muted-foreground">
                                        {enabled
                                            ? 'Absensi hanya bisa dilakukan di area yang ditentukan'
                                            : 'Absensi bisa dilakukan dari mana saja'}
                                    </p>
                                </div>
                                <button type="button" onClick={() => setEnabled(!enabled)} aria-label="Toggle validasi GPS">
                                    {enabled
                                        ? <ToggleRight className="h-9 w-9 text-blue-600" />
                                        : <ToggleLeft className="h-9 w-9 text-muted-foreground" />}
                                </button>
                            </div>
                        </div>

                        {/* Radius */}
                        <div className="rounded-xl border bg-card p-5 space-y-3">
                            <p className="font-semibold">Radius Validasi</p>
                            <div className="flex items-center gap-3">
                                <Input
                                    type="number"
                                    min={10}
                                    max={5000}
                                    value={radius}
                                    onChange={(e) => setRadius(e.target.value)}
                                    className="w-36"
                                />
                                <span className="text-sm text-muted-foreground">meter</span>
                                <Badge variant={enabled ? 'default' : 'secondary'}>
                                    {enabled ? 'Aktif' : 'Nonaktif'}
                                </Badge>
                            </div>
                            <div className="rounded-lg border bg-muted/50 p-3">
                                <div className="flex items-start gap-2">
                                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                                    <p className="text-sm text-muted-foreground">
                                        Karyawan harus berada dalam radius{' '}
                                        <strong>{radius || '?'} meter</strong> dari salah satu titik aktif untuk dapat melakukan absensi.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Daftar koordinat */}
                        <div className="rounded-xl border bg-card p-5 space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <MapPin className="h-4 w-4 text-blue-500" />
                                    <p className="font-semibold">Titik Koordinat GPS</p>
                                    <Badge variant="outline" className="text-xs">
                                        {activeCount} aktif / {points.length} titik
                                    </Badge>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={addPoint}
                                    disabled={points.length >= MAX_POINTS}
                                    className="gap-1.5"
                                >
                                    <Plus className="h-3.5 w-3.5" />
                                    Tambah
                                </Button>
                            </div>

                            {points.length === 0 && (
                                <div className="rounded-lg border border-dashed bg-muted/30 py-8 text-center">
                                    <MapPin className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
                                    <p className="text-sm text-muted-foreground">Belum ada titik koordinat</p>
                                    <p className="mt-1 text-xs text-muted-foreground">Klik "Tambah" untuk menambahkan titik lokasi</p>
                                </div>
                            )}

                            <div className="space-y-3">
                                {points.map((point, idx) => (
                                    <div
                                        key={idx}
                                        onClick={() => setPreviewIdx(idx)}
                                        className={`rounded-lg border p-4 space-y-3 cursor-pointer transition-colors ${
                                            previewIdx === idx
                                                ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20'
                                                : 'hover:border-muted-foreground/30'
                                        } ${!point.enabled ? 'opacity-60' : ''}`}
                                    >
                                        {/* Baris atas: label + switch + hapus */}
                                        <div className="flex items-center gap-2">
                                            <Input
                                                placeholder={`Titik ${idx + 1} (nama lokasi)`}
                                                value={point.label}
                                                onChange={(e) => updatePoint(idx, 'label', e.target.value)}
                                                onClick={(e) => e.stopPropagation()}
                                                className="h-8 text-sm flex-1"
                                            />
                                            {/* Switch aktif/nonaktif per titik */}
                                            <button
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); togglePoint(idx); }}
                                                aria-label={point.enabled ? 'Nonaktifkan titik' : 'Aktifkan titik'}
                                                title={point.enabled ? 'Klik untuk nonaktifkan' : 'Klik untuk aktifkan'}
                                            >
                                                {point.enabled
                                                    ? <ToggleRight className="h-7 w-7 text-blue-600" />
                                                    : <ToggleLeft className="h-7 w-7 text-muted-foreground" />}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); removePoint(idx); }}
                                                aria-label="Hapus titik"
                                                className="text-muted-foreground hover:text-red-500 transition-colors"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>

                                        {/* Input paste koordinat */}
                                        <div className="space-y-1">
                                            <Label className="text-xs text-muted-foreground">
                                                Paste Koordinat
                                                <span className="ml-1 text-muted-foreground/60">(lat, lng)</span>
                                            </Label>
                                            <Input
                                                type="text"
                                                placeholder="-0.9318755, 100.3572522"
                                                value={pasteInputs[idx] ?? ''}
                                                onClick={(e) => e.stopPropagation()}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setPasteInputs(prev => {
                                                        const next = [...prev];
                                                        next[idx] = val;
                                                        return next;
                                                    });
                                                    handleCoordPaste(idx, val);
                                                }}
                                                onPaste={(e) => {
                                                    const pasted = e.clipboardData.getData('text');
                                                    if (handleCoordPaste(idx, pasted)) {
                                                        e.preventDefault();
                                                        setPasteInputs(prev => {
                                                            const next = [...prev];
                                                            next[idx] = pasted.trim();
                                                            return next;
                                                        });
                                                    }
                                                }}
                                                className="h-8 text-sm font-mono"
                                            />
                                        </div>

                                        {/* Baris bawah: lat + lng */}
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="space-y-1">
                                                <Label className="text-xs text-muted-foreground">Latitude</Label>
                                                <Input
                                                    type="number"
                                                    step="any"
                                                    placeholder="-0.932010"
                                                    value={point.lat}
                                                    onChange={(e) => updatePoint(idx, 'lat', e.target.value)}
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="h-8 text-sm"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-xs text-muted-foreground">Longitude</Label>
                                                <Input
                                                    type="number"
                                                    step="any"
                                                    placeholder="100.357643"
                                                    value={point.lng}
                                                    onChange={(e) => updatePoint(idx, 'lng', e.target.value)}
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="h-8 text-sm"
                                                />
                                            </div>
                                        </div>

                                        {/* Info koordinat + link maps */}
                                        {point.lat && point.lng && (
                                            <div className="flex items-center justify-between">
                                                <p className="font-mono text-xs text-muted-foreground">
                                                    {point.lat}, {point.lng}
                                                </p>
                                                <a
                                                    href={`https://www.google.com/maps?q=${point.lat},${point.lng}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
                                                >
                                                    Lihat di Maps ↗
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {points.length >= MAX_POINTS && (
                                <p className="text-center text-xs text-muted-foreground">
                                    Maksimal {MAX_POINTS} titik koordinat
                                </p>
                            )}
                        </div>

                    </div>

                    {/* ── Kolom kanan: Peta ── */}
                    <div className="space-y-4">
                        <div className="rounded-xl border bg-card overflow-hidden">
                            <div className="flex items-center justify-between border-b px-4 py-3">
                                <div className="flex items-center gap-2">
                                    <p className="font-semibold text-sm">Preview Peta</p>
                                    {points.length > 0 && (
                                        <Badge variant="outline" className="text-xs">
                                            Titik {previewIdx + 1}
                                            {points[previewIdx]?.label ? ` · ${points[previewIdx].label}` : ''}
                                        </Badge>
                                    )}
                                </div>
                                {mapsUrl && (
                                    <a href={mapsUrl} target="_blank" rel="noopener noreferrer">
                                        <Button variant="outline" size="sm" className="gap-1.5">
                                            <MapPin className="h-3.5 w-3.5" />
                                            Buka di Maps
                                        </Button>
                                    </a>
                                )}
                            </div>

                            {previewSrc ? (
                                <iframe
                                    key={previewSrc}
                                    title="Lokasi Absensi"
                                    src={previewSrc}
                                    className="aspect-video w-full border-0"
                                    allowFullScreen
                                    loading="lazy"
                                    referrerPolicy="no-referrer-when-downgrade"
                                />
                            ) : (
                                <div className="flex aspect-video flex-col items-center justify-center gap-3 bg-muted/30 p-8 text-center">
                                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                                        <MapPin className="h-8 w-8 text-primary" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium">Belum ada koordinat</p>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            {points.length === 0
                                                ? 'Tambahkan titik koordinat untuk menampilkan peta'
                                                : 'Isi Latitude dan Longitude pada titik yang dipilih'}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {previewPoint?.lat && previewPoint?.lng && (
                                <div className="border-t bg-muted/30 px-4 py-2 text-center">
                                    <p className="font-mono text-xs text-muted-foreground">
                                        {previewPoint.lat}, {previewPoint.lng} · radius {radius} meter
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Navigasi titik untuk preview */}
                        {points.length > 1 && (
                            <div className="flex flex-wrap gap-2">
                                {points.map((p, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => setPreviewIdx(idx)}
                                        className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                                            previewIdx === idx
                                                ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400'
                                                : 'hover:border-muted-foreground/40 text-muted-foreground'
                                        } ${!p.enabled ? 'opacity-50' : ''}`}
                                    >
                                        <span className={`h-1.5 w-1.5 rounded-full ${p.enabled ? 'bg-green-500' : 'bg-gray-400'}`} />
                                        {p.label || `Titik ${idx + 1}`}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </AppLayout>
    );
}

import { Head, router } from '@inertiajs/react';
import { MapPin, Save, ToggleLeft, ToggleRight } from 'lucide-react';
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

interface Props {
    setting: {
        location_enabled: boolean;
        location_lat: number | null;
        location_lng: number | null;
        location_radius: number;
        location_embed_url: string | null;
    };
    flash?: { success?: string };
}

// Generate embed HTML dari koordinat — menampilkan pin di titik koordinat
function generateEmbedHtml(lat: string, lng: string): string {
    const src = `https://maps.google.com/maps?q=${lat},${lng}&z=17&output=embed&hl=id`;
    return `<iframe src="${src}" width="600" height="450" style="border:0;" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
}

export default function LokasiAbsensi({ setting, flash }: Props) {
    const [enabled, setEnabled] = useState(setting.location_enabled);
    const [lat, setLat]         = useState(setting.location_lat?.toString() ?? '');
    const [lng, setLng]         = useState(setting.location_lng?.toString() ?? '');
    const [radius, setRadius]   = useState(setting.location_radius?.toString() ?? '100');
    const [saving, setSaving]   = useState(false);

    // Sync setelah save
    useEffect(() => {
        setEnabled(setting.location_enabled);
        setLat(setting.location_lat?.toString() ?? '');
        setLng(setting.location_lng?.toString() ?? '');
        setRadius(setting.location_radius?.toString() ?? '100');
    }, [setting]);

    const handleSave = () => {
        setSaving(true);
        router.post('/absensi/form-setting/location', {
            location_enabled:   enabled,
            location_lat:       lat !== '' ? parseFloat(lat) : null,
            location_lng:       lng !== '' ? parseFloat(lng) : null,
            location_radius:    radius !== '' ? parseInt(radius) : 100,
            // Selalu generate embed dari koordinat terbaru
            location_embed_url: lat && lng ? generateEmbedHtml(lat, lng) : null,
        }, {
            onFinish: () => setSaving(false),
        });
    };

    const mapsUrl = lat && lng ? `https://www.google.com/maps?q=${lat},${lng}` : null;

    // Preview peta real-time dari koordinat yang sedang diisi
    const previewSrc = lat && lng
        ? `https://maps.google.com/maps?q=${lat},${lng}&z=17&output=embed&hl=id`
        : null;

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

                        {/* Toggle */}
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
                                <button type="button" onClick={() => setEnabled(!enabled)} aria-label="Toggle">
                                    {enabled
                                        ? <ToggleRight className="h-9 w-9 text-blue-600" />
                                        : <ToggleLeft className="h-9 w-9 text-muted-foreground" />}
                                </button>
                            </div>
                        </div>

                        {/* Koordinat */}
                        <div className="rounded-xl border bg-card p-5 space-y-4">
                            <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-blue-500" />
                                <p className="font-semibold">Koordinat GPS</p>
                                {mapsUrl && (
                                    <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
                                        className="ml-auto text-xs font-medium text-blue-600 hover:underline dark:text-blue-400">
                                        Lihat di Maps ↗
                                    </a>
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-sm font-medium">Latitude</Label>
                                    <Input
                                        type="number"
                                        step="any"
                                        value={lat}
                                        onChange={(e) => setLat(e.target.value)}
                                        placeholder="-0.932010"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-sm font-medium">Longitude</Label>
                                    <Input
                                        type="number"
                                        step="any"
                                        value={lng}
                                        onChange={(e) => setLng(e.target.value)}
                                        placeholder="100.357643"
                                    />
                                </div>
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
                                        <strong>{radius || '?'} meter</strong> dari koordinat ini untuk dapat melakukan absensi.
                                    </p>
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* ── Kolom kanan: Peta ── */}
                    <div>
                        <div className="rounded-xl border bg-card overflow-hidden">
                            <div className="flex items-center justify-between border-b px-4 py-3">
                                <p className="font-semibold text-sm">Lokasi di Peta</p>
                                {mapsUrl && (
                                    <a href={mapsUrl} target="_blank" rel="noopener noreferrer">
                                        <Button variant="outline" size="sm" className="gap-1.5">
                                            <MapPin className="h-3.5 w-3.5" />
                                            Buka di Google Maps
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
                                            Isi Latitude dan Longitude untuk menampilkan peta
                                        </p>
                                    </div>
                                </div>
                            )}

                            {lat && lng && (
                                <div className="border-t bg-muted/30 px-4 py-2 text-center">
                                    <p className="font-mono text-xs text-muted-foreground">
                                        {lat}, {lng} · radius {radius} meter
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </AppLayout>
    );
}

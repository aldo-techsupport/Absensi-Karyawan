import { Head, router } from '@inertiajs/react';
import { Camera, CheckCircle2, FlipHorizontal, RefreshCcw, Smile, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useCameraLogic } from '@/hooks/use-camera-logic';

interface SelfiePageProps {
    nama: string;
    nrp: string;
    jabatan: string;
}

export default function AbsensiSelfie({ nama, nrp, jabatan }: SelfiePageProps) {
    const [capturedFile, setCapturedFile] = useState<File | null>(null);
    const [capturedPreview, setCapturedPreview] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const {
        videoRef,
        canvasRef,
        cameraActive,
        isCountingDown,
        countDown,
        isTakingPicture,
        facingMode,
        initCamera,
        stopCamera,
        flipCamera,
        startCountDown,
    } = useCameraLogic({
        onPhotoCapture: (file, preview) => {
            setCapturedFile(file);
            setCapturedPreview(preview);
        },
    });

    useEffect(() => {
        const t = setTimeout(() => initCamera(), 300);
        return () => {
            clearTimeout(t);
            stopCamera();
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        return () => {
            if (capturedPreview) URL.revokeObjectURL(capturedPreview);
        };
    }, [capturedPreview]);

    const handleRetake = () => {
        if (capturedPreview) URL.revokeObjectURL(capturedPreview);
        setCapturedFile(null);
        setCapturedPreview(null);
        initCamera();
    };

    const handleSubmit = () => {
        if (!capturedFile || submitting) return;
        setSubmitting(true);

        const formData = new FormData();
        formData.append('selfie', capturedFile);

        router.post('/absensi/selfie', formData, {
            forceFormData: true,
            onError: () => setSubmitting(false),
        });
    };

    const handleBack = () => {
        stopCamera();
        router.get('/absensi/form');
    };

    return (
        <>
            <Head title="Foto Selfie — Absensi" />

            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-slate-900 flex flex-col">

                {/* Header */}
                <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
                    <button
                        onClick={handleBack}
                        className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-gray-300 transition hover:bg-white/10"
                    >
                        ← Kembali ke Form
                    </button>
                    <div className="text-center">
                        <p className="text-sm font-semibold text-white">Foto Selfie</p>
                        <p className="text-xs text-gray-400">Langkah terakhir sebelum absensi terkirim</p>
                    </div>
                    <div className="w-24" /> {/* spacer */}
                </div>

                {/* Identity badge */}
                <div className="mx-auto mt-4 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 backdrop-blur-sm">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                        {nama ? nama.charAt(0) : '?'}
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-white">{nama || '—'}</p>
                        <p className="text-xs text-gray-400">{nrp} · {jabatan}</p>
                    </div>
                </div>

                {/* Main content */}
                <div className="flex flex-1 flex-col items-center justify-center px-4 py-6 gap-6 md:flex-row md:items-start md:justify-center md:gap-8 max-w-4xl mx-auto w-full">

                    {/* ── Kiri: Kamera ── */}
                    <div className="w-full max-w-md flex flex-col gap-3">
                        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                            📷 Kamera
                        </p>

                        {/* Canvas kamera */}
                        <div className="relative overflow-hidden rounded-2xl bg-black aspect-[4/3] shadow-2xl ring-1 ring-white/10">
                            <video ref={videoRef} autoPlay playsInline muted className="hidden" width="1280" height="720" />
                            <canvas ref={canvasRef} className="w-full h-full object-cover" />

                            {/* Flash */}
                            {isTakingPicture && (
                                <div className="animate-flash absolute inset-0 bg-white" />
                            )}

                            {/* Countdown */}
                            {isCountingDown && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                                    <div className="flex h-28 w-28 animate-pulse items-center justify-center rounded-full bg-blue-600 text-7xl font-bold text-white shadow-2xl">
                                        {countDown}
                                    </div>
                                </div>
                            )}

                            {/* Loading */}
                            {!cameraActive && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900">
                                    <div className="mb-3 h-10 w-10 animate-spin rounded-full border-2 border-t-blue-500 border-gray-700" />
                                    <p className="text-sm text-gray-400">Memuat kamera...</p>
                                </div>
                            )}

                            {/* Panduan oval */}
                            {cameraActive && !capturedPreview && (
                                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                                    <div className="h-52 w-40 rounded-full border-2 border-dashed border-white/50 shadow-inner" />
                                </div>
                            )}
                        </div>

                        {/* Tips */}
                        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                            <p className="flex items-center gap-1.5 text-xs font-semibold text-gray-300 mb-1.5">
                                <Smile className="h-3.5 w-3.5 text-blue-400" /> Tips Foto:
                            </p>
                            <ul className="space-y-0.5 text-xs text-gray-400 list-disc pl-4">
                                <li>Posisikan wajah di dalam lingkaran panduan</li>
                                <li>Pastikan pencahayaan cukup</li>
                                <li>Kamera sejajar dengan wajah, tersenyum 😊</li>
                            </ul>
                        </div>

                        {/* Tombol kamera */}
                        {cameraActive && (
                            <div className="flex items-center justify-center gap-5 py-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    className="h-12 w-12 rounded-full border-white/20 bg-white/10 text-white hover:bg-white/20"
                                    onClick={flipCamera}
                                    disabled={isCountingDown}
                                    title={facingMode === 'user' ? 'Kamera belakang' : 'Kamera depan'}
                                >
                                    <FlipHorizontal className="h-5 w-5" />
                                </Button>

                                {/* Tombol utama ambil foto */}
                                <button
                                    type="button"
                                    onClick={startCountDown}
                                    disabled={isCountingDown}
                                    className="relative flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-xl transition active:scale-95 disabled:opacity-50"
                                >
                                    <div className="absolute inset-1.5 rounded-full border-2 border-gray-300" />
                                    <Camera className="h-8 w-8 text-gray-800" />
                                </button>

                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    className="h-12 w-12 rounded-full border-white/20 bg-white/10 text-white hover:bg-white/20"
                                    onClick={() => { stopCamera(); initCamera(); }}
                                    disabled={isCountingDown}
                                    title="Restart kamera"
                                >
                                    <RefreshCcw className="h-5 w-5" />
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* ── Kanan: Preview & Submit ── */}
                    <div className="w-full max-w-md flex flex-col gap-3">
                        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                            🖼️ Hasil Foto
                        </p>

                        {capturedPreview ? (
                            <>
                                {/* Preview foto */}
                                <div className="relative overflow-hidden rounded-2xl aspect-[4/3] shadow-2xl ring-2 ring-green-500/50">
                                    <img
                                        src={capturedPreview}
                                        alt="Hasil selfie"
                                        className="w-full h-full object-cover"
                                    />
                                    <div className="absolute top-3 right-3 flex items-center gap-1.5 rounded-full bg-green-500 px-3 py-1 text-xs font-bold text-white shadow-lg">
                                        <CheckCircle2 className="h-3.5 w-3.5" /> Terambil
                                    </div>
                                    {/* Tombol hapus */}
                                    <button
                                        type="button"
                                        onClick={handleRetake}
                                        className="absolute top-3 left-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white transition hover:bg-black/70"
                                        title="Ambil ulang"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>

                                <p className="text-center text-sm text-gray-400">
                                    Pastikan wajah terlihat jelas dan foto tidak buram.
                                </p>

                                {/* Tombol submit */}
                                <Button
                                    type="button"
                                    onClick={handleSubmit}
                                    disabled={submitting}
                                    className="w-full py-6 text-base font-semibold bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 shadow-lg shadow-blue-900/40 disabled:opacity-60"
                                >
                                    {submitting ? (
                                        <span className="flex items-center gap-2">
                                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                            Mengirim Absensi...
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-2">
                                            <CheckCircle2 className="h-5 w-5" />
                                            Kirim Absensi
                                        </span>
                                    )}
                                </Button>

                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleRetake}
                                    className="w-full gap-2 border-white/20 bg-white/5 text-white hover:bg-white/10"
                                >
                                    <RefreshCcw className="h-4 w-4" />
                                    Ambil Ulang Foto
                                </Button>
                            </>
                        ) : (
                            <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-white/10 bg-white/5 py-16 text-center aspect-[4/3]">
                                <Camera className="mb-4 h-14 w-14 text-gray-600" />
                                <p className="text-sm font-medium text-gray-400">Belum ada foto</p>
                                <p className="mt-1 text-xs text-gray-600">
                                    Tekan tombol kamera di sebelah kiri
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes flash {
                    0%   { opacity: 0; }
                    40%  { opacity: 1; }
                    100% { opacity: 0; }
                }
                .animate-flash { animation: flash 0.4s ease-out; }
            ` }} />
        </>
    );
}

AbsensiSelfie.layout = undefined;

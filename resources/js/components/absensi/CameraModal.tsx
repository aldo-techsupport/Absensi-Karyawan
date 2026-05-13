import { useEffect, useState } from 'react';
import { Camera, FlipHorizontal, RefreshCcw, Smile, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCameraLogic } from '@/hooks/use-camera-logic';

interface CameraModalProps {
    show: boolean;
    onClose: () => void;
    onConfirm: (file: File, preview: string) => void;
}

export default function CameraModal({ show, onClose, onConfirm }: CameraModalProps) {
    const [capturedFile, setCapturedFile] = useState<File | null>(null);
    const [capturedPreview, setCapturedPreview] = useState<string | null>(null);

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

    // Buka kamera saat modal muncul
    useEffect(() => {
        if (show) {
            setCapturedFile(null);
            setCapturedPreview(null);
            const t = setTimeout(() => initCamera(), 400);
            return () => clearTimeout(t);
        } else {
            stopCamera();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [show]);

    // Cleanup preview URL saat unmount
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

    const handleConfirm = () => {
        if (!capturedFile || !capturedPreview) return;
        onConfirm(capturedFile, capturedPreview);
        stopCamera();
    };

    const handleClose = () => {
        stopCamera();
        onClose();
    };

    if (!show) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="relative w-full max-w-4xl rounded-2xl bg-white shadow-2xl dark:bg-gray-900 overflow-hidden">

                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-5 py-4">
                    <div className="flex items-center gap-2">
                        <Camera className="h-5 w-5 text-blue-600" />
                        <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">
                            {capturedPreview ? 'Konfirmasi Foto Selfie' : 'Ambil Foto Selfie'}
                        </h3>
                    </div>
                    <button
                        onClick={handleClose}
                        className="rounded-full p-1.5 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                        <X className="h-5 w-5 text-gray-500" />
                    </button>
                </div>

                {/* Body — split layout */}
                <div className="flex flex-col md:flex-row gap-0">

                    {/* ── Kiri: Kamera ── */}
                    <div className="flex-1 p-4 md:border-r border-gray-200 dark:border-gray-700">
                        <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Kamera
                        </p>

                        {/* Canvas preview kamera */}
                        <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
                            {/* Video hidden — hanya untuk stream */}
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                muted
                                className="hidden"
                                width="1280"
                                height="720"
                            />
                            <canvas
                                ref={canvasRef}
                                className="w-full h-full object-cover"
                            />

                            {/* Flash effect */}
                            {isTakingPicture && (
                                <div className="animate-flash absolute inset-0 bg-white" />
                            )}

                            {/* Countdown overlay */}
                            {isCountingDown && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                                    <div className="flex h-24 w-24 animate-pulse items-center justify-center rounded-full bg-blue-600 text-6xl font-bold text-white shadow-xl">
                                        {countDown}
                                    </div>
                                </div>
                            )}

                            {/* Loading kamera */}
                            {!cameraActive && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900">
                                    <div className="mb-3 h-10 w-10 animate-spin rounded-full border-2 border-t-blue-500 border-gray-600" />
                                    <p className="text-sm text-gray-400">Memuat kamera...</p>
                                </div>
                            )}

                            {/* Panduan wajah — lingkaran oval */}
                            {cameraActive && !capturedPreview && (
                                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                                    <div className="h-48 w-36 rounded-full border-2 border-dashed border-white/60 shadow-inner" />
                                </div>
                            )}
                        </div>

                        {/* Tips */}
                        <div className="mt-3 rounded-xl border border-dashed border-muted-foreground/30 bg-muted/20 p-3">
                            <p className="flex items-center gap-1 text-xs font-semibold text-muted-foreground mb-1">
                                <Smile className="h-3.5 w-3.5" /> Tips Foto:
                            </p>
                            <ul className="space-y-0.5 text-xs text-muted-foreground list-disc pl-4">
                                <li>Posisikan wajah di dalam lingkaran panduan</li>
                                <li>Pastikan pencahayaan cukup</li>
                                <li>Kamera sejajar dengan wajah</li>
                            </ul>
                        </div>

                        {/* Tombol kamera */}
                        {cameraActive && !capturedPreview && (
                            <div className="mt-4 flex items-center justify-center gap-4">
                                {/* Flip kamera */}
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    className="h-11 w-11 rounded-full"
                                    onClick={flipCamera}
                                    disabled={isCountingDown}
                                    title={facingMode === 'user' ? 'Kamera belakang' : 'Kamera depan'}
                                >
                                    <FlipHorizontal className="h-5 w-5" />
                                </Button>

                                {/* Tombol ambil foto */}
                                <button
                                    type="button"
                                    onClick={startCountDown}
                                    disabled={isCountingDown}
                                    className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg transition hover:bg-blue-700 disabled:opacity-50"
                                >
                                    <Camera className="h-7 w-7" />
                                </button>

                                {/* Restart kamera */}
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    className="h-11 w-11 rounded-full"
                                    onClick={() => { stopCamera(); initCamera(); }}
                                    disabled={isCountingDown}
                                    title="Restart kamera"
                                >
                                    <RefreshCcw className="h-5 w-5" />
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* ── Kanan: Preview hasil ── */}
                    <div className="flex-1 p-4 flex flex-col">
                        <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Hasil Foto
                        </p>

                        {capturedPreview ? (
                            <>
                                <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
                                    <img
                                        src={capturedPreview}
                                        alt="Hasil selfie"
                                        className="w-full h-full object-cover"
                                    />
                                    {/* Badge OK */}
                                    <div className="absolute top-2 right-2 rounded-full bg-green-500 px-2 py-0.5 text-xs font-bold text-white shadow">
                                        ✓ Terambil
                                    </div>
                                </div>

                                <p className="mt-3 text-center text-sm text-muted-foreground">
                                    Apakah foto sudah jelas dan wajah terlihat?
                                </p>

                                <div className="mt-4 flex flex-col gap-2">
                                    <Button
                                        type="button"
                                        onClick={handleConfirm}
                                        className="w-full bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 py-5 text-base font-semibold"
                                    >
                                        ✓ Gunakan Foto Ini & Kirim Absensi
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={handleRetake}
                                        className="w-full gap-2"
                                    >
                                        <RefreshCcw className="h-4 w-4" />
                                        Ambil Ulang
                                    </Button>
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-1 flex-col items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/20 bg-muted/10 py-12 text-center">
                                <Camera className="mb-3 h-12 w-12 text-muted-foreground/30" />
                                <p className="text-sm font-medium text-muted-foreground">Belum ada foto</p>
                                <p className="mt-1 text-xs text-muted-foreground/70">
                                    Tekan tombol kamera untuk mengambil selfie
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Animasi flash */}
            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes flash {
                    0%   { opacity: 0; }
                    40%  { opacity: 1; }
                    100% { opacity: 0; }
                }
                .animate-flash { animation: flash 0.4s ease-out; }
            ` }} />
        </div>
    );
}

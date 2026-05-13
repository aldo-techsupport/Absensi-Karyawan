import { useCallback, useRef, useState } from 'react';

interface UseCameraLogicOptions {
    onPhotoCapture: (file: File, preview: string) => void;
}

export function useCameraLogic({ onPhotoCapture }: UseCameraLogicOptions) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const [cameraActive, setCameraActive] = useState(false);
    const [isCountingDown, setIsCountingDown] = useState(false);
    const [countDown, setCountDown] = useState(3);
    const [isTakingPicture, setIsTakingPicture] = useState(false);
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

    const stopCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((t) => t.stop());
            streamRef.current = null;
        }
        setCameraActive(false);
    }, []);

    const initCamera = useCallback(async (facing: 'user' | 'environment' = facingMode) => {
        stopCamera();
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } },
                audio: false,
            });
            streamRef.current = stream;

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.onloadedmetadata = () => {
                    videoRef.current?.play();

                    // Mirror canvas sesuai stream
                    const canvas = canvasRef.current;
                    const video = videoRef.current;
                    if (!canvas || !video) return;

                    const draw = () => {
                        if (!streamRef.current) return;
                        const ctx = canvas.getContext('2d');
                        if (!ctx) return;

                        canvas.width = video.videoWidth || 1280;
                        canvas.height = video.videoHeight || 720;

                        if (facing === 'user') {
                            ctx.save();
                            ctx.scale(-1, 1);
                            ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
                            ctx.restore();
                        } else {
                            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                        }
                        requestAnimationFrame(draw);
                    };
                    draw();
                    setCameraActive(true);
                };
            }
        } catch {
            setCameraActive(false);
        }
    }, [facingMode, stopCamera]);

    const flipCamera = useCallback(() => {
        const next = facingMode === 'user' ? 'environment' : 'user';
        setFacingMode(next);
        initCamera(next);
    }, [facingMode, initCamera]);

    const capturePhoto = useCallback(() => {
        const canvas = canvasRef.current;
        const video = videoRef.current;
        if (!canvas || !video) return;

        setIsTakingPicture(true);

        // Gambar frame terakhir ke canvas (sudah di-mirror oleh loop draw)
        canvas.toBlob(
            (blob) => {
                setIsTakingPicture(false);
                if (!blob) return;
                const file = new File([blob], `selfie-${Date.now()}.jpg`, { type: 'image/jpeg' });
                const preview = URL.createObjectURL(blob);
                onPhotoCapture(file, preview);
            },
            'image/jpeg',
            0.9,
        );
    }, [onPhotoCapture]);

    const startCountDown = useCallback(() => {
        if (isCountingDown) return;
        setIsCountingDown(true);
        setCountDown(3);

        let count = 3;
        const interval = setInterval(() => {
            count -= 1;
            setCountDown(count);
            if (count <= 0) {
                clearInterval(interval);
                setIsCountingDown(false);
                capturePhoto();
            }
        }, 1000);
    }, [isCountingDown, capturePhoto]);

    return {
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
    };
}

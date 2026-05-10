import { Head, router } from '@inertiajs/react';
import { CheckCircle2, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AbsensiFormSuccess() {
    return (
        <>
            <Head title="Absensi Terkirim" />

            <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-green-50 via-white to-emerald-50 px-4 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
                <div className="w-full max-w-md text-center">

                    {/* Icon */}
                    <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                        <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-400" />
                    </div>

                    {/* Text */}
                    <h1 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">
                        Absensi Berhasil Dikirim!
                    </h1>
                    <p className="mb-8 text-muted-foreground">
                        Data absensi Anda telah tersimpan. Terima kasih sudah mengisi absensi hari ini.
                    </p>

                    {/* Card info */}
                    <div className="mb-8 rounded-2xl border border-green-200 bg-white p-6 shadow-sm dark:border-green-900 dark:bg-gray-900">
                        <div className="flex items-center gap-3 text-left">
                            <ClipboardList className="h-8 w-8 shrink-0 text-green-600 dark:text-green-400" />
                            <div>
                                <p className="text-sm font-medium">Data sudah tercatat</p>
                                <p className="text-xs text-muted-foreground">
                                    Admin dapat melihat data Anda di dashboard absensi
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-3">
                        <Button
                            onClick={() => router.get('/absensi/form')}
                            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 py-5 font-semibold hover:from-green-700 hover:to-emerald-700"
                        >
                            Isi Absensi Lagi
                        </Button>
                        <p className="text-xs text-muted-foreground">
                            Halaman ini bisa ditutup atau isi absensi untuk karyawan lain
                        </p>
                    </div>

                </div>
            </div>
        </>
    );
}

AbsensiFormSuccess.layout = undefined;

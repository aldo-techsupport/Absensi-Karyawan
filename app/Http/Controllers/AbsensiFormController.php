<?php

namespace App\Http\Controllers;

use App\Models\Absensi;
use App\Models\FormSetting;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AbsensiFormController extends Controller
{
    public function create(): Response
    {
        $setting = FormSetting::instance();
        $isOpen  = $setting->isOpen();

        return Inertia::render('absensi/form', [
            'defaultTanggal'    => Carbon::today()->format('Y-m-d'),
            'defaultHari'       => Carbon::today()->locale('id')->isoFormat('dddd'),
            'formConfigs'       => FormConfigController::getActiveConfigs(),
            'formIsOpen'        => $isOpen,
            'closedMessage'     => $setting->closed_message,
            'locationEnabled'   => (bool) $setting->location_enabled,
            'locationLat'       => $setting->location_lat,
            'locationLng'       => $setting->location_lng,
            'locationRadius'    => $setting->location_radius ?? 100,
            'locationEmbedHtml' => $setting->location_embed_url,
            'locationPoints'    => $setting->location_points ?? [],
        ]);
    }

    public function submit(Request $request): RedirectResponse
    {
        // Cek apakah form sedang terbuka
        $setting = FormSetting::instance();
        if (! $setting->isOpen()) {
            return back()->withErrors(['form' => $setting->closed_message])->withInput();
        }

        // ── Validasi lokasi GPS (server-side) ──────────────────────────────────
        if ($setting->location_enabled) {
            $userLat = $request->input('user_lat');
            $userLng = $request->input('user_lng');

            // Kumpulkan semua titik aktif: legacy single-point + location_points
            $activePoints = [];

            // Legacy single-point (location_lat / location_lng)
            if ($setting->location_lat !== null && $setting->location_lng !== null) {
                $activePoints[] = [
                    'lat'   => (float) $setting->location_lat,
                    'lng'   => (float) $setting->location_lng,
                    'label' => 'Lokasi Utama',
                ];
            }

            // Multi-point dari location_points
            $points = $setting->location_points ?? [];
            foreach ($points as $point) {
                if (!empty($point['enabled'])) {
                    $activePoints[] = [
                        'lat'   => (float) $point['lat'],
                        'lng'   => (float) $point['lng'],
                        'label' => $point['label'] ?? 'Titik Lokasi',
                    ];
                }
            }

            if (!empty($activePoints)) {
                if ($userLat === null || $userLng === null) {
                    return back()->withErrors(['location' => 'Verifikasi lokasi diperlukan. Izinkan akses GPS di browser Anda.'])->withInput();
                }

                $radius = $setting->location_radius ?? 100;
                $inRange = false;
                $minDist = PHP_INT_MAX;

                foreach ($activePoints as $point) {
                    $dist = $this->haversineDistance(
                        (float) $userLat, (float) $userLng,
                        $point['lat'], $point['lng']
                    );
                    if ($dist < $minDist) {
                        $minDist = $dist;
                    }
                    if ($dist <= $radius) {
                        $inRange = true;
                        break;
                    }
                }

                if (!$inRange) {
                    return back()->withErrors([
                        'location' => 'Wilayah Terdekat Absen berada dalam ' . round($minDist) . ' meter dari lokasi.',
                    ])->withInput();
                }
            }
        }

        $validated = $request->validate([
            'nama'            => 'required|string|max:255',
            'nrp'             => 'required|string|max:50',
            'jabatan'         => 'required|string|max:255',
            'section'         => 'required|string|max:255',
            'lokasi'          => 'required|string|max:255',
            'departemen'      => 'nullable|string|max:255',
            'perusahaan'      => 'nullable|string|max:255',
            'tanggal'         => 'required|date',
            'hari'            => 'nullable|string|max:50',
            'shift'           => 'required|string|max:10',
            'waktu_mulai'     => 'required|string|max:10',
            'kegiatan'        => 'required|string|max:255',
            'peran_kegiatan'  => 'nullable|string|max:50',
            'judul_kegiatan'  => 'nullable|string|max:500',
            'mulai_tidur'     => 'required|string|max:10',
            'bangun_tidur'    => 'required|string|max:10',
            'selfie'          => 'nullable|image|mimes:jpeg,jpg,png,webp|max:5120',
        ], [
            'nama.required'         => 'Nama wajib diisi.',
            'nrp.required'          => 'NRP wajib diisi.',
            'jabatan.required'      => 'Jabatan wajib dipilih.',
            'section.required'      => 'Section wajib dipilih.',
            'lokasi.required'       => 'Lokasi wajib dipilih.',
            'tanggal.required'      => 'Tanggal wajib diisi.',
            'shift.required'        => 'Shift kerja wajib dipilih.',
            'waktu_mulai.required'  => 'Waktu mulai wajib diisi.',
            'kegiatan.required'     => 'Kegiatan wajib dipilih.',
            'mulai_tidur.required'  => 'Jam mulai tidur wajib diisi.',
            'bangun_tidur.required' => 'Jam bangun tidur wajib diisi.',
        ]);

        // Auto uppercase Nama dan NRP
        $validated['nama'] = strtoupper($validated['nama']);
        $validated['nrp']  = strtoupper($validated['nrp']);

        // P5M, SAFETY TALK, SAFETY ALERT semua butuh peran
        $kegiatanDenganPeran = ['P5M', 'SAFETY TALK', 'SAFETY ALERT'];
        $jabatan = strtoupper(trim($request->input('jabatan', '')));
        $peran   = $request->input('peran_kegiatan', '');
        $isGL    = $jabatan === 'GL';
        $isPemateri = in_array($validated['kegiatan'], $kegiatanDenganPeran) && $peran === 'Pemateri';

        // Validasi peran jika kegiatan butuh peran
        if (in_array($validated['kegiatan'], $kegiatanDenganPeran) && empty($peran)) {
            return back()->withErrors(['peran_kegiatan' => 'Pilih peran Anda (Pemateri atau Audience).'])->withInput();
        }

        // Validasi judul jika GL atau Pemateri
        // Pengecualian: GL + Audience = absen biasa, tidak perlu judul
        if ($isPemateri && empty($validated['judul_kegiatan'])) {
            return back()->withErrors(['judul_kegiatan' => 'Judul kegiatan wajib diisi untuk Pemateri.'])->withInput();
        }

        // Tambahkan ⭐ ke jabatan jika Pemateri
        if ($isPemateri && ! empty($validated['jabatan'])) {
            $validated['jabatan'] = '⭐ ' . $validated['jabatan'];
        }

        try {
            $validated['hari'] = Carbon::parse($validated['tanggal'])
                ->locale('id')->isoFormat('dddd');
        } catch (\Exception $e) {}

        $validated['timestamp']      = Carbon::now()->toDateTimeString();
        $validated['sheet_row_hash'] = null;
        $validated['is_modified']    = true;

        // Simpan koordinat GPS user jika tersedia
        $userLat = $request->input('user_lat');
        $userLng = $request->input('user_lng');
        if ($userLat !== null && $userLng !== null) {
            $validated['user_lat'] = (float) $userLat;
            $validated['user_lng'] = (float) $userLng;
        }

        // Simpan foto selfie jika ada
        if ($request->hasFile('selfie')) {
            $path = $request->file('selfie')->store('selfie', 'public');
            $validated['selfie_path'] = $path;
        }

        // Hapus key 'selfie' dari validated agar tidak masuk fillable langsung
        unset($validated['selfie']);

        Absensi::create($validated);

        return redirect()->route('absensi.form.success');
    }

    public function success(): Response
    {
        return Inertia::render('absensi/form-success');
    }

    /**
     * Simpan data form ke session, redirect ke halaman selfie.
     */
    public function prepareSelfie(Request $request): RedirectResponse
    {
        // Cek form terbuka
        $setting = FormSetting::instance();
        if (! $setting->isOpen()) {
            return back()->withErrors(['form' => $setting->closed_message])->withInput();
        }

        // Validasi data form (sama seperti submit, tapi tanpa selfie)
        $validated = $request->validate([
            'nama'            => 'required|string|max:255',
            'nrp'             => 'required|string|max:50',
            'jabatan'         => 'required|string|max:255',
            'section'         => 'required|string|max:255',
            'lokasi'          => 'required|string|max:255',
            'departemen'      => 'nullable|string|max:255',
            'perusahaan'      => 'nullable|string|max:255',
            'tanggal'         => 'required|date',
            'shift'           => 'required|string|max:10',
            'waktu_mulai'     => 'required|string|max:10',
            'kegiatan'        => 'required|string|max:255',
            'peran_kegiatan'  => 'nullable|string|max:50',
            'judul_kegiatan'  => 'nullable|string|max:500',
            'mulai_tidur'     => 'required|string|max:10',
            'bangun_tidur'    => 'required|string|max:10',
            'user_lat'        => 'nullable|numeric',
            'user_lng'        => 'nullable|numeric',
        ], [
            'nama.required'         => 'Nama wajib diisi.',
            'nrp.required'          => 'NRP wajib diisi.',
            'jabatan.required'      => 'Jabatan wajib dipilih.',
            'section.required'      => 'Section wajib dipilih.',
            'lokasi.required'       => 'Lokasi wajib dipilih.',
            'tanggal.required'      => 'Tanggal wajib diisi.',
            'shift.required'        => 'Shift kerja wajib dipilih.',
            'waktu_mulai.required'  => 'Waktu mulai wajib diisi.',
            'kegiatan.required'     => 'Kegiatan wajib dipilih.',
            'mulai_tidur.required'  => 'Jam mulai tidur wajib diisi.',
            'bangun_tidur.required' => 'Jam bangun tidur wajib diisi.',
        ]);

        // Validasi peran & judul
        $kegiatanDenganPeran = ['P5M', 'SAFETY TALK', 'SAFETY ALERT'];
        $peran = $request->input('peran_kegiatan', '');
        $isPemateri = in_array($validated['kegiatan'], $kegiatanDenganPeran) && $peran === 'Pemateri';

        if (in_array($validated['kegiatan'], $kegiatanDenganPeran) && empty($peran)) {
            return back()->withErrors(['peran_kegiatan' => 'Pilih peran Anda (Pemateri atau Audience).'])->withInput();
        }
        if ($isPemateri && empty($validated['judul_kegiatan'])) {
            return back()->withErrors(['judul_kegiatan' => 'Judul kegiatan wajib diisi untuk Pemateri.'])->withInput();
        }

        // Simpan ke session
        session(['absensi_pending' => $validated]);

        return redirect()->route('absensi.selfie');
    }

    /**
     * Tampilkan halaman selfie.
     */
    public function selfie(): Response|RedirectResponse
    {
        $pending = session('absensi_pending');
        if (! $pending) {
            return redirect()->route('absensi.form');
        }

        return Inertia::render('absensi/selfie', [
            'nama'    => $pending['nama'] ?? '',
            'nrp'     => $pending['nrp'] ?? '',
            'jabatan' => $pending['jabatan'] ?? '',
        ]);
    }

    /**
     * Submit absensi dari halaman selfie (baca session + upload foto).
     */
    public function selfieSubmit(Request $request): RedirectResponse
    {
        $pending = session('absensi_pending');
        if (! $pending) {
            return redirect()->route('absensi.form');
        }

        $request->validate([
            'selfie' => 'nullable|image|mimes:jpeg,jpg,png,webp|max:5120',
        ]);

        $setting = FormSetting::instance();
        if (! $setting->isOpen()) {
            return redirect()->route('absensi.form')
                ->withErrors(['form' => $setting->closed_message]);
        }

        $validated = $pending;

        // Auto uppercase
        $validated['nama'] = strtoupper($validated['nama']);
        $validated['nrp']  = strtoupper($validated['nrp']);

        // Tambahkan ⭐ ke jabatan jika Pemateri
        $kegiatanDenganPeran = ['P5M', 'SAFETY TALK', 'SAFETY ALERT'];
        $peran = $validated['peran_kegiatan'] ?? '';
        $isPemateri = in_array($validated['kegiatan'], $kegiatanDenganPeran) && $peran === 'Pemateri';
        if ($isPemateri && ! empty($validated['jabatan'])) {
            $validated['jabatan'] = '⭐ ' . $validated['jabatan'];
        }

        try {
            $validated['hari'] = Carbon::parse($validated['tanggal'])
                ->locale('id')->isoFormat('dddd');
        } catch (\Exception $e) {}

        $validated['timestamp']      = Carbon::now()->toDateTimeString();
        $validated['sheet_row_hash'] = null;
        $validated['is_modified']    = true;

        // Upload selfie
        if ($request->hasFile('selfie')) {
            $path = $request->file('selfie')->store('selfie', 'public');
            $validated['selfie_path'] = $path;
        }

        Absensi::create($validated);

        // Hapus session setelah berhasil
        session()->forget('absensi_pending');

        return redirect()->route('absensi.form.success');
    }

    /**
     * Hitung jarak antara dua koordinat GPS (meter) — Haversine formula.
     */
    private function haversineDistance(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $R = 6371000; // radius bumi dalam meter
        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1);
        $a = sin($dLat / 2) ** 2
            + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLng / 2) ** 2;
        return $R * 2 * atan2(sqrt($a), sqrt(1 - $a));
    }
}

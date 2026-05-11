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
        ]);
    }

    public function submit(Request $request): RedirectResponse
    {
        // Cek apakah form sedang terbuka
        $setting = FormSetting::instance();
        if (! $setting->isOpen()) {
            return back()->withErrors(['form' => $setting->closed_message])->withInput();
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

        Absensi::create($validated);

        return redirect()->route('absensi.form.success');
    }

    public function success(): Response
    {
        return Inertia::render('absensi/form-success');
    }
}

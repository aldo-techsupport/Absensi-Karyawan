<?php

namespace App\Http\Controllers;

use App\Models\Absensi;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AbsensiFormController extends Controller
{
    public function create(): Response
    {
        return Inertia::render('absensi/form', [
            'defaultTanggal' => Carbon::today()->format('Y-m-d'),
            'defaultHari'    => Carbon::today()->locale('id')->isoFormat('dddd'),
            'formConfigs'    => FormConfigController::getActiveConfigs(),
        ]);
    }

    public function submit(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'nama'            => 'required|string|max:255',
            'nrp'             => 'required|string|max:50',
            'jabatan'         => 'nullable|string|max:255',
            'section'         => 'required|string|max:255',
            'lokasi'          => 'nullable|string|max:255',
            'departemen'      => 'nullable|string|max:255',
            'perusahaan'      => 'nullable|string|max:255',
            'tanggal'         => 'required|date',
            'hari'            => 'nullable|string|max:50',
            'shift'           => 'required|string|max:10',
            'waktu_mulai'     => 'required|string|max:10',
            'kegiatan'        => 'required|string|max:255',
            'judul_kegiatan'  => 'nullable|string|max:500',
            'mulai_tidur'     => 'required|string|max:10',
            'bangun_tidur'    => 'required|string|max:10',
        ], [
            'nama.required'         => 'Nama wajib diisi.',
            'nrp.required'          => 'NRP wajib diisi.',
            'section.required'      => 'Section wajib dipilih.',
            'tanggal.required'      => 'Tanggal wajib diisi.',
            'shift.required'        => 'Shift kerja wajib dipilih.',
            'waktu_mulai.required'  => 'Waktu mulai wajib diisi.',
            'kegiatan.required'     => 'Kegiatan wajib dipilih.',
            'mulai_tidur.required'  => 'Jam mulai tidur wajib diisi.',
            'bangun_tidur.required' => 'Jam bangun tidur wajib diisi.',
        ]);

        // Jika jabatan GL, judul_kegiatan wajib diisi
        if (strtoupper(trim($request->input('jabatan', ''))) === 'GL' && empty($validated['judul_kegiatan'])) {
            return back()->withErrors(['judul_kegiatan' => 'Judul kegiatan wajib diisi untuk jabatan GL.'])->withInput();
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

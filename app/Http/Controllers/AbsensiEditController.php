<?php

namespace App\Http\Controllers;

use App\Models\Absensi;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AbsensiEditController extends Controller
{
    /**
     * Tampilkan form edit untuk admin.
     */
    public function edit(int $id): Response
    {
        $record = Absensi::findOrFail($id);

        // Konversi tanggal ke format Y-m-d untuk input[type=date]
        $tanggal = $record->tanggal ?? '';
        if ($tanggal) {
            try {
                $tanggal = Carbon::parse($tanggal)->format('Y-m-d');
            } catch (\Exception $e) { /* biarkan */ }
        }

        return Inertia::render('absensi/edit', [
            'record' => [
                'id'           => $record->id,
                'tanggal'      => $tanggal,
                'shift'        => $record->shift ?? '',
                'waktu_mulai'  => $record->waktu_mulai ?? '',
                'perusahaan'   => $record->perusahaan ?? '',
                'departemen'   => $record->departemen ?? '',
                'kegiatan'     => $record->kegiatan ?? '',
                'nama'         => $record->nama ?? '',
                'section'      => $record->section ?? '',
                'jabatan'      => $record->jabatan ?? '',
                'nrp'          => $record->nrp ?? '',
                'mulai_tidur'  => $record->mulai_tidur ?? '',
                'bangun_tidur' => $record->bangun_tidur ?? '',
            ],
        ]);
    }

    /**
     * Simpan perubahan dari form edit admin.
     */
    public function update(Request $request, int $id): RedirectResponse
    {
        $record = Absensi::findOrFail($id);

        $validated = $request->validate([
            'nama'         => 'required|string|max:255',
            'nrp'          => 'nullable|string|max:50',
            'jabatan'      => 'nullable|string|max:255',
            'section'      => 'nullable|string|max:255',
            'departemen'   => 'nullable|string|max:255',
            'perusahaan'   => 'nullable|string|max:255',
            'tanggal'      => 'required|string',
            'shift'        => 'required|string|max:10',
            'waktu_mulai'  => 'required|string|max:10',
            'kegiatan'     => 'required|string|max:255',
            'mulai_tidur'  => 'required|string|max:10',
            'bangun_tidur' => 'required|string|max:10',
        ]);

        // Auto-fill hari
        try {
            $validated['hari'] = Carbon::parse($validated['tanggal'])
                ->locale('id')->isoFormat('dddd');
        } catch (\Exception $e) { /* ignore */ }

        $validated['is_modified'] = true;

        $record->update($validated);

        return redirect()->route('absensi.index')
            ->with('success', 'Data absensi berhasil diperbarui.');
    }
}

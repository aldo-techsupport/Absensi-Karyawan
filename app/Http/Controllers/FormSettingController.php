<?php

namespace App\Http\Controllers;

use App\Models\FormSetting;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class FormSettingController extends Controller
{
    /**
     * Halaman pengaturan lokasi GPS absensi.
     */
    public function lokasi(): Response
    {
        $setting = FormSetting::instance();

        return Inertia::render('absensi/lokasi', [
            'setting' => [
                'location_enabled'   => (bool) $setting->location_enabled,
                'location_lat'       => $setting->location_lat,
                'location_lng'       => $setting->location_lng,
                'location_radius'    => $setting->location_radius ?? 100,
                'location_embed_url' => $setting->location_embed_url,
            ],
        ]);
    }

    /**
     * Toggle form status: open ↔ closed (manual).
     */
    public function toggle(): RedirectResponse
    {
        $setting = FormSetting::instance();
        $setting->update([
            'form_status' => $setting->form_status === 'open' ? 'closed' : 'open',
        ]);

        $label = $setting->form_status === 'open' ? 'dibuka' : 'ditutup';

        return redirect()->back()->with('success', "Form absensi berhasil {$label}.");
    }

    /**
     * Simpan pengaturan jadwal.
     */
    public function updateSchedule(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'schedule_enabled' => 'boolean',
            'schedule_days'    => 'nullable|array',
            'schedule_days.*'  => 'string|in:1,2,3,4,5,6,7',
            'schedule_start'   => 'nullable|string|regex:/^\d{2}:\d{2}$/',
            'schedule_end'     => 'nullable|string|regex:/^\d{2}:\d{2}$/',
            'closed_message'   => 'nullable|string|max:500',
        ]);

        $setting = FormSetting::instance();
        $setting->update($validated);

        return redirect()->back()->with('success', 'Pengaturan jadwal berhasil disimpan.');
    }

    /**
     * Simpan pengaturan validasi lokasi GPS.
     */
    public function updateLocation(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'location_enabled'   => 'boolean',
            'location_lat'       => 'nullable|numeric|between:-90,90',
            'location_lng'       => 'nullable|numeric|between:-180,180',
            'location_radius'    => 'nullable|integer|min:10|max:5000',
            'location_embed_url' => 'nullable|string|max:2000',
        ]);

        $setting = FormSetting::instance();
        $setting->update($validated);

        return redirect()->route('absensi.lokasi')
            ->with('success', 'Pengaturan lokasi berhasil disimpan.');
    }
}

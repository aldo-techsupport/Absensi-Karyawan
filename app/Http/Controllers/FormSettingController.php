<?php

namespace App\Http\Controllers;

use App\Models\FormSetting;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class FormSettingController extends Controller
{
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
}

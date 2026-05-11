<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserFilterPreferenceController extends Controller
{
    /**
     * Simpan filter preferences untuk user yang sedang login.
     */
    public function save(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'bulan'          => 'nullable|string|max:2',
            'tahun'          => 'nullable|string|max:4',
            'tanggal_dari'   => 'nullable|string|max:10',
            'tanggal_sampai' => 'nullable|string|max:10',
            'nama'           => 'nullable|string|max:255',
            'departemen'     => 'nullable|string|max:255',
            'shift'          => 'nullable|string|max:10',
            'status_tidur'   => 'nullable|string|max:50',
            'section'        => 'nullable|string|max:255',
            'batas_jam'      => 'nullable|string|max:5',
            'terlambat'      => 'nullable|string|max:1',
        ]);

        /** @var \App\Models\User $user */
        $user = $request->user();
        $user->setFilterPreferences($validated);

        return response()->json(['ok' => true]);
    }
}

<?php

namespace App\Http\Controllers;

use App\Models\FormConfig;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class FormConfigController extends Controller
{
    /**
     * Halaman pengaturan form — admin bisa edit opsi tiap field.
     */
    public function index(): Response
    {
        $configs = FormConfig::orderBy('sort_order')->get();

        return Inertia::render('absensi/form-config', [
            'configs' => $configs,
        ]);
    }

    /**
     * Simpan perubahan konfigurasi satu field.
     */
    public function update(Request $request, int $id): RedirectResponse
    {
        $config = FormConfig::findOrFail($id);

        $validated = $request->validate([
            'field_label' => 'required|string|max:100',
            'is_active'   => 'boolean',
            'is_required' => 'boolean',
            'options'     => 'required|array|min:1',
            'options.*'   => 'required|string|max:255',
        ]);

        // Bersihkan opsi kosong
        $validated['options'] = array_values(
            array_filter(array_map('trim', $validated['options']))
        );

        $config->update($validated);

        return redirect()->route('absensi.form-config')
            ->with('success', "Konfigurasi '{$config->field_label}' berhasil disimpan.");
    }

    /**
     * Tambah field baru ke form.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'field_key'   => 'required|string|max:50|unique:form_configs,field_key',
            'field_label' => 'required|string|max:100',
            'is_required' => 'boolean',
            'options'     => 'required|array|min:1',
            'options.*'   => 'required|string|max:255',
        ], [
            'field_key.unique' => 'Nama field sudah ada.',
        ]);

        $validated['options'] = array_values(
            array_filter(array_map('trim', $validated['options']))
        );
        $validated['sort_order'] = FormConfig::max('sort_order') + 1;
        $validated['is_active']  = true;

        FormConfig::create($validated);

        return redirect()->route('absensi.form-config')
            ->with('success', "Field '{$validated['field_label']}' berhasil ditambahkan.");
    }

    /**
     * Toggle aktif/nonaktif field.
     */
    public function toggle(int $id): RedirectResponse
    {
        $config = FormConfig::findOrFail($id);
        $config->update(['is_active' => ! $config->is_active]);

        $status = $config->is_active ? 'diaktifkan' : 'dinonaktifkan';

        return redirect()->route('absensi.form-config')
            ->with('success', "Field '{$config->field_label}' berhasil {$status}.");
    }

    /**
     * Hapus field kustom (field bawaan tidak bisa dihapus).
     */
    public function destroy(int $id): RedirectResponse
    {
        $config = FormConfig::findOrFail($id);

        $builtIn = ['perusahaan', 'departemen', 'kegiatan', 'section'];
        if (in_array($config->field_key, $builtIn)) {
            return redirect()->route('absensi.form-config')
                ->with('error', "Field '{$config->field_label}' adalah field bawaan dan tidak bisa dihapus.");
        }

        $config->delete();

        return redirect()->route('absensi.form-config')
            ->with('success', "Field '{$config->field_label}' berhasil dihapus.");
    }

    /**
     * Bulk save — simpan semua field sekaligus dari form builder.
     */
    public function bulkSave(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'fields'                => 'required|array',
            'fields.*.id'           => 'nullable|integer',
            'fields.*.field_key'    => 'required|string|max:50',
            'fields.*.field_label'  => 'required|string|max:100',
            'fields.*.is_active'    => 'boolean',
            'fields.*.is_required'  => 'boolean',
            'fields.*.sort_order'   => 'integer',
            'fields.*.options'      => 'array',
            'fields.*.options.*'    => 'string|max:255',
        ]);

        foreach ($validated['fields'] as $fieldData) {
            $options = array_values(array_filter(
                array_map('trim', $fieldData['options'] ?? [])
            ));

            if ($fieldData['id']) {
                // Update existing
                FormConfig::where('id', $fieldData['id'])->update([
                    'field_label' => $fieldData['field_label'],
                    'is_active'   => $fieldData['is_active'] ?? true,
                    'is_required' => $fieldData['is_required'] ?? false,
                    'sort_order'  => $fieldData['sort_order'],
                    'options'     => $options,
                ]);
            } else {
                // Create new — pastikan field_key unik
                $key = preg_replace('/[^a-z0-9_]/', '_', strtolower($fieldData['field_key']));
                // Jika key sudah ada (misal dari duplikat), buat key baru
                if (FormConfig::where('field_key', $key)->exists()) {
                    $key = $key . '_' . time();
                }
                FormConfig::create([
                    'field_key'   => $key,
                    'field_label' => $fieldData['field_label'],
                    'is_active'   => $fieldData['is_active'] ?? true,
                    'is_required' => $fieldData['is_required'] ?? false,
                    'sort_order'  => $fieldData['sort_order'],
                    'options'     => $options,
                ]);
            }
        }

        // Hapus field yang tidak ada di payload (kecuali built-in)
        $builtIn    = ['perusahaan', 'departemen', 'kegiatan', 'section'];
        $sentIds    = array_filter(array_column($validated['fields'], 'id'));
        FormConfig::whereNotIn('field_key', $builtIn)
            ->whereNotNull('id')
            ->when(!empty($sentIds), fn ($q) => $q->whereNotIn('id', $sentIds))
            ->where(function ($q) use ($validated) {
                // Hanya hapus yang tidak ada di payload sama sekali
                $sentKeys = array_column($validated['fields'], 'field_key');
                $q->whereNotIn('field_key', $sentKeys);
            })
            ->delete();

        return redirect()->route('absensi.form-config')
            ->with('success', 'Form berhasil disimpan.');
    }
    public static function getActiveConfigs(): array
    {
        return FormConfig::where('is_active', true)
            ->orderBy('sort_order')
            ->get()
            ->keyBy('field_key')
            ->map(fn ($c) => [
                'label'       => $c->field_label,
                'options'     => $c->options,
                'is_required' => $c->is_required,
            ])
            ->toArray();
    }
}

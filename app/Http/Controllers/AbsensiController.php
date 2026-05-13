<?php

namespace App\Http\Controllers;

use App\Models\Absensi;
use App\Models\FormSetting;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AbsensiController extends Controller
{
    // =========================================================================
    // INDEX
    // =========================================================================

    public function index(Request $request): Response
    {
        /** @var \App\Models\User|null $user */
        $user = $request->user();
        $savedPrefs = $user?->filter_preferences ?? [];

        // Jika tidak ada query params sama sekali, gunakan saved preferences
        // Jika ada query params, gunakan query params (bisa null jika user clear filter)
        $hasQueryParams = count($request->query()) > 0;

        // Prioritas: query params > saved preferences
        $filterBulan         = $hasQueryParams ? $request->query('bulan')          : ($savedPrefs['bulan'] ?? null);
        $filterTahun         = $hasQueryParams ? $request->query('tahun')          : ($savedPrefs['tahun'] ?? null);
        $filterTanggalDari   = $hasQueryParams ? $request->query('tanggal_dari')   : ($savedPrefs['tanggal_dari'] ?? null);
        $filterTanggalSampai = $hasQueryParams ? $request->query('tanggal_sampai') : ($savedPrefs['tanggal_sampai'] ?? null);
        $filterNama          = $hasQueryParams ? $request->query('nama')           : ($savedPrefs['nama'] ?? null);
        $filterDepartemen    = $hasQueryParams ? $request->query('departemen')     : ($savedPrefs['departemen'] ?? null);
        $filterShift         = $hasQueryParams ? $request->query('shift')          : ($savedPrefs['shift'] ?? null);
        $filterStatus        = $hasQueryParams ? $request->query('status_tidur')   : ($savedPrefs['status_tidur'] ?? null);
        $filterSection       = $hasQueryParams ? $request->query('section')        : ($savedPrefs['section'] ?? null);
        $filterBatasJam      = $hasQueryParams ? ($request->query('batas_jam') ?? '09:00') : ($savedPrefs['batas_jam'] ?? '09:00');
        $filterTerlambat     = $hasQueryParams ? $request->query('terlambat')      : ($savedPrefs['terlambat'] ?? null);

        $allRecords = Absensi::orderBy('id', 'desc')->get();
        $data       = $allRecords->map(fn ($r) => $this->normalizeDbRecord($r->toArray()))->toArray();
        $totalRows  = count($data);

        $data     = $this->tandaiKeterlambatan($data, $filterBatasJam);
        $filtered = $this->filterData(
            $data, $filterBulan, $filterTahun, $filterNama,
            $filterDepartemen, $filterShift, $filterStatus,
            $filterSection, $filterTerlambat,
            $filterTanggalDari, $filterTanggalSampai
        );
        $stats = $this->calculateStats($filtered);

        $namaList       = collect($data)->pluck('nama')->unique()->filter()->sort()->values()->toArray();
        $bulanList      = collect($data)->pluck('bulan')->unique()->filter()->sort()->values()->toArray();
        $tahunList      = collect($data)->pluck('tahun')->unique()->filter()->sort()->values()->toArray();
        $departemenList = collect($data)->pluck('departemen')->unique()->filter()->sort()->values()->toArray();
        $shiftList      = collect($data)->pluck('shift')->unique()->filter()->sort()->values()->toArray();
        $sectionList    = collect($data)->pluck('section')->unique()->filter()->sort()->values()->toArray();

        $trashCount = Absensi::onlyTrashed()->count();

        $formSetting = FormSetting::instance();

        return Inertia::render('absensi/dashboard', [
            'absensi'        => $filtered,
            'stats'          => $stats,
            'namaList'       => $namaList,
            'bulanList'      => $bulanList,
            'tahunList'      => $tahunList,
            'departemenList' => $departemenList,
            'shiftList'      => $shiftList,
            'sectionList'    => $sectionList,
            'filters'        => [
                'bulan'          => $filterBulan,
                'tahun'          => $filterTahun,
                'tanggal_dari'   => $filterTanggalDari,
                'tanggal_sampai' => $filterTanggalSampai,
                'nama'           => $filterNama,
                'departemen'     => $filterDepartemen,
                'shift'          => $filterShift,
                'status_tidur'   => $filterStatus,
                'section'        => $filterSection,
                'batas_jam'      => $filterBatasJam,
                'terlambat'      => $filterTerlambat,
            ],
            'totalRows'   => $totalRows,
            'trashCount'  => $trashCount,
            'error'       => null,
            'formSetting' => [
                'form_status'      => $formSetting->form_status,
                'is_open'          => $formSetting->isOpen(),
                'closed_message'   => $formSetting->closed_message,
                'schedule_enabled' => $formSetting->schedule_enabled,
                'schedule_days'    => $formSetting->schedule_days ?? ['1','2','3','4','5'],
                'schedule_start'   => $formSetting->schedule_start ?? '06:00',
                'schedule_end'     => $formSetting->schedule_end ?? '10:00',
                'location_enabled' => (bool) $formSetting->location_enabled,
                'location_lat'     => $formSetting->location_lat,
                'location_lng'     => $formSetting->location_lng,
                'location_radius'  => $formSetting->location_radius ?? 100,
                'location_embed_url' => $formSetting->location_embed_url,
            ],
        ]);
    }

    // =========================================================================
    // TRASH
    // =========================================================================

    public function trash(): Response
    {
        $deleted = Absensi::onlyTrashed()
            ->orderBy('deleted_at', 'desc')
            ->get()
            ->map(fn ($r) => array_merge(
                $this->normalizeDbRecord($r->toArray()),
                [
                    'deleted_at'     => $r->deleted_at?->format('d/m/Y H:i'),
                    'deleted_reason' => $r->deleted_reason,
                ]
            ))
            ->toArray();

        return Inertia::render('absensi/trash', [
            'deleted' => $deleted,
        ]);
    }

    // =========================================================================
    // STORE
    // =========================================================================

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'nama'         => 'required|string|max:255',
            'tanggal'      => 'required|string',
            'hari'         => 'nullable|string|max:50',
            'shift'        => 'nullable|string|max:10',
            'waktu_mulai'  => 'nullable|string|max:10',
            'perusahaan'   => 'nullable|string|max:255',
            'departemen'   => 'nullable|string|max:255',
            'kegiatan'     => 'nullable|string|max:255',
            'nrp'          => 'nullable|string|max:50',
            'jabatan'      => 'nullable|string|max:255',
            'section'      => 'nullable|string|max:255',
            'lokasi'       => 'nullable|string|max:255',
            'mulai_tidur'  => 'nullable|string|max:10',
            'bangun_tidur' => 'nullable|string|max:10',
        ]);

        if (empty($validated['hari']) && ! empty($validated['tanggal'])) {
            try {
                $validated['hari'] = Carbon::parse($validated['tanggal'])
                    ->locale('id')->isoFormat('dddd');
            } catch (\Exception $e) {}
        }

        $validated['timestamp']   = $validated['tanggal'];
        $validated['is_modified'] = true;

        Absensi::create($validated);

        return redirect()->route('absensi.index')
            ->with('success', 'Data absensi berhasil ditambahkan.');
    }

    // =========================================================================
    // UPDATE
    // =========================================================================

    public function update(Request $request, int $id): RedirectResponse
    {
        $record = Absensi::findOrFail($id);

        $validated = $request->validate([
            'nama'         => 'required|string|max:255',
            'tanggal'      => 'required|string',
            'hari'         => 'nullable|string|max:50',
            'shift'        => 'nullable|string|max:10',
            'waktu_mulai'  => 'nullable|string|max:10',
            'perusahaan'   => 'nullable|string|max:255',
            'departemen'   => 'nullable|string|max:255',
            'kegiatan'     => 'nullable|string|max:255',
            'nrp'          => 'nullable|string|max:50',
            'jabatan'      => 'nullable|string|max:255',
            'section'      => 'nullable|string|max:255',
            'lokasi'       => 'nullable|string|max:255',
            'mulai_tidur'  => 'nullable|string|max:10',
            'bangun_tidur' => 'nullable|string|max:10',
        ]);

        if (empty($validated['hari']) && ! empty($validated['tanggal'])) {
            try {
                $validated['hari'] = Carbon::parse($validated['tanggal'])
                    ->locale('id')->isoFormat('dddd');
            } catch (\Exception $e) {}
        }

        $validated['is_modified'] = true;
        $record->update($validated);

        return redirect()->route('absensi.index')
            ->with('success', 'Data absensi berhasil diperbarui.');
    }

    // =========================================================================
    // DESTROY (soft delete)
    // =========================================================================

    public function destroy(Request $request, int $id): RedirectResponse
    {
        $record = Absensi::findOrFail($id);
        $record->deleted_reason = $request->input('reason');
        $record->save();
        $record->delete();

        return redirect()->route('absensi.index')
            ->with('success', 'Data dipindahkan ke recycle bin.');
    }

    // =========================================================================
    // RESTORE
    // =========================================================================

    public function restore(int $id): RedirectResponse
    {
        Absensi::onlyTrashed()->findOrFail($id)->restore();

        return redirect()->route('absensi.trash')
            ->with('success', 'Data berhasil dikembalikan.');
    }

    // =========================================================================
    // FORCE DELETE
    // =========================================================================

    public function forceDelete(int $id): RedirectResponse
    {
        Absensi::onlyTrashed()->findOrFail($id)->forceDelete();

        return redirect()->route('absensi.trash')
            ->with('success', 'Data berhasil dihapus permanen.');
    }

    // =========================================================================
    // NORMALISASI
    // =========================================================================

    private function normalizeDbRecord(array $record): array
    {
        $tanggalRaw = $record['tanggal'] ?: ($record['timestamp'] ?? '');

        $tanggalFormatted = '';
        $bulan            = '';
        $tahun            = '';
        $timestampSort    = 0;

        if ($tanggalRaw) {
            try {
                $date             = Carbon::parse($tanggalRaw);
                $tanggalFormatted = $date->format('d/m/Y');
                $bulan            = $date->format('m');
                $tahun            = $date->format('Y');
                $timestampSort    = $date->timestamp;
            } catch (\Exception $e) {
                $tanggalFormatted = $tanggalRaw;
            }
        }

        $shift     = $record['shift'] ?? '';
        $tidurInfo = $this->hitungDurasiTidur(
            $record['mulai_tidur'] ?? '',
            $record['bangun_tidur'] ?? '',
            $record['tanggal'] ?? ''
        );

        return [
            'db_id'              => $record['id'],
            'daily_id'           => 'A-' . str_pad($record['id'], 4, '0', STR_PAD_LEFT),
            'timestamp'          => $record['timestamp'] ?? '',
            'hari'               => $record['hari'] ?? '',
            'tanggal'            => $record['tanggal'] ?? '',
            'tanggal_formatted'  => $tanggalFormatted,
            'bulan'              => $bulan,
            'tahun'              => $tahun,
            'timestamp_sort'     => $timestampSort,
            'shift'              => $shift,
            'shift_label'        => $shift ? "Shift {$shift}" : '-',
            'waktu_mulai'        => $record['waktu_mulai'] ?? '',
            'perusahaan'         => $record['perusahaan'] ?? '',
            'departemen'         => $record['departemen'] ?? '',
            'kegiatan'           => $record['kegiatan'] ?? '',
            'peran_kegiatan'     => $record['peran_kegiatan'] ?? '',
            'judul_kegiatan'     => $record['judul_kegiatan'] ?? '',
            'nama'               => $record['nama'] ?? '',
            'nrp'                => $record['nrp'] ?? '',
            'jabatan'            => $record['jabatan'] ?? '',
            'section'            => $record['section'] ?? '',
            'lokasi'             => $record['lokasi'] ?? '',
            'mulai_tidur'        => $record['mulai_tidur'] ?? '',
            'bangun_tidur'       => $record['bangun_tidur'] ?? '',
            'durasi_tidur_jam'   => $tidurInfo['jam'],
            'durasi_tidur_menit' => $tidurInfo['menit'],
            'durasi_tidur_label' => $tidurInfo['label'],
            'status_tidur'       => $tidurInfo['status'],
            'status_tidur_color' => $tidurInfo['color'],
            'is_modified'        => (bool) ($record['is_modified'] ?? false),
            'user_lat'           => isset($record['user_lat']) ? (float) $record['user_lat'] : null,
            'user_lng'           => isset($record['user_lng']) ? (float) $record['user_lng'] : null,
            'selfie_path'        => $record['selfie_path'] ?? null,
        ];
    }

    private function hitungDurasiTidur(string $mulaiTidur, string $bangunTidur, string $tanggal): array
    {
        $default = ['jam' => null, 'menit' => null, 'label' => '-', 'status' => 'UNKNOWN', 'color' => 'gray'];

        if (empty($mulaiTidur) || empty($bangunTidur)) return $default;

        try {
            $baseDate = $tanggal ? Carbon::parse($tanggal)->format('Y-m-d') : Carbon::today()->format('Y-m-d');
            $tidur    = Carbon::parse("{$baseDate} {$mulaiTidur}");
            $bangun   = Carbon::parse("{$baseDate} {$bangunTidur}");

            if ($bangun->lte($tidur)) $bangun->addDay();

            $totalMenit = $tidur->diffInMinutes($bangun);
            $jam        = intdiv($totalMenit, 60);
            $menit      = $totalMenit % 60;
            $label      = "{$jam} jam" . ($menit > 0 ? " {$menit} menit" : '');

            if ($jam >= 6)     { $status = 'FIT TO WORK';     $color = 'green';  }
            elseif ($jam >= 5) { $status = 'COACHING ATASAN'; $color = 'yellow'; }
            else               { $status = 'FATIGUE RISK';    $color = 'red';    }

            return compact('jam', 'menit', 'label', 'status', 'color');
        } catch (\Exception $e) {
            return $default;
        }
    }

    // =========================================================================
    // FILTER & STATS
    // =========================================================================

    private function tandaiKeterlambatan(array $data, string $batasJam): array
    {
        return array_map(function ($row) use ($batasJam) {
            $row['terlambat']         = false;
            $row['selisih_terlambat'] = null;
            $row['jam_isi']           = null;

            $ts = $row['timestamp'] ?? '';
            if (! $ts) return $row;

            try {
                $waktuIsi       = Carbon::parse($ts);
                $row['jam_isi'] = $waktuIsi->format('H:i');
                $batas          = Carbon::parse($waktuIsi->format('Y-m-d') . ' ' . $batasJam);

                if ($waktuIsi->gt($batas)) {
                    $row['terlambat'] = true;
                    $selisihMenit     = $batas->diffInMinutes($waktuIsi);
                    $selisihJam       = intdiv($selisihMenit, 60);
                    $selisihSisa      = $selisihMenit % 60;
                    $row['selisih_terlambat'] = $selisihJam > 0
                        ? "{$selisihJam}j {$selisihSisa}m"
                        : "{$selisihSisa}m";
                }
            } catch (\Exception $e) {}

            return $row;
        }, $data);
    }

    private function filterData(
        array $data, ?string $bulan, ?string $tahun, ?string $nama,
        ?string $departemen, ?string $shift, ?string $statusTidur,
        ?string $section, ?string $terlambat,
        ?string $tanggalDari = null, ?string $tanggalSampai = null
    ): array {
        return array_values(array_filter($data, function ($row) use (
            $bulan, $tahun, $nama, $departemen, $shift, $statusTidur, $section, $terlambat,
            $tanggalDari, $tanggalSampai
        ) {
            if ($bulan       && ($row['bulan'] ?? '') !== $bulan) return false;
            if ($tahun       && ($row['tahun'] ?? '') !== $tahun) return false;
            if ($nama        && stripos($row['nama'] ?? '', $nama) === false) return false;
            if ($departemen  && stripos($row['departemen'] ?? '', $departemen) === false) return false;
            if ($shift       && ($row['shift'] ?? '') !== $shift) return false;
            if ($statusTidur && ($row['status_tidur'] ?? '') !== $statusTidur) return false;
            if ($section     && stripos($row['section'] ?? '', $section) === false) return false;
            if ($terlambat === '1' && ! ($row['terlambat'] ?? false)) return false;
            if ($terlambat === '0' && ($row['terlambat'] ?? false)) return false;

            // Filter tanggal range
            if ($tanggalDari || $tanggalSampai) {
                $tanggalRow = $row['tanggal'] ?? '';
                if (! $tanggalRow) return false;
                try {
                    $tgl = Carbon::parse($tanggalRow)->startOfDay();
                    if ($tanggalDari && $tgl->lt(Carbon::parse($tanggalDari)->startOfDay())) return false;
                    if ($tanggalSampai && $tgl->gt(Carbon::parse($tanggalSampai)->startOfDay())) return false;
                } catch (\Exception $e) {
                    return false;
                }
            }

            return true;
        }));
    }

    private function calculateStats(array $data): array
    {
        $total            = count($data);
        $uniqueKaryawan   = count(array_unique(array_filter(array_column($data, 'nama'))));
        $uniqueDepartemen = count(array_unique(array_filter(array_column($data, 'departemen'))));

        $fitCount = $coachingCount = $fatigueCount = $unknownCount = $terlambatCount = 0;
        $shiftCounts = $departemenCounts = $kegiatanCounts = [];

        foreach ($data as $row) {
            match ($row['status_tidur'] ?? 'UNKNOWN') {
                'FIT TO WORK'     => $fitCount++,
                'COACHING ATASAN' => $coachingCount++,
                'FATIGUE RISK'    => $fatigueCount++,
                default           => $unknownCount++,
            };

            if ($row['terlambat'] ?? false) $terlambatCount++;

            $shift = $row['shift_label'] ?? '-';
            $shiftCounts[$shift] = ($shiftCounts[$shift] ?? 0) + 1;

            $dep = $row['departemen'] ?? '';
            if ($dep) $departemenCounts[$dep] = ($departemenCounts[$dep] ?? 0) + 1;

            $keg = $row['kegiatan'] ?? '';
            if ($keg) $kegiatanCounts[$keg] = ($kegiatanCounts[$keg] ?? 0) + 1;
        }

        arsort($departemenCounts);
        arsort($kegiatanCounts);

        return [
            'total'             => $total,
            'total_karyawan'    => $uniqueKaryawan,
            'total_departemen'  => $uniqueDepartemen,
            'fit_count'         => $fitCount,
            'coaching_count'    => $coachingCount,
            'fatigue_count'     => $fatigueCount,
            'unknown_count'     => $unknownCount,
            'terlambat_count'   => $terlambatCount,
            'shift_counts'      => $shiftCounts,
            'departemen_counts' => array_slice($departemenCounts, 0, 5, true),
            'kegiatan_counts'   => array_slice($kegiatanCounts, 0, 5, true),
        ];
    }
}

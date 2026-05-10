<?php

namespace App\Http\Controllers;

use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Inertia\Inertia;
use Inertia\Response;

class AbsensiController extends Controller
{
    private string $spreadsheetId = '1CX0jhMCPAdaHthr2ixrxIzwAz8zPNRBfZk21tAzQ-9Y';
    private string $sheetGid = '848741941';

    public function index(Request $request): Response
    {
        $apiKey = config('services.google.sheets_api_key');
        $data = [];
        $error = null;
        $sheetTitle = null;

        try {
            $metaResponse = Http::timeout(15)
                ->withOptions(['verify' => app()->isProduction()])
                ->get(
                    "https://sheets.googleapis.com/v4/spreadsheets/{$this->spreadsheetId}",
                    ['key' => $apiKey]
                );

            if ($metaResponse->successful()) {
                $sheets = $metaResponse->json('sheets', []);
                foreach ($sheets as $sheet) {
                    if ((string) ($sheet['properties']['sheetId'] ?? '') === $this->sheetGid) {
                        $sheetTitle = $sheet['properties']['title'];
                        break;
                    }
                }
                if (! $sheetTitle && isset($sheets[0]['properties']['title'])) {
                    $sheetTitle = $sheets[0]['properties']['title'];
                }
            } else {
                $error = 'Gagal terhubung ke Google Sheets: '
                    . $metaResponse->json('error.message', 'Periksa API key dan pastikan spreadsheet sudah dibagikan (public).');
            }

            if ($sheetTitle) {
                $range = urlencode("{$sheetTitle}!A1:Z2000");
                $valuesResponse = Http::timeout(15)
                    ->withOptions(['verify' => app()->isProduction()])
                    ->get(
                        "https://sheets.googleapis.com/v4/spreadsheets/{$this->spreadsheetId}/values/{$range}",
                        ['key' => $apiKey]
                    );

                if ($valuesResponse->successful()) {
                    $values = $valuesResponse->json('values', []);
                    $data = $this->parseSheetData($values);
                } else {
                    $error = 'Gagal mengambil data: ' . $valuesResponse->json('error.message', 'Unknown error');
                }
            }
        } catch (\Exception $e) {
            $error = 'Terjadi kesalahan koneksi: ' . $e->getMessage();
        }

        // Filters
        $filterBulan      = $request->query('bulan');
        $filterTahun      = $request->query('tahun');
        $filterNama       = $request->query('nama');
        $filterDepartemen = $request->query('departemen');
        $filterShift      = $request->query('shift');
        $filterStatus     = $request->query('status_tidur');
        $filterSection    = $request->query('section');
        // Batas waktu pengisian (format HH:MM, default 09:00)
        $filterBatasJam   = $request->query('batas_jam', '09:00');
        $filterTerlambat  = $request->query('terlambat'); // '1' = tampilkan terlambat saja

        // Tandai keterlambatan sebelum filter
        $data = $this->tandaiKeterlambatan($data, $filterBatasJam);

        $filtered = $this->filterData(
            $data, $filterBulan, $filterTahun, $filterNama,
            $filterDepartemen, $filterShift, $filterStatus,
            $filterSection, $filterTerlambat
        );
        $stats = $this->calculateStats($filtered);

        $namaList       = collect($data)->pluck('nama')->unique()->filter()->sort()->values()->toArray();
        $bulanList      = collect($data)->pluck('bulan')->unique()->filter()->sort()->values()->toArray();
        $tahunList      = collect($data)->pluck('tahun')->unique()->filter()->sort()->values()->toArray();
        $departemenList = collect($data)->pluck('departemen')->unique()->filter()->sort()->values()->toArray();
        $shiftList      = collect($data)->pluck('shift')->unique()->filter()->sort()->values()->toArray();
        $sectionList    = collect($data)->pluck('section')->unique()->filter()->sort()->values()->toArray();

        return Inertia::render('absensi/dashboard', [
            'absensi'       => $filtered,
            'stats'         => $stats,
            'namaList'      => $namaList,
            'bulanList'     => $bulanList,
            'tahunList'     => $tahunList,
            'departemenList'=> $departemenList,
            'shiftList'     => $shiftList,
            'sectionList'   => $sectionList,
            'filters'       => [
                'bulan'        => $filterBulan,
                'tahun'        => $filterTahun,
                'nama'         => $filterNama,
                'departemen'   => $filterDepartemen,
                'shift'        => $filterShift,
                'status_tidur' => $filterStatus,
                'section'      => $filterSection,
                'batas_jam'    => $filterBatasJam,
                'terlambat'    => $filterTerlambat,
            ],
            'error'    => $error,
            'totalRows'=> count($data),
        ]);
    }

    // -------------------------------------------------------------------------
    // PARSING
    // -------------------------------------------------------------------------

    private function parseSheetData(array $values): array
    {
        if (empty($values)) {
            return [];
        }

        $headers = array_map(fn ($h) => strtolower(trim($h)), $values[0]);

        // Counter per karyawan untuk generate ID harian
        // key: nama_singkat, value: counter
        $idCounters = [];

        $rows = [];
        for ($i = 1; $i < count($values); $i++) {
            $row    = $values[$i];
            $record = [];

            foreach ($headers as $idx => $header) {
                $record[$header] = isset($row[$idx]) ? trim($row[$idx]) : '';
            }

            $normalized = $this->normalizeRecord($record);

            if (empty($normalized['nama']) && empty($normalized['timestamp'])) {
                continue;
            }

            // Generate daily ID
            $normalized['daily_id'] = $this->generateDailyId($normalized['nama'], $idCounters);

            $rows[] = $normalized;
        }

        return $rows;
    }

    /**
     * Konversi waktu format AM/PM ke 24 jam (HH:MM).
     * Contoh: "8:15:00 AM" -> "08:15", "11:15:00 PM" -> "23:15"
     */
    private function to24Hour(string $time): string
    {
        if (empty($time)) return '';

        // Sudah format 24 jam (tidak ada AM/PM)
        if (stripos($time, 'AM') === false && stripos($time, 'PM') === false) {
            // Pastikan format HH:MM
            try {
                return Carbon::parse($time)->format('H:i');
            } catch (\Exception $e) {
                return $time;
            }
        }

        try {
            return Carbon::createFromFormat('g:i:s A', strtoupper(trim($time)))->format('H:i');
        } catch (\Exception $e) {
            try {
                return Carbon::createFromFormat('g:i A', strtoupper(trim($time)))->format('H:i');
            } catch (\Exception $e2) {
                try {
                    return Carbon::parse($time)->format('H:i');
                } catch (\Exception $e3) {
                    return $time;
                }
            }
        }
    }

    /**
     * Generate ID like ADI0001, ADI0002 per karyawan secara berurutan.
     */
    private function generateDailyId(string $nama, array &$counters): string
    {
        // Ambil 3 huruf pertama nama, uppercase, hapus spasi
        $words  = preg_split('/\s+/', trim($nama));
        $prefix = '';

        if (count($words) >= 2) {
            // Ambil 2 huruf dari kata pertama + 1 huruf dari kata kedua
            $prefix = strtoupper(substr($words[0], 0, 2) . substr($words[1], 0, 1));
        } else {
            $prefix = strtoupper(substr($words[0], 0, 3));
        }

        $prefix = preg_replace('/[^A-Z]/', '', $prefix);
        if (strlen($prefix) < 2) {
            $prefix = strtoupper(substr(preg_replace('/[^a-zA-Z]/', '', $nama), 0, 3));
        }

        $counters[$prefix] = ($counters[$prefix] ?? 0) + 1;

        return $prefix . str_pad($counters[$prefix], 4, '0', STR_PAD_LEFT);
    }

    private function normalizeRecord(array $record): array
    {
        $normalized = [
            'timestamp'   => $record['timestamp'] ?? '',
            'hari'        => $record['hari pelaksanaan'] ?? '',
            'tanggal'     => $record['tanggal pelaksanaan'] ?? '',
            'shift'       => $record['shift kerja'] ?? '',
            'waktu_mulai' => $this->to24Hour($record['waktu mulai (jam)'] ?? ''),
            'perusahaan'  => $record['perusahaan pelaksana'] ?? '',
            'departemen'  => $record['departemen pelaksana'] ?? '',
            'kegiatan'    => $record['kegiatan'] ?? '',
            'nama'        => trim($record['nama '] ?? $record['nama'] ?? ''),
            'nrp'         => $record['nrp'] ?? '',
            'mulai_tidur' => $this->to24Hour($record['mulai tidur'] ?? ''),
            'bangun_tidur'=> $this->to24Hour($record['bangun tidur'] ?? ''),
            'jabatan'     => $record['jabatan'] ?? '',
            'section'     => $record['section'] ?? '',
        ];

        // Parse tanggal
        $tanggalRaw = $normalized['tanggal'] ?: $normalized['timestamp'];
        if ($tanggalRaw) {
            try {
                $date = Carbon::parse($tanggalRaw);
                $normalized['tanggal_formatted'] = $date->format('d/m/Y');
                $normalized['bulan']             = $date->format('m');
                $normalized['tahun']             = $date->format('Y');
                $normalized['timestamp_sort']    = $date->timestamp;
            } catch (\Exception $e) {
                $normalized['tanggal_formatted'] = $tanggalRaw;
                $normalized['bulan']             = '';
                $normalized['tahun']             = '';
                $normalized['timestamp_sort']    = 0;
            }
        } else {
            $normalized['tanggal_formatted'] = '';
            $normalized['bulan']             = '';
            $normalized['tahun']             = '';
            $normalized['timestamp_sort']    = 0;
        }

        // Shift label
        $shift = $normalized['shift'];
        $normalized['shift_label'] = $shift ? "Shift {$shift}" : '-';

        // Hitung durasi tidur & status
        $tidurInfo = $this->hitungDurasiTidur(
            $normalized['mulai_tidur'],
            $normalized['bangun_tidur'],
            $normalized['tanggal']
        );
        $normalized['durasi_tidur_jam']   = $tidurInfo['jam'];
        $normalized['durasi_tidur_menit'] = $tidurInfo['menit'];
        $normalized['durasi_tidur_label'] = $tidurInfo['label'];
        $normalized['status_tidur']       = $tidurInfo['status'];
        $normalized['status_tidur_color'] = $tidurInfo['color'];

        return $normalized;
    }

    /**
     * Hitung durasi tidur dan tentukan status FIT/COACHING/FATIGUE.
     */
    private function hitungDurasiTidur(string $mulaiTidur, string $bangunTidur, string $tanggal): array
    {
        $default = [
            'jam'    => null,
            'menit'  => null,
            'label'  => '-',
            'status' => 'UNKNOWN',
            'color'  => 'gray',
        ];

        if (empty($mulaiTidur) || empty($bangunTidur)) {
            return $default;
        }

        try {
            // Gunakan tanggal pelaksanaan sebagai referensi
            $baseDate = $tanggal ? Carbon::parse($tanggal)->format('Y-m-d') : Carbon::today()->format('Y-m-d');

            $tidur  = Carbon::parse("{$baseDate} {$mulaiTidur}");
            $bangun = Carbon::parse("{$baseDate} {$bangunTidur}");

            // Jika bangun <= tidur, berarti bangun keesokan harinya
            if ($bangun->lte($tidur)) {
                $bangun->addDay();
            }

            $totalMenit = $tidur->diffInMinutes($bangun);
            $jam        = intdiv($totalMenit, 60);
            $menit      = $totalMenit % 60;
            $label      = "{$jam} jam " . ($menit > 0 ? "{$menit} menit" : '');

            // Tentukan status berdasarkan aturan
            if ($jam >= 6) {
                // 6-8 jam = FIT TO WORK
                $status = 'FIT TO WORK';
                $color  = 'green';
            } elseif ($jam >= 5) {
                // 5-6 jam = COACHING ATASAN
                $status = 'COACHING ATASAN';
                $color  = 'yellow';
            } else {
                // < 5 jam = FATIGUE RISK
                $status = 'FATIGUE RISK';
                $color  = 'red';
            }

            return compact('jam', 'menit', 'label', 'status', 'color');
        } catch (\Exception $e) {
            return $default;
        }
    }

    // -------------------------------------------------------------------------
    // FILTER
    // -------------------------------------------------------------------------

    /**
     * Tandai setiap baris apakah terlambat mengisi berdasarkan timestamp vs batas jam.
     * Terlambat = timestamp (jam pengisian) > batas_jam pada hari yang sama.
     */
    private function tandaiKeterlambatan(array $data, string $batasJam): array
    {
        return array_map(function ($row) use ($batasJam) {
            $row['terlambat']        = false;
            $row['selisih_terlambat'] = null;
            $row['jam_isi']          = null;

            $ts = $row['timestamp'] ?? '';
            if (! $ts) return $row;

            try {
                $waktuIsi  = Carbon::parse($ts);
                $row['jam_isi'] = $waktuIsi->format('H:i');

                // Batas jam pada hari yang sama dengan pengisian
                $batas = Carbon::parse($waktuIsi->format('Y-m-d') . ' ' . $batasJam);

                if ($waktuIsi->gt($batas)) {
                    $row['terlambat'] = true;
                    $selisihMenit     = $batas->diffInMinutes($waktuIsi);
                    $selisihJam       = intdiv($selisihMenit, 60);
                    $selisihSisa      = $selisihMenit % 60;
                    $row['selisih_terlambat'] = $selisihJam > 0
                        ? "{$selisihJam}j {$selisihSisa}m"
                        : "{$selisihSisa}m";
                }
            } catch (\Exception $e) {
                // biarkan default
            }

            return $row;
        }, $data);
    }

    private function filterData(
        array $data,
        ?string $bulan,
        ?string $tahun,
        ?string $nama,
        ?string $departemen,
        ?string $shift,
        ?string $statusTidur,
        ?string $section,
        ?string $terlambat
    ): array {
        return array_values(array_filter($data, function ($row) use (
            $bulan, $tahun, $nama, $departemen, $shift, $statusTidur, $section, $terlambat
        ) {
            if ($bulan && ($row['bulan'] ?? '') !== $bulan) return false;
            if ($tahun && ($row['tahun'] ?? '') !== $tahun) return false;
            if ($nama && stripos($row['nama'] ?? '', $nama) === false) return false;
            if ($departemen && stripos($row['departemen'] ?? '', $departemen) === false) return false;
            if ($shift && ($row['shift'] ?? '') !== $shift) return false;
            if ($statusTidur && ($row['status_tidur'] ?? '') !== $statusTidur) return false;
            if ($section && stripos($row['section'] ?? '', $section) === false) return false;
            if ($terlambat === '1' && ! ($row['terlambat'] ?? false)) return false;
            if ($terlambat === '0' && ($row['terlambat'] ?? false)) return false;
            return true;
        }));
    }

    // -------------------------------------------------------------------------
    // STATS
    // -------------------------------------------------------------------------

    private function calculateStats(array $data): array
    {
        $total            = count($data);
        $uniqueKaryawan   = count(array_unique(array_filter(array_column($data, 'nama'))));
        $uniqueDepartemen = count(array_unique(array_filter(array_column($data, 'departemen'))));

        $fitCount      = 0;
        $coachingCount = 0;
        $fatigueCount  = 0;
        $unknownCount  = 0;
        $terlambatCount = 0;

        $shiftCounts      = [];
        $departemenCounts = [];
        $kegiatanCounts   = [];

        foreach ($data as $row) {
            // Status tidur
            match ($row['status_tidur'] ?? 'UNKNOWN') {
                'FIT TO WORK'     => $fitCount++,
                'COACHING ATASAN' => $coachingCount++,
                'FATIGUE RISK'    => $fatigueCount++,
                default           => $unknownCount++,
            };

            // Terlambat
            if ($row['terlambat'] ?? false) $terlambatCount++;

            // Shift
            $shift = $row['shift_label'] ?? '-';
            $shiftCounts[$shift] = ($shiftCounts[$shift] ?? 0) + 1;

            // Departemen
            $dep = $row['departemen'] ?? '';
            if ($dep) $departemenCounts[$dep] = ($departemenCounts[$dep] ?? 0) + 1;

            // Kegiatan
            $keg = $row['kegiatan'] ?? '';
            if ($keg) $kegiatanCounts[$keg] = ($kegiatanCounts[$keg] ?? 0) + 1;
        }

        arsort($departemenCounts);
        arsort($kegiatanCounts);

        return [
            'total'            => $total,
            'total_karyawan'   => $uniqueKaryawan,
            'total_departemen' => $uniqueDepartemen,
            'fit_count'        => $fitCount,
            'coaching_count'   => $coachingCount,
            'fatigue_count'    => $fatigueCount,
            'unknown_count'    => $unknownCount,
            'terlambat_count'  => $terlambatCount,
            'shift_counts'     => $shiftCounts,
            'departemen_counts'=> array_slice($departemenCounts, 0, 5, true),
            'kegiatan_counts'  => array_slice($kegiatanCounts, 0, 5, true),
        ];
    }
}

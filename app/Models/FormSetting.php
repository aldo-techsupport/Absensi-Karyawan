<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Model;

class FormSetting extends Model
{
    protected $table = 'form_settings';

    protected $fillable = [
        'form_status',
        'closed_message',
        'schedule_enabled',
        'schedule_days',
        'schedule_start',
        'schedule_end',
    ];

    protected $casts = [
        'schedule_enabled' => 'boolean',
        'schedule_days'    => 'array',
    ];

    /**
     * Ambil satu-satunya baris setting (singleton pattern).
     */
    public static function instance(): self
    {
        return self::firstOrCreate([], [
            'form_status'      => 'open',
            'closed_message'   => 'Form absensi sedang ditutup. Silakan hubungi admin.',
            'schedule_enabled' => false,
            'schedule_days'    => ['1', '2', '3', '4', '5'],
            'schedule_start'   => '06:00',
            'schedule_end'     => '10:00',
        ]);
    }

    /**
     * Apakah form saat ini terbuka?
     * Jika schedule aktif, cek hari & jam. Jika tidak, pakai status manual.
     */
    public function isOpen(): bool
    {
        if ($this->schedule_enabled) {
            return $this->isWithinSchedule();
        }

        return $this->form_status === 'open';
    }

    /**
     * Cek apakah waktu sekarang masuk dalam jadwal.
     */
    public function isWithinSchedule(): bool
    {
        $now = Carbon::now();

        // Cek hari (Carbon: 1=Senin ... 7=Minggu, sama dengan ISO)
        $days = $this->schedule_days ?? [];
        if (!in_array((string) $now->isoWeekday(), $days)) {
            return false;
        }

        // Cek jam
        $start = $this->schedule_start;
        $end   = $this->schedule_end;

        if (!$start || !$end) {
            return true;
        }

        $nowTime   = $now->format('H:i');
        return $nowTime >= $start && $nowTime <= $end;
    }
}

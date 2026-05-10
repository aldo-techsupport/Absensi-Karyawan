<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Absensi extends Model
{
    use SoftDeletes;

    protected $table = 'absensi';

    protected $fillable = [
        'hari',
        'tanggal',
        'shift',
        'waktu_mulai',
        'perusahaan',
        'departemen',
        'kegiatan',
        'judul_kegiatan',
        'nama',
        'nrp',
        'jabatan',
        'section',
        'lokasi',
        'mulai_tidur',
        'bangun_tidur',
        'timestamp',
        'sheet_row_hash',
        'is_modified',
        'deleted_reason',
    ];

    protected $casts = [
        'is_modified' => 'boolean',
        'deleted_at'  => 'datetime',
    ];
}

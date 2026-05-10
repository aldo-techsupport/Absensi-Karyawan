<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('absensi', function (Blueprint $table) {
            // Judul kegiatan — wajib diisi jika jabatan = GL
            $table->string('judul_kegiatan')->nullable()->after('kegiatan');
        });
    }

    public function down(): void
    {
        Schema::table('absensi', function (Blueprint $table) {
            $table->dropColumn('judul_kegiatan');
        });
    }
};

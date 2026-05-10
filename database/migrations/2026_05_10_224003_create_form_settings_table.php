<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('form_settings', function (Blueprint $table) {
            $table->id();
            // Status manual: 'open' | 'closed'
            $table->enum('form_status', ['open', 'closed'])->default('open');
            // Pesan saat form ditutup
            $table->string('closed_message', 500)->default('Form absensi sedang ditutup. Silakan hubungi admin.');
            // Jadwal otomatis
            $table->boolean('schedule_enabled')->default(false);
            // Hari aktif: JSON array, e.g. ["1","2","3","4","5"] (1=Senin ... 7=Minggu)
            $table->json('schedule_days')->nullable();
            // Jam buka & tutup, e.g. "06:00" dan "10:00"
            $table->string('schedule_start', 5)->nullable();
            $table->string('schedule_end', 5)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('form_settings');
    }
};

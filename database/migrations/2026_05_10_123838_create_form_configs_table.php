<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('form_configs', function (Blueprint $table) {
            $table->id();
            $table->string('field_key')->unique();   // e.g. 'perusahaan', 'departemen', 'kegiatan', 'section', 'lokasi'
            $table->string('field_label');            // Label yang tampil di form
            $table->boolean('is_active')->default(true);
            $table->boolean('is_required')->default(false);
            $table->integer('sort_order')->default(0);
            $table->json('options');                  // Array opsi pilihan
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('form_configs');
    }
};

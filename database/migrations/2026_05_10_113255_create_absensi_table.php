<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('absensi', function (Blueprint $table) {
            $table->id();
            $table->string('hari')->nullable();
            $table->string('tanggal')->nullable();
            $table->string('shift')->nullable();
            $table->string('waktu_mulai')->nullable();
            $table->string('perusahaan')->nullable();
            $table->string('departemen')->nullable();
            $table->string('kegiatan')->nullable();
            $table->string('nama');
            $table->string('nrp')->nullable();
            $table->string('jabatan')->nullable();
            $table->string('section')->nullable();
            $table->string('mulai_tidur')->nullable();
            $table->string('bangun_tidur')->nullable();
            $table->string('timestamp')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('absensi');
    }
};

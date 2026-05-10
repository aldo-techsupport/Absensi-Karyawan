<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('absensi', function (Blueprint $table) {
            // Soft delete — data tidak benar-benar hilang
            $table->softDeletes()->after('sheet_row_hash');
            // Flag: sudah pernah diedit manual (sync tidak akan overwrite)
            $table->boolean('is_modified')->default(false)->after('deleted_at');
            // Catatan alasan penghapusan (opsional)
            $table->string('deleted_reason')->nullable()->after('is_modified');
        });
    }

    public function down(): void
    {
        Schema::table('absensi', function (Blueprint $table) {
            $table->dropSoftDeletes();
            $table->dropColumn(['is_modified', 'deleted_reason']);
        });
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('form_settings', function (Blueprint $table) {
            // Array of {lat, lng, label, enabled} — max 10 titik koordinat
            $table->json('location_points')->nullable()->after('location_embed_url');
        });
    }

    public function down(): void
    {
        Schema::table('form_settings', function (Blueprint $table) {
            $table->dropColumn('location_points');
        });
    }
};

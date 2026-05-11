<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('form_settings', function (Blueprint $table) {
            // Validasi lokasi GPS
            $table->boolean('location_enabled')->default(false)->after('schedule_end');
            $table->decimal('location_lat', 10, 7)->nullable()->after('location_enabled');
            $table->decimal('location_lng', 10, 7)->nullable()->after('location_lat');
            $table->integer('location_radius')->default(100)->after('location_lng'); // meter
        });
    }

    public function down(): void
    {
        Schema::table('form_settings', function (Blueprint $table) {
            $table->dropColumn(['location_enabled', 'location_lat', 'location_lng', 'location_radius']);
        });
    }
};

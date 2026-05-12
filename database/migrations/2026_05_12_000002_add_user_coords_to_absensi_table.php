<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('absensi', function (Blueprint $table) {
            $table->decimal('user_lat', 10, 7)->nullable()->after('timestamp');
            $table->decimal('user_lng', 10, 7)->nullable()->after('user_lat');
        });
    }

    public function down(): void
    {
        Schema::table('absensi', function (Blueprint $table) {
            $table->dropColumn(['user_lat', 'user_lng']);
        });
    }
};

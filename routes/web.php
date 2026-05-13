<?php

use App\Http\Controllers\AbsensiController;
use App\Http\Controllers\AbsensiEditController;
use App\Http\Controllers\AbsensiFormController;
use App\Http\Controllers\FormConfigController;
use App\Http\Controllers\FormSettingController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\UserFilterPreferenceController;
use Illuminate\Support\Facades\Route;

Route::redirect('/', '/login')->name('home');

// ── Form Absensi Publik (tanpa login) ──────────────────────────────────────
Route::get('absensi/form', [AbsensiFormController::class, 'create'])->name('absensi.form');
Route::post('absensi/form', [AbsensiFormController::class, 'submit'])->name('absensi.form.submit');
Route::get('absensi/form/success', [AbsensiFormController::class, 'success'])->name('absensi.form.success');
Route::post('absensi/selfie/prepare', [AbsensiFormController::class, 'prepareSelfie'])->name('absensi.selfie.prepare');
Route::get('absensi/selfie', [AbsensiFormController::class, 'selfie'])->name('absensi.selfie');
Route::post('absensi/selfie', [AbsensiFormController::class, 'selfieSubmit'])->name('absensi.selfie.submit');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::inertia('dashboard', 'dashboard')->name('dashboard');

    // ── Semua user bisa akses (view + export) ──
    Route::get('absensi', [AbsensiController::class, 'index'])->name('absensi.index');
    Route::get('absensi/trash', [AbsensiController::class, 'trash'])->name('absensi.trash');
    Route::post('user/filter-preferences', [UserFilterPreferenceController::class, 'save'])->name('user.filter-preferences.save');

    // ── Admin only ──
    Route::middleware('admin')->group(function () {
        Route::post('absensi', [AbsensiController::class, 'store'])->name('absensi.store');
        Route::put('absensi/{id}', [AbsensiController::class, 'update'])->name('absensi.update');
        Route::delete('absensi/{id}', [AbsensiController::class, 'destroy'])->name('absensi.destroy');
        Route::post('absensi/{id}/restore', [AbsensiController::class, 'restore'])->name('absensi.restore');
        Route::delete('absensi/{id}/force', [AbsensiController::class, 'forceDelete'])->name('absensi.force-delete');

        Route::get('absensi/{id}/edit', [AbsensiEditController::class, 'edit'])->name('absensi.edit');
        Route::put('absensi/{id}/edit', [AbsensiEditController::class, 'update'])->name('absensi.edit.update');

        Route::get('absensi/form-config', [FormConfigController::class, 'index'])->name('absensi.form-config');
        Route::post('absensi/form-config/bulk-save', [FormConfigController::class, 'bulkSave'])->name('absensi.form-config.bulk-save');
        Route::post('absensi/form-config', [FormConfigController::class, 'store'])->name('absensi.form-config.store');
        Route::put('absensi/form-config/{id}', [FormConfigController::class, 'update'])->name('absensi.form-config.update');
        Route::post('absensi/form-config/{id}/toggle', [FormConfigController::class, 'toggle'])->name('absensi.form-config.toggle');
        Route::delete('absensi/form-config/{id}', [FormConfigController::class, 'destroy'])->name('absensi.form-config.destroy');

        // ── Form Setting (start/stop + schedule + location) ──
        Route::post('absensi/form-setting/toggle', [FormSettingController::class, 'toggle'])->name('absensi.form-setting.toggle');
        Route::post('absensi/form-setting/schedule', [FormSettingController::class, 'updateSchedule'])->name('absensi.form-setting.schedule');
        Route::get('absensi/lokasi', [FormSettingController::class, 'lokasi'])->name('absensi.lokasi');
        Route::post('absensi/form-setting/location', [FormSettingController::class, 'updateLocation'])->name('absensi.form-setting.location');

        // ── Kelola User ──
        Route::get('users', [UserController::class, 'index'])->name('users.index');
        Route::post('users', [UserController::class, 'store'])->name('users.store');
        Route::put('users/{id}', [UserController::class, 'update'])->name('users.update');
        Route::delete('users/{id}', [UserController::class, 'destroy'])->name('users.destroy');
    });
});

require __DIR__.'/settings.php';

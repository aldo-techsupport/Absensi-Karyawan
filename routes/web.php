<?php

use App\Http\Controllers\AbsensiController;
use App\Http\Controllers\AbsensiEditController;
use App\Http\Controllers\AbsensiFormController;
use App\Http\Controllers\FormConfigController;
use Illuminate\Support\Facades\Route;

Route::redirect('/', '/login')->name('home');

// ── Form Absensi Publik (tanpa login) ──────────────────────────────────────
Route::get('absensi/form', [AbsensiFormController::class, 'create'])->name('absensi.form');
Route::post('absensi/form', [AbsensiFormController::class, 'submit'])->name('absensi.form.submit');
Route::get('absensi/form/success', [AbsensiFormController::class, 'success'])->name('absensi.form.success');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::inertia('dashboard', 'dashboard')->name('dashboard');

    Route::get('absensi', [AbsensiController::class, 'index'])->name('absensi.index');
    Route::get('absensi/trash', [AbsensiController::class, 'trash'])->name('absensi.trash');
    Route::post('absensi', [AbsensiController::class, 'store'])->name('absensi.store');
    Route::put('absensi/{id}', [AbsensiController::class, 'update'])->name('absensi.update');
    Route::delete('absensi/{id}', [AbsensiController::class, 'destroy'])->name('absensi.destroy');
    Route::post('absensi/{id}/restore', [AbsensiController::class, 'restore'])->name('absensi.restore');
    Route::delete('absensi/{id}/force', [AbsensiController::class, 'forceDelete'])->name('absensi.force-delete');

    // Edit halaman penuh (form lengkap seperti form publik)
    Route::get('absensi/{id}/edit', [AbsensiEditController::class, 'edit'])->name('absensi.edit');
    Route::put('absensi/{id}/edit', [AbsensiEditController::class, 'update'])->name('absensi.edit.update');

    // Konfigurasi form — admin bisa edit opsi field
    Route::get('absensi/form-config', [FormConfigController::class, 'index'])->name('absensi.form-config');
    Route::post('absensi/form-config/bulk-save', [FormConfigController::class, 'bulkSave'])->name('absensi.form-config.bulk-save');
    Route::post('absensi/form-config', [FormConfigController::class, 'store'])->name('absensi.form-config.store');
    Route::put('absensi/form-config/{id}', [FormConfigController::class, 'update'])->name('absensi.form-config.update');
    Route::post('absensi/form-config/{id}/toggle', [FormConfigController::class, 'toggle'])->name('absensi.form-config.toggle');
    Route::delete('absensi/form-config/{id}', [FormConfigController::class, 'destroy'])->name('absensi.form-config.destroy');
});

require __DIR__.'/settings.php';

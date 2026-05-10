<?php

namespace Database\Seeders;

use App\Models\FormConfig;
use Illuminate\Database\Seeder;

class FormConfigSeeder extends Seeder
{
    public function run(): void
    {
        $configs = [
            [
                'field_key'   => 'perusahaan',
                'field_label' => 'Perusahaan Pelaksana',
                'is_active'   => true,
                'is_required' => false,
                'sort_order'  => 1,
                'options'     => ['PT KPP MINING'],
            ],
            [
                'field_key'   => 'departemen',
                'field_label' => 'Departemen Pelaksana',
                'is_active'   => true,
                'is_required' => false,
                'sort_order'  => 2,
                'options'     => ['PLANT', 'MINE', 'ENGINEERING', 'HSE', 'HR & GA', 'FINANCE', 'IT', 'LOGISTIC'],
            ],
            [
                'field_key'   => 'kegiatan',
                'field_label' => 'Kegiatan',
                'is_active'   => true,
                'is_required' => true,
                'sort_order'  => 3,
                'options'     => ['P5M', 'SAFETY TALK', 'SAFETY ALERT'],
            ],
            [
                'field_key'   => 'section',
                'field_label' => 'Section',
                'is_active'   => true,
                'is_required' => true,
                'sort_order'  => 4,
                'options'     => ['* Service & Fabrikasi', '* Daily, Repair & Fabrikasi', '* Tyre', 'KLM', 'KHG'],
            ],
            [
                'field_key'   => 'lokasi',
                'field_label' => 'Lokasi',
                'is_active'   => true,
                'is_required' => false,
                'sort_order'  => 5,
                'options'     => ['WS 25', 'Quarry', 'Crusher'],
            ],
        ];

        foreach ($configs as $config) {
            FormConfig::updateOrCreate(
                ['field_key' => $config['field_key']],
                $config
            );
        }
    }
}

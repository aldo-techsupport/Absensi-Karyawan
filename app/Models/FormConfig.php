<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FormConfig extends Model
{
    protected $table = 'form_configs';

    protected $fillable = [
        'field_key',
        'field_label',
        'is_active',
        'is_required',
        'sort_order',
        'options',
    ];

    protected $casts = [
        'options'     => 'array',
        'is_active'   => 'boolean',
        'is_required' => 'boolean',
    ];
}

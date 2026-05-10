import { Head, router } from '@inertiajs/react';
import {
    AlignLeft,
    CheckSquare,
    ChevronDown,
    ChevronUp,
    Copy,
    GripVertical,
    ListChecks,
    Plus,
    Trash2,
    X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// ─── Types ────────────────────────────────────────────────────────────────────

type FieldType = 'radio' | 'text' | 'checkbox';

interface FieldConfig {
    id: number | null;       // null = belum disimpan (baru ditambah)
    field_key: string;
    field_label: string;
    field_type: FieldType;
    is_active: boolean;
    is_required: boolean;
    sort_order: number;
    options: string[];
    is_built_in: boolean;
    is_dirty: boolean;       // ada perubahan belum disimpan
}

interface Props {
    configs: Array<{
        id: number;
        field_key: string;
        field_label: string;
        is_active: boolean;
        is_required: boolean;
        sort_order: number;
        options: string[];
    }>;
}

const BUILT_IN = ['perusahaan', 'departemen', 'kegiatan', 'section'];

const FIELD_TYPE_ICONS: Record<FieldType, React.ReactNode> = {
    radio:    <ListChecks className="h-4 w-4" />,
    text:     <AlignLeft className="h-4 w-4" />,
    checkbox: <CheckSquare className="h-4 w-4" />,
};

const FIELD_TYPE_LABELS: Record<FieldType, string> = {
    radio:    'Pilihan ganda',
    text:     'Jawaban singkat',
    checkbox: 'Kotak centang',
};

// ─── Unique key generator ─────────────────────────────────────────────────────

let _uid = 0;
const uid = () => `new_${++_uid}`;

// ─── Single Field Card ────────────────────────────────────────────────────────

function FieldCard({
    field,
    index,
    total,
    isActive,
    onActivate,
    onChange,
    onDelete,
    onDuplicate,
    onMoveUp,
    onMoveDown,
    onInsertAfter,
}: {
    field: FieldConfig;
    index: number;
    total: number;
    isActive: boolean;
    onActivate: () => void;
    onChange: (updated: FieldConfig) => void;
    onDelete: () => void;
    onDuplicate: () => void;
    onMoveUp: () => void;
    onMoveDown: () => void;
    onInsertAfter: () => void;
}) {
    const labelRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isActive && labelRef.current) {
            labelRef.current.focus();
        }
    }, [isActive]);

    const updateOption = (i: number, val: string) => {
        const opts = [...field.options];
        opts[i] = val;
        onChange({ ...field, options: opts, is_dirty: true });
    };

    const addOption = (afterIndex?: number) => {
        const opts = [...field.options];
        const insertAt = afterIndex !== undefined ? afterIndex + 1 : opts.length;
        opts.splice(insertAt, 0, '');
        onChange({ ...field, options: opts, is_dirty: true });
    };

    const removeOption = (i: number) => {
        const opts = field.options.filter((_, idx) => idx !== i);
        onChange({ ...field, options: opts.length ? opts : [''], is_dirty: true });
    };

    const hasOptions = field.field_type === 'radio' || field.field_type === 'checkbox';

    return (
        <div className="group relative">
            {/* Card */}
            <div
                onClick={onActivate}
                className={`relative rounded-xl border bg-white transition-all dark:bg-gray-900 ${
                    isActive
                        ? 'border-blue-400 shadow-md ring-1 ring-blue-400/30'
                        : 'border-border hover:border-muted-foreground/40 cursor-pointer'
                }`}
            >
                {/* Active left bar */}
                {isActive && (
                    <div className="absolute left-0 top-4 bottom-4 w-1 rounded-full bg-blue-500" />
                )}

                <div className="p-5 pl-6">
                    {/* Drag handle + move buttons */}
                    <div className="absolute -left-8 top-1/2 -translate-y-1/2 flex flex-col items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onMoveUp(); }}
                            disabled={index === 0}
                            className="rounded p-0.5 hover:bg-muted disabled:opacity-30"
                        >
                            <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                        <GripVertical className="h-4 w-4 text-muted-foreground/50" />
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onMoveDown(); }}
                            disabled={index === total - 1}
                            className="rounded p-0.5 hover:bg-muted disabled:opacity-30"
                        >
                            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                    </div>

                    {/* Header row: label + type selector */}
                    <div className="flex items-start gap-3">
                        <div className="flex-1">
                            {isActive ? (
                                <Input
                                    ref={labelRef}
                                    value={field.field_label}
                                    onChange={(e) => onChange({ ...field, field_label: e.target.value, is_dirty: true })}
                                    placeholder="Pertanyaan"
                                    className="border-0 border-b border-muted-foreground/30 rounded-none px-0 text-base font-medium focus-visible:ring-0 focus-visible:border-blue-500"
                                />
                            ) : (
                                <p className="text-base font-medium">
                                    {field.field_label || <span className="text-muted-foreground italic">Pertanyaan</span>}
                                    {field.is_required && <span className="ml-1 text-red-500">*</span>}
                                </p>
                            )}
                        </div>

                        {/* Type selector */}
                        {isActive && (
                            <div className="relative shrink-0">
                                <select
                                    value={field.field_type}
                                    onChange={(e) => onChange({ ...field, field_type: e.target.value as FieldType, is_dirty: true })}
                                    className="appearance-none rounded-lg border bg-muted/30 py-1.5 pl-8 pr-8 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                                >
                                    {Object.entries(FIELD_TYPE_LABELS).map(([val, label]) => (
                                        <option key={val} value={val}>{label}</option>
                                    ))}
                                </select>
                                <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground">
                                    {FIELD_TYPE_ICONS[field.field_type]}
                                </span>
                                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                            </div>
                        )}

                        {/* Inactive: show type badge */}
                        {!isActive && (
                            <span className="flex items-center gap-1 rounded-md border bg-muted/30 px-2 py-1 text-xs text-muted-foreground">
                                {FIELD_TYPE_ICONS[field.field_type]}
                                {FIELD_TYPE_LABELS[field.field_type]}
                            </span>
                        )}
                    </div>

                    {/* Options */}
                    {hasOptions && (
                        <div className="mt-4 space-y-2">
                            {field.options.map((opt, i) => (
                                <div key={i} className="flex items-center gap-2">
                                    {/* Radio/checkbox indicator */}
                                    <div className={`h-4 w-4 shrink-0 border-2 border-muted-foreground/40 ${field.field_type === 'radio' ? 'rounded-full' : 'rounded'}`} />

                                    {isActive ? (
                                        <>
                                            <Input
                                                value={opt}
                                                onChange={(e) => updateOption(i, e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') { e.preventDefault(); addOption(i); }
                                                }}
                                                placeholder={`Opsi ${i + 1}`}
                                                className="h-8 border-0 border-b border-muted-foreground/20 rounded-none px-0 text-sm focus-visible:ring-0 focus-visible:border-blue-400"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => removeOption(i)}
                                                className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-red-50 hover:text-red-500"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        </>
                                    ) : (
                                        <span className="text-sm text-muted-foreground">{opt || `Opsi ${i + 1}`}</span>
                                    )}
                                </div>
                            ))}

                            {/* Add option row */}
                            {isActive && (
                                <div className="flex items-center gap-2">
                                    <div className={`h-4 w-4 shrink-0 border-2 border-muted-foreground/20 ${field.field_type === 'radio' ? 'rounded-full' : 'rounded'}`} />
                                    <button
                                        type="button"
                                        onClick={() => addOption()}
                                        className="text-sm text-blue-600 hover:underline dark:text-blue-400"
                                    >
                                        Tambah opsi
                                    </button>
                                    <span className="text-xs text-muted-foreground">atau</span>
                                    <button
                                        type="button"
                                        className="text-sm text-blue-600 hover:underline dark:text-blue-400"
                                        onClick={() => {
                                            const opts = [...field.options];
                                            // "Other" sudah otomatis di form publik, ini hanya info
                                        }}
                                    >
                                        tambah "Lainnya"
                                    </button>
                                </div>
                            )}

                            {/* Inactive: show "Other" hint */}
                            {!isActive && (
                                <div className="flex items-center gap-2">
                                    <div className={`h-4 w-4 shrink-0 border-2 border-dashed border-muted-foreground/30 ${field.field_type === 'radio' ? 'rounded-full' : 'rounded'}`} />
                                    <span className="text-xs italic text-muted-foreground">Lainnya (otomatis)</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Text field preview */}
                    {field.field_type === 'text' && (
                        <div className="mt-4">
                            <div className="h-8 w-48 rounded border-b-2 border-muted-foreground/30 bg-transparent" />
                            <p className="mt-1 text-xs text-muted-foreground">Jawaban singkat</p>
                        </div>
                    )}

                    {/* Bottom toolbar (only when active) */}
                    {isActive && (
                        <div className="mt-5 flex items-center justify-end gap-1 border-t pt-3">
                            <button
                                type="button"
                                onClick={onDuplicate}
                                title="Duplikat"
                                className="rounded-full p-2 text-muted-foreground hover:bg-muted"
                            >
                                <Copy className="h-4 w-4" />
                            </button>
                            {!field.is_built_in && (
                                <button
                                    type="button"
                                    onClick={onDelete}
                                    title="Hapus"
                                    className="rounded-full p-2 text-muted-foreground hover:bg-red-50 hover:text-red-500"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            )}
                            <div className="mx-2 h-5 w-px bg-border" />
                            {/* Wajib diisi toggle */}
                            <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                                Wajib diisi
                                <button
                                    type="button"
                                    role="switch"
                                    aria-checked={field.is_required}
                                    onClick={() => onChange({ ...field, is_required: !field.is_required, is_dirty: true })}
                                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                                        field.is_required ? 'bg-blue-600' : 'bg-muted-foreground/30'
                                    }`}
                                >
                                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                                        field.is_required ? 'translate-x-4' : 'translate-x-1'
                                    }`} />
                                </button>
                            </label>
                        </div>
                    )}
                </div>
            </div>

            {/* Insert button between cards */}
            <div className="flex justify-center py-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                    type="button"
                    onClick={onInsertAfter}
                    className="flex items-center gap-1 rounded-full border border-dashed border-blue-300 bg-white px-3 py-0.5 text-xs text-blue-600 shadow-sm hover:bg-blue-50 dark:bg-gray-900 dark:hover:bg-blue-950/30"
                >
                    <Plus className="h-3 w-3" /> Sisipkan pertanyaan
                </button>
            </div>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function FormConfig({ configs }: Props) {
    const [fields, setFields] = useState<FieldConfig[]>(() =>
        configs.map((c) => ({
            ...c,
            field_type: 'radio' as FieldType,
            is_built_in: BUILT_IN.includes(c.field_key),
            is_dirty: false,
        }))
    );
    const [activeId, setActiveId] = useState<string | number | null>(
        fields[0]?.id ?? null
    );
    const [isSaving, setIsSaving] = useState(false);
    const [saveMsg, setSaveMsg] = useState('');

    const createNewField = (afterIndex: number): FieldConfig => ({
        id: null,
        field_key: uid(),
        field_label: '',
        field_type: 'radio',
        is_active: true,
        is_required: false,
        sort_order: afterIndex + 1,
        options: ['Opsi 1'],
        is_built_in: false,
        is_dirty: true,
    });

    const insertAfter = (index: number) => {
        const newField = createNewField(index);
        const updated = [...fields];
        updated.splice(index + 1, 0, newField);
        setFields(updated);
        setActiveId(newField.field_key);
    };

    const duplicateField = (index: number) => {
        const src = fields[index];
        const dup: FieldConfig = {
            ...src,
            id: null,
            field_key: uid(),
            field_label: src.field_label + ' (salinan)',
            is_built_in: false,
            is_dirty: true,
        };
        const updated = [...fields];
        updated.splice(index + 1, 0, dup);
        setFields(updated);
        setActiveId(dup.field_key);
    };

    const deleteField = (index: number) => {
        const updated = fields.filter((_, i) => i !== index);
        setFields(updated);
        setActiveId(updated[Math.min(index, updated.length - 1)]?.id ?? null);
    };

    const moveField = (index: number, dir: -1 | 1) => {
        const updated = [...fields];
        const target = index + dir;
        if (target < 0 || target >= updated.length) return;
        [updated[index], updated[target]] = [updated[target], updated[index]];
        setFields(updated);
    };

    const updateField = (index: number, updated: FieldConfig) => {
        const arr = [...fields];
        arr[index] = updated;
        setFields(arr);
    };

    // Save all to backend
    const handleSave = async () => {
        setIsSaving(true);
        setSaveMsg('');

        // Build payload: array of all fields with their current state
        const payload = fields.map((f, i) => ({
            id:          f.id,
            field_key:   f.field_key,
            field_label: f.field_label,
            is_active:   f.is_active,
            is_required: f.is_required,
            sort_order:  i,
            options:     f.options.filter((o) => o.trim() !== ''),
        }));

        router.post('/absensi/form-config/bulk-save', { fields: payload }, {
            onSuccess: () => {
                setSaveMsg('Tersimpan ✓');
                setTimeout(() => setSaveMsg(''), 3000);
                // Reload to get fresh IDs
                router.reload({ only: ['configs'] });
            },
            onError: () => setSaveMsg('Gagal menyimpan'),
            onFinish: () => setIsSaving(false),
        });
    };

    const dirtyCount = fields.filter((f) => f.is_dirty).length;

    return (
        <>
            <Head title="Pengaturan Form Absensi" />

            <div className="mx-auto max-w-2xl px-4 py-6">

                {/* Header */}
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold">Pengaturan Form Absensi</h1>
                        <p className="text-sm text-muted-foreground">
                            Klik pertanyaan untuk mengedit · Hover untuk menyisipkan
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => router.get('/absensi')}>
                            ← Kembali
                        </Button>
                        <Button
                            size="sm"
                            onClick={handleSave}
                            disabled={isSaving}
                            className={`gap-2 ${dirtyCount > 0 ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
                        >
                            {isSaving ? (
                                <span className="flex items-center gap-2">
                                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                    Menyimpan...
                                </span>
                            ) : saveMsg ? (
                                saveMsg
                            ) : (
                                <>Simpan{dirtyCount > 0 && <span className="rounded-full bg-white/20 px-1.5 text-xs">{dirtyCount}</span>}</>
                            )}
                        </Button>
                    </div>
                </div>

                {/* Form title card (non-editable) */}
                <div className="mb-4 overflow-hidden rounded-xl border-t-8 border-blue-600 bg-white p-6 shadow-sm dark:bg-gray-900">
                    <h2 className="text-2xl font-bold">Form Absensi Karyawan</h2>
                    <p className="mt-1 text-sm text-muted-foreground">Isi data absensi harian Anda dengan lengkap dan benar</p>
                    <div className="mt-3 border-t pt-3">
                        <p className="text-xs text-muted-foreground">
                            Field tetap (tidak bisa dihapus): <strong>Tanggal, Shift, Waktu Mulai, Nama, NRP, Jabatan, Mulai Tidur, Bangun Tidur</strong>
                        </p>
                    </div>
                </div>

                {/* Field cards */}
                <div className="space-y-1 pl-10">
                    {fields.map((field, index) => (
                        <FieldCard
                            key={field.id ?? field.field_key}
                            field={field}
                            index={index}
                            total={fields.length}
                            isActive={activeId === (field.id ?? field.field_key)}
                            onActivate={() => setActiveId(field.id ?? field.field_key)}
                            onChange={(updated) => updateField(index, updated)}
                            onDelete={() => deleteField(index)}
                            onDuplicate={() => duplicateField(index)}
                            onMoveUp={() => moveField(index, -1)}
                            onMoveDown={() => moveField(index, 1)}
                            onInsertAfter={() => insertAfter(index)}
                        />
                    ))}
                </div>

                {/* Add question at end */}
                <div className="mt-4 pl-10">
                    <button
                        type="button"
                        onClick={() => insertAfter(fields.length - 1)}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-muted-foreground/30 py-4 text-sm text-muted-foreground hover:border-blue-400 hover:text-blue-600 transition-colors"
                    >
                        <Plus className="h-4 w-4" />
                        Tambah pertanyaan
                    </button>
                </div>

                {/* Preview link */}
                <div className="mt-6 flex items-center justify-between rounded-xl border bg-muted/30 p-4 pl-10">
                    <p className="text-sm text-muted-foreground">Lihat hasil di form publik</p>
                    <Button variant="outline" size="sm" onClick={() => window.open('/absensi/form', '_blank')}>
                        Buka Form →
                    </Button>
                </div>

            </div>
        </>
    );
}

FormConfig.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Absensi', href: '/absensi' },
        { title: 'Pengaturan Form', href: '/absensi/form-config' },
    ],
};

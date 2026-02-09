import { useState, useEffect, useMemo } from 'react';
import type { EntitySchema, EntityPropertySchema, SchemaFilterType } from '@rayneforge/logic';
import type { FilterSection, FilterOption } from '../components/lens-panel/LensPanel';

export interface UseEntitySchemaOptions {
    /** Async function that returns an EntitySchema from the API. */
    fetcher: () => Promise<EntitySchema>;
}

export interface UseEntitySchemaResult {
    schema: EntitySchema | null;
    /** FilterSection[] ready to pass straight to <LensPanel>. */
    filters: FilterSection[];
    isLoading: boolean;
    error: string | null;
}

/**
 * Fetches an entity schema from the API, then maps every
 * filterable property into a `FilterSection` the `<LensPanel>`
 * can render directly.
 *
 * ```tsx
 * const { filters } = useEntitySchema({
 *     fetcher: () => client.getNewsSchema(),
 * });
 * <LensPanel filters={filters} />
 * ```
 */
export function useEntitySchema({ fetcher }: UseEntitySchemaOptions): UseEntitySchemaResult {
    const [schema, setSchema] = useState<EntitySchema | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        (async () => {
            try {
                const data = await fetcher();
                if (!cancelled) setSchema(data);
            } catch (err: any) {
                if (!cancelled) setError(err.message ?? 'Failed to load schema');
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        })();

        return () => { cancelled = true; };
        // fetcher identity may change — callers should memoize or use useCallback
    }, [fetcher]);

    const filters = useMemo(() => {
        if (!schema) return [];
        return schema.properties.map(propToFilter);
    }, [schema]);

    return { schema, filters, isLoading, error };
}

// ── Mapping helpers ──────────────────────────────────────────────

function propToFilter(prop: EntityPropertySchema): FilterSection {
    const type = mapFilterType(prop.filterType);
    const options = buildOptions(prop);

    return {
        title: prop.description ?? humanize(prop.name),
        type,
        options,
    };
}

function mapFilterType(ft: SchemaFilterType): FilterSection['type'] {
    switch (ft) {
        case 'toggle':
            return 'toggle';
        case 'dateRange':
        case 'range':
            return 'range';
        default:
            return 'checkbox';
    }
}

function buildOptions(prop: EntityPropertySchema): FilterOption[] {
    // Enum → one checkbox per value
    if (prop.enumValues && prop.enumValues.length > 0) {
        return prop.enumValues.map((v) => ({ label: v, active: false }));
    }
    // Toggle → single on/off option matching the property name
    if (prop.filterType === 'toggle') {
        return [{ label: humanize(prop.name), active: false }];
    }
    // Text / dateRange / range → no predefined options;
    // the LensPanel can render an input or range control.
    return [];
}

/** PascalCase / camelCase → "Sentence case" */
function humanize(name: string): string {
    return name
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/^./, (c) => c.toUpperCase());
}

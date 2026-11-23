import { vi } from "vitest";
import type { QueryBuilderDraft, QueryBuilderType } from "../src/primitives/QueryBuilder/QueryBuilder.types";
import { DEFAULT_OPERATORS, newQueryCondition } from "../src/primitives/QueryBuilder/queryBuilder.utils";
import type {
    QueryBuilderContextValue,
    QueryBuilderSavedContextValue,
} from "../src/primitives/QueryBuilder/QueryBuilder.context";

const queryTypes: QueryBuilderType[] = [
    { key: "Camera", label: "Camera", count: 3, properties: ["status", "temperature"] },
    { key: "Sensor", label: "Sensor", count: 2, properties: ["humidity"] },
];

export function queryDraft(overrides: Partial<QueryBuilderDraft> = {}): QueryBuilderDraft {
    return {
        typeKeys: ["Camera"],
        mode: "builder",
        conditions: [newQueryCondition({ property: "temperature", value: "25" })],
        text: "",
        geo: null,
        ...overrides,
    };
}

export function fakeSavedQueries(
    overrides: Partial<QueryBuilderSavedContextValue> = {},
): QueryBuilderSavedContextValue {
    return {
        items: [
            {
                id: "q1",
                name: "Hot cameras",
                createdAt: "2026-11-01T10:00:00Z",
                description: "Camera · temperature>25",
            },
            { id: "q2", name: "Dry sensors", createdAt: "2026-11-02T10:00:00Z" },
        ],
        loadedId: null,
        load: vi.fn(),
        runSaved: vi.fn(),
        save: vi.fn(),
        update: vi.fn(),
        remove: vi.fn(),
        ...overrides,
    };
}

export function fakeQueryBuilderContext(overrides: Partial<QueryBuilderContextValue> = {}): QueryBuilderContextValue {
    return {
        draft: queryDraft(),
        setDraft: vi.fn(),
        types: queryTypes,
        typesLoading: false,
        preview: "type=Camera&q=temperature>25",
        busy: false,
        run: vi.fn(),
        reset: vi.fn(),
        operators: DEFAULT_OPERATORS,
        presets: [
            { label: "Delft", lat: 52.01, lon: 4.36, radiusKm: 2 },
            { label: "The Hague", lat: 52.08, lon: 4.31, radiusKm: 5 },
        ],
        ...overrides,
    };
}
